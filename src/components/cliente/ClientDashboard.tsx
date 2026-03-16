import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  LayoutDashboard, TrendingUp, CheckCircle2,
  Clock, AlertTriangle, ArrowRight, DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { api } from '../../services/api';
import { logError } from '../../utils/remoteLogger';

const STATUS_COLORS: Record<string, string> = {
  'Aberto': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Atribuído': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Em progresso': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Em validação': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Resolvido': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  'Fechado': 'bg-gray-600/20 text-gray-500 border-gray-600/30',
};

export default function ClientDashboard({ cliente, onNavigate }: any) {
  const [data, setData] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardData, propsData] = await Promise.all([
          api.get('/api/cliente/dashboard'),
          api.get('/api/cliente/properties')
        ]);
        setData(dashboardData);
        setProperties(propsData);
      } catch (err: any) {
        logError('Erro no ClientDashboard', err);
        setData({});
        setProperties([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-none animate-spin" />
    </div>
  );

  if (properties.length === 0) return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-24 h-24 bg-amber-500/20 rounded-none flex items-center justify-center mx-auto mb-6 border border-amber-500/30">
        <AlertTriangle size={48} className="text-amber-500" />
      </motion.div>
      <h3 className="text-2xl font-black text-white">Acesso Pendente</h3>
      <p className="text-gray-400 text-sm mt-2 leading-relaxed">A sua conta ainda não foi associada a uma propriedade. Contacte o administrador do sistema para ativar o seu acesso.</p>
    </div>
  );

  const maxGasto = Math.max(...(data?.gastosMensais || [1]));

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 pb-28">
      {/* Header */}
      <div>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Bem-vindo de volta</p>
        <h2 className="text-2xl font-black text-white mt-1">{cliente?.nome}</h2>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[9px] font-bold uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-none">{cliente?.contrato}</span>
        </div>
      </div>

      {/* Alert badge */}
      {data?.pendentesValidacao > 0 && (
        <motion.button
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => onNavigate('ordens')}
          className="w-full flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-none text-left"
        >
          <div className="w-9 h-9 rounded-none bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={16} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-amber-400">{data.pendentesValidacao} OS Pendentes de Validação</p>
            <p className="text-[9px] text-amber-400/60 mt-0.5">A sua aprovação é necessária</p>
          </div>
          <ArrowRight size={14} className="text-amber-400/60" />
        </motion.button>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard icon={<Clock size={18} />} label="Abertas" value={data?.abertas || 0} color="text-blue-400" bg="bg-blue-500/10 border-blue-500/20" />
        <KpiCard icon={<CheckCircle2 size={18} />} label="Concluídas" value={data?.concluidas || 0} color="text-emerald-400" bg="bg-emerald-500/10 border-emerald-500/20" />
        <KpiCard icon={<DollarSign size={18} />} label="Gastos Totais" value={`${data?.totalGasto || 0} MT`} color="text-purple-400" bg="bg-purple-500/10 border-purple-500/20" />
        <KpiCard icon={<TrendingUp size={18} />} label="Orçamento" value={`${cliente?.orcamento_mensal || 0} MT`} color="text-gray-400" bg="bg-white/5 border-white/10" />
      </div>

      {/* Spending chart */}
      <div className="bg-white/[0.03] border border-white/8 rounded-none p-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Gastos — Últimos 6 Meses</p>
        <div className="flex items-end justify-between gap-1.5 h-24">
          {(data?.gastosMensais || []).map((val: number, i: number) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1" style={{ height: '100%' }}>
              <div className="flex-1 flex items-end w-full">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max((val / maxGasto) * 100, 4)}%` }}
                  transition={{ delay: i * 0.06 }}
                  className={`w-full rounded-none ${i === (data.gastosMensais.length - 1) ? 'bg-emerald-500' : 'bg-white/10'}`}
                />
              </div>
              <span className="text-[8px] text-gray-600 font-bold">{data?.meses?.[i]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Last orders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Últimas Ordens</p>
          <button onClick={() => onNavigate('ordens')} className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider flex items-center gap-1">Ver todas <ArrowRight size={10} /></button>
        </div>
        <div className="space-y-2">
          {(data?.ultimasOrdens || []).map((os: any) => (
            <motion.div key={os.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/6 rounded-none">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white font-medium truncate">{os.descricao}</p>
                <p className="text-[9px] text-gray-600 mt-0.5">{format(new Date(os.data_abertura), 'dd MMM', { locale: ptBR })}</p>
              </div>
              <span className={`text-[8px] font-bold px-2 py-0.5 rounded-none border flex-shrink-0 ${STATUS_COLORS[os.estado] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
                {os.estado}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, color, bg }: any) {
  return (
    <div className={`p-4 border rounded-none ${bg}`}>
      <div className={`mb-2 ${color}`}>{icon}</div>
      <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{label}</p>
      <p className="text-xl font-black text-white mt-0.5">{value}</p>
    </div>
  );
}


