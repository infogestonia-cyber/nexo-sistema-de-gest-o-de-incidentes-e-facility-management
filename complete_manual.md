# Nexo SGFM — Manual Completo do Sistema

> **Versão 2.5.0** | Sistema de Gestão de Facility Management  
> Nexo · Gestão de Incidentes, Ativos e Manutenção

---

## 1. Introdução

O **Nexo SGFM** é uma plataforma digital para gestão de instalações e ativos físicos. Permite:

- Monitorizar o estado de **propriedades** e **equipamentos**
- Registar e resolver **incidentes** com controlo de SLA
- Planificar e executar **manutenção preventiva e correctiva**
- Realizar **inspecções manuais** de ativos
- Produzir **relatórios** baseados em dados reais
- Gerir **utilizadores** com controlo de acesso por perfil

---

## 2. Acesso ao Sistema

### Login
1. Aceda ao endereço do sistema no browser
2. Introduza o seu **email** e **palavra-passe**
3. Clique **Entrar no Sistema**

> Se não tiver credenciais, contacte o Administrador do sistema para criar uma conta.

### Sessão
- A sessão mantém-se activa enquanto o browser estiver aberto
- Para sair, clique em **Terminar Sessão** no canto inferior esquerdo do menu

---

## 3. Navegação

O menu lateral apresenta as secções disponíveis conforme o seu perfil de acesso:

| Ícone | Secção | Descrição |
|:---:|---|---|
| ◫ | Centro de Comando | Dashboard com KPIs em tempo real |
| 🏢 | Propriedades | Imóveis e instalações físicas |
| ⚠️ | Incidentes | Registo e gestão de avarias/problemas |
| 💻 | Ativos & Inspecções | Equipamentos e inspecções manuais |
| 🔧 | Manutenção | Planos de manutenção preventiva/correctiva |
| 📅 | Roteiro Estratégico | Planeamento a 5 anos |
| 📄 | Relatórios | Análise e exportação de dados |
| 👥 | Utilizadores | Gestão de acessos |

---

## 4. Centro de Comando (Dashboard)

O dashboard apresenta os **KPIs principais em tempo real**:

### KPIs Apresentados
| Indicador | O que mede |
|-----------|-----------|
| Total de Incidentes | Número de incidentes registados |
| Total de Ativos | Número de equipamentos registados |
| Ativos Críticos | Ativos com probabilidade de falha "Alta" |
| Taxa de SLA | % de incidentes resolvidos dentro do prazo |
| Incidentes por Estado | Distribuição: Aberto / Em progresso / Resolvido |
| Incidentes por Severidade | Distribuição: Crítico / Alto / Médio / Baixo |
| Incidentes Recentes | Últimos 5 incidentes registados |

---

## 5. Propriedades

Uma **Propriedade** é um imóvel ou instalação física (ex: edifício, escritório, armazém).

### Como registar uma propriedade
1. Menu → **Propriedades**
2. Clique **Registar Propriedade**
3. Código Interno: identificador único (ex: PROP-001)
4. Endereço: nome/localização completa do imóvel
5. Inquilino: nome da empresa ou pessoa que ocupa o espaço
6. Referência Interna: número de contrato ou referência administrativa
7. Clique **Registar Propriedade**

### Ver ativos de uma propriedade
1. Na lista de propriedades, clique em qualquer cartão de propriedade
2. Verá um resumo: total de ativos, risco alto/médio/baixo
3. Abaixo, a lista completa de ativos dessa propriedade

---

## 6. Ativos & Inspecções

Um **Ativo** é um equipamento ou elemento físico dentro de uma propriedade (ex: ar condicionado, elevador, gerador, caldeira).

### Estrutura Propriedade → Ativo
```
Propriedade: Edifício Central Maputo
  └── Ativo: Ar Condicionado Piso 3 (Equipamento)
  └── Ativo: Elevador Principal (Equipamento)
  └── Ativo: Quadro Eléctrico Geral (Infraestrutura)
```

### Registar um Ativo
1. Menu → **Ativos & Inspecções**
2. Clique **Registar Ativo**
3. Seleccione a **Propriedade** a que pertence
4. Preencha: Nome, Categoria, Localização (ex: "Piso 2, Sala de Servidores")
5. Data de Instalação e Probabilidade de Falha
6. Clique **Registar Ativo**

