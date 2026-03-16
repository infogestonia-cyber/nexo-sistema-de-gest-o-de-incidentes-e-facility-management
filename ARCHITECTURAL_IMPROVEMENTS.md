# Melhorias Arquitetônicas Recomendadas

## 1. Integração Automação + Planos de Manutenção

### Situação Atual (Problema)
O sistema tem 2 módulos separados e funcionalmente duplicados:
- **"Automação"** (`/automation`) - Define agendamentos automáticos de manutenção
- **"Planos de Manutenção"** (`/maintenance`) - Cria planos manuais de manutenção

**Por que isso é problema:**
1. Duplicação de funcionalidade
2. Confusão do utilizador: qual usar?
3. Falta de integração: automação não cria planos automaticamente
4. Dados separados: agendamentos não geram histórico de conclusões

### Solução Recomendada: Módulo Unificado "Maintenance Management"

Integrar numa **única interface profissional** com 3 sub-seções:

```
┌─────────────────────────────────────────┐
│  GESTÃO DE MANUTENÇÃO (Unified)         │
├─────────────────────────────────────────┤
│                                         │
│  1. AGENDAMENTOS (Automation)          │  ← Define as regras
│     - Manutenção por calendário        │
│     - Manutenção por uso/limites       │
│     - Triggers: horas, ciclos, etc.    │
│                                         │
│  2. PLANOS ATIVOS (Plans)              │  ← Gerados (manual + auto)
│     - Criados manualmente              │
│     - Gerados por agendamentos         │
│     - Status: Agendado/Em execução     │
│                                         │
│  3. HISTÓRICO (History)                │  ← Execuções conclusões
│     - Planos concluídos                │
│     - Data conclusão                   │
│     - Observations                     │
│     - Custos reais vs estimado         │
│                                         │
└─────────────────────────────────────────┘
```

### Arquitetura de Banco de Dados Melhorada

```sql
-- Tabela única de agendamentos
CREATE TABLE maintenance_schedules (
  id UUID PRIMARY KEY,
  asset_id UUID REFERENCES assets,
  name VARCHAR,
  description TEXT,
  
  -- Tipo de trigger
  trigger_type ENUM('calendar', 'usage_threshold', 'meter_reading'),
  
  -- Para trigger calendar
  frequency_days INTEGER,
  last_execution_date TIMESTAMP,
  next_execution_date TIMESTAMP,
  
  -- Para trigger usage/meter
  threshold_value NUMERIC,
  
  -- Metadados
  categoria VARCHAR,
  estimated_cost NUMERIC,
  created_by UUID REFERENCES profiles,
  created_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- Tabela de execuções/planos
CREATE TABLE maintenance_executions (
  id UUID PRIMARY KEY,
  schedule_id UUID REFERENCES maintenance_schedules,
  
  asset_id UUID REFERENCES assets,
  assigned_to UUID REFERENCES profiles,
  
  status ENUM('scheduled', 'in_progress', 'completed', 'cancelled'),
  
  scheduled_date TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  estimated_cost NUMERIC,
  actual_cost NUMERIC,
  
  observations TEXT,
  created_by UUID REFERENCES profiles,
  created_at TIMESTAMP
);

-- Tabela de histórico  
CREATE TABLE maintenance_history (
  id UUID PRIMARY KEY,
  execution_id UUID REFERENCES maintenance_executions,
  
  action VARCHAR,
  notes TEXT,
  performed_by UUID REFERENCES profiles,
  performed_at TIMESTAMP,
  
  FOREIGN KEY (execution_id) REFERENCES maintenance_executions
);
```

### Fluxo de Execução Profissional

```
1. AGENDAR (Admin/Gestor)
   └─ Define agendamento com regras
      └─ Sistema monitora automaticamente

2. GATILHO (Backend - Daemon Job)
   └─ A cada hora, verifica agendamentos
   └─ Se critério atendido (dias passados, limite atingido)
      └─ Cria automaticamente execution (plano)
      └─ Notifica responsável
      └─ Adiciona ao dashboard

3. EXECUTAR (Técnico)
   └─ Vê plano ativo no dashboard
   └─ Inicia ("In Progress")
   └─ Registra tempos, observações
   └─ Marca como "Completed" + timestamp

4. AUDITAR (Gestor)
   └─ Vê histórico completo
   └─ Compara custo estimado vs real
   └─ Analisa tempos de execução
```

### Implementação Step-by-Step

