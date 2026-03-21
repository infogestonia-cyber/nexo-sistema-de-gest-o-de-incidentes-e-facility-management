import React, { useState } from 'react';
import { FileText, Download, BarChart2, PieChart, Calendar, Cpu, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';
import { RefreshButton } from './ui/RefreshButton';
import { Button } from './ui/button';

export default function Reports() {
  const [loading, setLoading] = useState(false);
  const token = (sessionStorage.getItem('token') || localStorage.getItem('token'));

  const exportToExcel = (data: any[], fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório");
    XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const generateReport = async (type: string) => {
    setLoading(true);
    try {
      let endpoint = '';
      let fileName = '';

      switch (type) {
        case 'incidents':
          endpoint = '/api/incidents';
          fileName = 'Relatorio_Incidentes';
          break;
        case 'assets':
          endpoint = '/api/assets';
          fileName = 'Inventario_Ativos';
          break;
        case 'maintenance':
          endpoint = '/api/maintenance-plans';
          fileName = 'Plano_Manutencao';
          break;
        case 'planning':
          endpoint = '/api/planning-5y';
          fileName = 'Roteiro_Estrategico';
          break;
      }

      const res = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Falha ao descarregar dados');
      const data = await res.json();
      exportToExcel(Array.isArray(data) ? data : [], fileName);
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      alert('Erro ao gerar o relatório. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const reportCards = [
    {
      id: 'incidents',
      title: 'Histórico de Incidentes',
      description: 'Lista completa de ocorrências, severidade, tempos de resposta e resolução SLA.',
      icon: AlertTriangle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10'
    },
    {
      id: 'assets',
      title: 'Inventário de Ativos',
      description: 'Detalhes técnicos de todos os equipamentos, localização, estado e probabilidade de falha.',
      icon: Cpu,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      id: 'maintenance',
      title: 'Plano de Manutenção',
      description: 'Cronograma de intervenções preventivas, periodicidade e custos estimados.',
      icon: Calendar,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10'
    },
    {
      id: 'planning',
      title: 'Roteiro Estratégico 5Y',
      description: 'Planeamento de longo prazo, investimentos Capex/Opex e metas trimestrais.',
      icon: BarChart2,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    }
  ];

  return (
    <div className="space-y-8 page-enter">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold text-white tracking-tight">Centro de Relatórios</h2>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">Extração de dados operacionais para análise estratégica (Excel)</p>
        </div>
        <RefreshButton 
          onClick={() => {
            setLoading(true);
            setTimeout(() => setLoading(false), 800);
          }} 
          loading={loading} 
          label="Sincronizar" 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportCards.map((report) => (
          <motion.div
            key={report.id}
            whileHover={{ y: -4 }}
            className="bg-brand-surface p-6 rounded-none border border-brand-border flex flex-col gap-6 group transition-all hover:border-emerald-500/30"
          >
            <div className="flex items-start justify-between">
              <div className={`p-4 rounded-none ${report.bgColor} ${report.color}`}>
                <report.icon size={24} />
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-none border border-white/5">
                <CheckCircle2 size={10} className="text-emerald-500" />
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Pronto para Extração</span>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-bold text-white tracking-tight">{report.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{report.description}</p>
            </div>

            <button
              onClick={() => generateReport(report.id)}
              disabled={loading}
              className="mt-auto w-full py-3 bg-white/5 hover:bg-emerald-500 hover:text-white border border-white/10 hover:border-emerald-500 rounded-none text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-none animate-spin" />
              ) : (
                <Download size={14} />
              )}
              Exportar para Excel (.xlsx)
            </button>
          </motion.div>
        ))}
      </div>

      <div className="bg-brand-surface border border-brand-border p-6 rounded-none flex items-center gap-6">
        <div className="w-12 h-12 rounded-none bg-white/5 flex items-center justify-center text-gray-500 shrink-0">
          <FileText size={24} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-white">Centro de Exportação Nexo</h4>
          <p className="text-xs text-gray-500 mt-1">Todos os dados exportados seguem os padrões de auditoria ISO 41001 para a gestão de infraestruturas.</p>
        </div>
      </div>
    </div>
  );
}