### Realizar uma Inspecção Manual
1. Clique em qualquer ativo para abrir o seu detalhe
2. Clique **+ Nova Inspecção**
3. Preencha o formulário de inspecção:

   **Condição Geral** — avaliação global do ativo:
   - 🟢 Excelente — a funcionar na perfeição
   - 🟢 Bom — a funcionar sem problemas
   - 🟡 Razoável — com pequenas anomalias
   - 🟠 Mau — com problemas que requerem atenção
   - 🔴 Crítico — risco de falha iminente

   **Componentes Verificados** — marque o que verificou:
   - Estrutura Física, Conexões Eléctricas, Limpeza, Segurança, Funcionamento Geral

   **Anomalias Detectadas** — tipo de problema encontrado:
   - Visual, Funcional, Ruído Anormal, Vibração, Vazamento, Corrosão, Sobreaquecimento

   **Acções Imediatas** — o que foi feito no local

   **Requer Manutenção** — marque se precisar de agendar manutenção

4. Clique **Submeter Inspecção**
5. A inspecção fica registada no historial do ativo

---

## 7. Incidentes

Um **Incidente** é qualquer problema operacional que requer intervenção.

### Reportar um Incidente
1. Menu → **Incidentes**
2. Clique **Reportar Incidente**
3. Seleccione a **Propriedade** onde ocorreu o problema
4. Seleccione o **Ativo** afectado (opcional)
5. Escolha a **Categoria**:
   - Canalização · Electricidade · AVAC · Elevadores · Segurança · Estrutura · Limpeza · Outros
6. Escolha a **Severidade**
7. Escreva uma **Descrição** detalhada do problema
8. Atribua a um **Responsável** (técnico que irá resolver)
9. Clique **Submeter Protocolo**

> ⚡ O sistema calcula automaticamente as deadlines de SLA com base na severidade.

### Ciclo de Vida de um Incidente
```
[Aberto] → [Em progresso] → [Resolvido] → [Fechado]
```

Para avançar o estado:
1. Clique no incidente para ver os detalhes
2. Escreva a acção tomada na caixa de texto
3. Seleccione o novo estado
4. Clique **Registar Acção**

---

## 8. Cenários de SLA Detalhados

O SLA (Service Level Agreement) define os prazos máximos para resposta e resolução de incidentes.

### Prazos por Severidade

| Severidade | Prazo de Resposta | Prazo de Resolução | Exemplos |
|:---:|:---:|:---:|---|
| 🔴 **Crítico** | **1 hora** | **4 horas** | Corte de electricidade, inundação, sistema de segurança comprometido |
| 🟠 **Alto** | **4 horas** | **24 horas** | AC avariado no calor, elevador parado com pessoas, sem água |
| 🟡 **Médio** | **24 horas** | **72 horas** | Torneira a pingar, iluminação parcialmente avariada |
| 🟢 **Baixo** | **48 horas** | **168 horas** | Pintura danificada, sinalização em falta, problemas estéticos |

### Exemplos de Cálculo

#### Cenário 1 — Incidente Crítico
```
Reportado: Segunda-feira, 09:00
Severidade: Crítico

SLA Resposta:   09:00 + 1h  = 10:00 (Senhor técnico deve responder até 10:00)
SLA Resolução:  09:00 + 4h  = 13:00 (Problema deve estar resolvido até 13:00)

Se resolvido às 12:45 → ✅ SLA CUMPRIDO
Se resolvido às 14:00 → ❌ SLA VIOLADO
```

#### Cenário 2 — Incidente Alto
```
Reportado: Sexta-feira, 17:00
Severidade: Alto

SLA Resposta:   17:00 + 4h  = 21:00 (Resposta até às 21:00)
SLA Resolução:  17:00 + 24h = Segunda 17:00

Se resolvido na segunda às 15:00 → ✅ SLA CUMPRIDO
```

#### Cenário 3 — Incidente Médio
```
Reportado: Quarta-feira, 10:00
Severidade: Médio

SLA Resposta:   Quarta 10:00 + 24h = Quinta 10:00
SLA Resolução:  Quarta 10:00 + 72h = Sábado 10:00
```

### Taxa de Cumprimento de SLA
```
Taxa SLA (%) = (Nº incidentes resolvidos dentro do prazo / Total resolvidos) × 100

Exemplo:
- 47 incidentes resolvidos
- 43 dentro do prazo
- Taxa SLA = (43/47) × 100 = 91.5%
```

---

## 9. Manutenção