#### Fase 1: Backend Setup
```typescript
// server.ts

// 1. Converter tabela maintenance_plans para maintenance_executions
// 2. Criar tabela maintenance_schedules
// 3. Criar job que roda a cada hora:

const maintenanceScheduler = setInterval(async () => {
  try {
    const { data: schedules } = await supabase
      .from('maintenance_schedules')
      .select('*')
      .eq('is_active', true);

    for (const schedule of schedules || []) {
      if (schedule.trigger_type === 'calendar') {
        const lastExec = new Date(schedule.last_execution_date);
        const daysPassed = Math.floor((Date.now() - lastExec.getTime()) / (1000*60*60*24));
        
        if (daysPassed >= schedule.frequency_days) {
          // Criar execution automaticamente
          await supabase.from('maintenance_executions').insert([{
            schedule_id: schedule.id,
            asset_id: schedule.asset_id,
            status: 'scheduled',
            scheduled_date: new Date().toISOString(),
            estimated_cost: schedule.estimated_cost
          }]);
          
          // Atualizar próxima data
          await supabase.from('maintenance_schedules')
            .update({ 
              last_execution_date: new Date().toISOString(),
              next_execution_date: new Date(Date.now() + schedule.frequency_days*24*60*60*1000)
            })
            .eq('id', schedule.id);
            
          // Notificar responsável
          logToFile("INFO", "Plano de manutenção auto-gerado", { schedule_id: schedule.id });
        }
      }
    }
  } catch (error) {
    logToFile("ERROR", "Erro no scheduler de manutenção", { error });
  }
}, 3600000); // Uma vez por hora
```

#### Fase 2: UI Unification
```typescript
// src/components/MaintenanceManager.tsx (substituir Automation + Maintenance)

export default function MaintenanceManager() {
  const [activeTab, setActiveTab] = useState<'schedules' | 'active' | 'history'>('active');
  
  return (
    <div>
      <Tabs activeTab={activeTab} onChange={setActiveTab}>
        <Tab id="schedules" label="📅 Agendamentos">
          {/* Renderizar lista de schedules com opções criar/editar/ativar-desativar */}
          {/* Mostrar quando a próxima manutenção será gerada */}
        </Tab>
        
        <Tab id="active" label="🔧 Planos Ativos">
          {/* Renderizar executions com status "scheduled" ou "in_progress" */}
          {/* Botões: iniciar, concluir, cancelar */}
          {/* Mostrar tempo decorrido se em progresso */}
        </Tab>
        
        <Tab id="history" label="✓ Histórico Completo">
          {/* Renderizar executions concluídas */}
          {/* Análise: tempo real vs estimado, custo real vs estimado */}
          {/* Gráficos de tendências */}
        </Tab>
      </Tabs>
    </div>
  );
}
```

### Benefícios da Integração

| Benefício | Atual | Integrado |
|-----------|-------|-----------|
| **Clareza** | 2 módulos confusos | 1 interface clara |
| **Automação** | Agendamentos criados manualmente | Auto-geração de planos |
| **Auditoria** | Sem histórico | Histórico completo |
| **Análise** | Impossível comparar estimado vs real | Dados centralizados |
| **Escalabilidade** | Difícil expandir com novos tipos | Estrutura extensível |
| **Profissionalismo** | Meio improvisado | Enterprise-grade |

---

## 2. Fixes Implementados (Hoje)

### ✅ POST /api/pm/schedules (Automação)
- ✓ Adicionada validação de asset_id
- ✓ Adicionado logging detalhado
- ✓ Adicionado error handling profissional
- ✓ UI feedback com alerts

### ✅ PATCH /api/maintenance-plans/:id/complete
- ✓ Fallback para múltiplos nomes de coluna (estado/status)
- ✓ Verificação de existência do plano (404)
- ✓ Logging com timestamp de conclusão
- ✓ Retry logic para schema compatibilidade

### ✅ UI Melhorada
- ✓ Maintenance: Feedback visual ao concluir
- ✓ Automation: Validação antes de enviar
- ✓ Error messages específicas e úteis

---

## 3. Próximos Passos Recomendados

### Curto Prazo (Esta semana)
1. ✅ Corrigir bugs de automação + conclusão (FEITO)
2. Adicionar testes de automação end-to-end
3. Documentar triggers e workflow

### Médio Prazo (Este mês)
1. Refactorizar estrutura de BD conforme recomendação
2. Implementar scheduler backend
3. Consolidar UI em um módulo

### Longo Prazo
1. Adicionar análise preditiva (ML para prever falhas)
2. Integração com IoT sensors para monitoramento real-time
3. Mobile app para execução de planos no terreno

---

## 4. Logs de Implementação

Todos os endpoints agora registram:
```log
[2026-03-16T21:20:00.123Z] [INFO] Agendamento de automação criado com sucesso {"id":"...","asset_id":"...","frequency_days":30,"user_id":"..."}
[2026-03-16T21:20:15.456Z] [INFO] Plano de manutenção concluído com sucesso {"id":"...","user_id":"...","completion_time":"2026-03-16T21:20:15.123Z"}
```

---

## Conclusão

**Situação:**
- Automação e Maintenance funcionam, mas estão desintegrados
- Estrutura atual é funcional mas não profissional

**Recomendação:**
- Integrar num único módulo "Maintenance Management"
- Implementar scheduler backend para auto-geração
- Melhorar auditoria e análise com histórico centralizado

**Esforço Estimado:**
- Fase 1 (Backend): 8-12 horas
- Fase 2 (UI): 8-10 horas
- Fase 3 (Testes): 4-6 horas
- **Total: ~2-3 dias de trabalho**