### Tipos de Manutenção
| Tipo | Descrição | Quando usar |
|------|-----------|-------------|
| **Preventiva** | Manutenção agendada para prevenir falhas | AC, elevadores, geradores — revisões periódicas |
| **Correctiva** | Reparação após falha ocorrer | Quando o equipamento já avariou |

### Criar um Plano de Manutenção
1. Menu → **Manutenção**
2. Clique **+ Novo Plano**
3. Seleccione o **Ativo** a manter
4. Tipo: Preventiva ou Correctiva
5. **Frequência**: Mensal / Trimestral / Semestral / Anual
6. **Próxima Execução**: data da próxima manutenção
7. **Responsável**: técnico ou empresa
8. **Orçamento Estimado** (em MZN)
9. **Descrição**: o que deve ser feito
10. Clique **Confirmar Plano**

### Gerir Planos Existentes — Menu ⋮
Clique nos 3 pontos em qualquer plano para:
- **Ver Detalhes** — informação completa do plano
- **Marcar Concluído** — regista a data de conclusão
- **Eliminar Plano** — remove permanentemente

---

## 10. Roteiro Estratégico

O roteiro apresenta o planeamento de investimentos a 5 anos (2026–2030).

- Organizado por **Ano** e **Trimestre**
- Mostra: descrição, categoria e orçamento estimado
- Estados: Planeado, Em progresso, Concluído

---

## 11. Relatórios — Cálculo dos Indicadores

### KPI: Taxa de SLA
```
Formula: (Incidentes resolvidos antes do limite ÷ Total de incidentes resolvidos) × 100
Fontes:  incidents.data_resolucao vs incidents.sla_resolucao_limite
Nota:    Só conta incidentes com estado "Resolvido" ou "Fechado"
```

### KPI: Tempo Médio de Resolução (MTTR)
```
Formula: Soma(data_resolucao - created_at) ÷ Número de incidentes resolvidos
Unidade: Horas
```

### KPI: Densidade de Incidentes por Propriedade
```
Formula: Nº incidentes por propriedade ÷ Total de incidentes × 100
Uso:     Identificar propriedades problemáticas
```

### KPI: Custo Total de Manutenção
```
Formula: Soma de maintenance_plans.custo_estimado
Filtros: Por período, por tipo, por propriedade
```

### KPI: Ativos em Risco
```
Formula: COUNT(assets WHERE probabilidade_falha = 'Alta')
Uso:     Priorizar inspecções e manutenções preventivas
```

### KPI: Taxa de Inspecção
```
Formula: Ativos com inspecção nos últimos 30 dias ÷ Total de ativos × 100
Uso:     Garantir cobertura de inspecção adequada
```

---

## 12. Gestão de Utilizadores

### Perfis e Acesso
- **Administrador**: acesso total, único que pode criar utilizadores
- **Gestor**: gestão operacional completa
- **Técnico**: execução em campo (incidentes + inspecções)
- **Visualizador**: leitura apenas

### Criar Utilizador
1. Menu → **Utilizadores**
2. Clique **Adicionar Utilizador**
3. Preencha: Nome, Email, Palavra-passe (mín. 6 caracteres), Perfil
4. O painel na interface mostra o que o perfil seleccionado pode fazer
5. Clique **Criar Utilizador**

---

## 13. Perguntas Frequentes

**P: Perdi a palavra-passe. O que faço?**
R: Contacte o Administrador do sistema. Ele pode criar uma nova conta ou redefinir o acesso.

**P: Criei um incidente por engano. Posso eliminar?**
R: Actualmente, o sistema não permite eliminar incidentes (para manter o histórico de auditoria). Mude o estado para "Fechado" e adicione uma nota a explicar o erro.

**P: Como sei se o SLA foi respeitado?**
R: No detalhe de cada incidente, verá as datas de SLA a vermelho (violado) ou verde (cumprido). No dashboard, a taxa de SLA global é apresentada.

**P: Posso filtrar ativos por propriedade?**
R: Sim. Na secção *Ativos & Inspecções*, existe um filtro por propriedade. Também pode clicar numa propriedade e ver directamente os seus ativos.

**P: As inspecções afectam o estado do ativo?**
R: A condição registada na última inspecção é apresentada no cartão do ativo. Se marcar "Requer Manutenção", isso serve de alerta para criar um plano de manutenção.

---

## 14. Suporte

Para questões técnicas ou de utilização, contacte a equipa de suporte Nexo.

> Sistema desenvolvido e mantido pela equipa Nexo.  
> Versão 2.5.0 — Fevereiro 2026
