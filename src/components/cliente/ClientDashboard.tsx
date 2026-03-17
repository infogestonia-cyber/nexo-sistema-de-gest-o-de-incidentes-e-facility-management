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
import { Badge } from '../ui/badge';

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
    <div className="flex-1 overflow-y-auto px-4 py-8 space-y-8 pb-32 no-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black text-emerald-500/50 uppercase tracking-[0.2em] mb-1">Painel do Imóvel</p>
          <h2 className="text-2xl font-black text-white tracking-tight">Olá, {cliente?.nome?.split(' ')[0]}</h2>
          <div className="flex items-center gap-2 mt-1.5">
            <Badge variant="outline" className="text-[9px] font-black bg-emerald-500/10 text-emerald-500 border-none px-2 py-0.5 uppercase tracking-tighter">
              {cliente?.contrato}
            </Badge>
          </div>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center relative overflow-hidden group">
           <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
           <LayoutDashboard size={20} className="text-gray-400 group-hover:text-emerald-400 transition-colors relative z-10" />
        </div>
      </div>

      {/* Alert badge */}
      {data?.pendentesValidacao > 0 && (
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => onNavigate('ordens')}
          className="w-full flex items-center gap-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-left relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0 border border-amber-500/30 group-hover:scale-110 transition-transform">
            <AlertTriangle size={18} className="text-amber-400" />
          </div>
          <div className="flex-1 relative z-10">
            <p className="text-xs font-black text-amber-400 uppercase tracking-tight">{data.pendentesValidacao} Validações Pendentes</p>
            <p className="text-[10px] text-amber-400/60 mt-0.5 font-bold uppercase tracking-wider">A sua aprovação é necessária para fechar o ciclo</p>
          </div>
          <ArrowRight size={16} className="text-amber-400/40 group-hover:translate-x-1 transition-transform" />
        </motion.button>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-4">
        <KpiCard icon={<Clock size={20} />} label="Em Aberto" value={data?.abertas || 0} color="text-blue-400" bg="bg-blue-500/10 border-blue-500/20" />
        <KpiCard icon={<CheckCircle2 size={20} />} label="Resolvidos" value={data?.concluidas || 0} color="text-emerald-400" bg="bg-emerald-500/10 border-emerald-500/20" />
        <KpiCard icon={<DollarSign size={20} />} label="Investimento" value={`${data?.totalGasto || 0} MT`} color="text-purple-400" bg="bg-purple-500/10 border-purple-500/20" />
        <KpiCard icon={<TrendingUp size={20} />} label="Budget" value={`${cliente?.orcamento_mensal || 0} MT`} color="text-gray-400" bg="bg-white/5 border-white/10" />
      </div>

      {/* Spending chart */}
      <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 card-shine relative overflow-hidden">
        <div className="flex items-center justify-between mb-6">
           <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Fluxo Financeiro</p>
              <h3 className="text-sm font-bold text-white mt-1">Histórico de Manutenção</h3>
           </div>
           <div className="p-2 bg-emerald-500/10 rounded-lg">
              <TrendingUp size={14} className="text-emerald-500" />
           </div>
        </div>
        <div className="flex items-end justify-between gap-3 h-32 pt-2">
          {(data?.gastosMensais || []).map((val: number, i: number) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-3 group" style={{ height: '100%' }}>
              <div className="flex-1 flex items-end w-full relative">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max((val / maxGasto) * 100, 8)}%` }}
                  transition={{ delay: i * 0.1, type: "spring", stiffness: 100 }}
                  className={`w-full rounded-t-lg relative ${i === (data.gastosMensais.length - 1) ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-white/10 group-hover:bg-white/20 transition-colors'}`}
                >
                   {i === (data.gastosMensais.length - 1) && (
                     <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded shadow-xl">
                        {val}
                     </div>
                   )}
                </motion.div>
              </div>
              <span className="text-[9px] text-gray-600 font-bold uppercase tracking-tighter">{data?.meses?.[i]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Last orders */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Linha de Tempo</p>
            <h3 className="text-sm font-bold text-white mt-1">Intervenções Recentes</h3>
          </div>
          <button onClick={() => onNavigate('ordens')} className="h-8 px-3 rounded-full bg-white/5 border border-white/10 text-[9px] text-emerald-500 font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-500 hover:text-black transition-all">
            Ver Tudo <ArrowRight size={12} />
          </button>
        </div>
        <div className="space-y-3">
          {(data?.ultimasOrdens || []).map((os: any, idx: number) => (
            <motion.div 
              key={os.id} 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ delay: idx * 0.05 }}
              className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl group hover:bg-white/[0.04] transition-all cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-emerald-500/30 transition-colors">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white font-bold truncate group-hover:text-emerald-400 transition-colors leading-none mb-1.5">{os.descricao}</p>
                <div className="flex items-center gap-2">
                   <p className="text-[9px] text-gray-600 font-bold uppercase tracking-wider">{format(new Date(os.data_abertura), 'dd MMM yyyy', { locale: ptBR })}</p>
                   <span className="text-gray-800 text-[10px]">/</span>
                   <p className="text-[9px] text-gray-500 font-mono">#{os.id.split('-')[0].toUpperCase()}</p>
                </div>
              </div>
              <Badge variant="outline" className={`text-[8px] font-black px-2 py-0.5 rounded border-none flex-shrink-0 uppercase tracking-tighter ${STATUS_COLORS[os.estado] || 'bg-gray-500/20 text-gray-400'}`}>
                {os.estado}
              </Badge>
            </motion.div>
          ))}
          {(!data?.ultimasOrdens || data.ultimasOrdens.length === 0) && (
            <div className="py-12 text-center border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
               <Clock size={24} className="text-gray-800 mx-auto mb-3" />
               <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Sem registos recentes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, color, bg }: any) {
  return (
    <div className={`p-5 border rounded-3xl card-shine group relative overflow-hidden ${bg} transition-all hover:scale-[1.02]`}>
      <div className={`mb-4 w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 border border-white/5 group-hover:scale-110 transition-transform ${color}`}>
        {icon}
      </div>
      <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.15em]">{label}</p>
      <p className="text-xl font-black text-white mt-1 tracking-tight">{value}</p>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
         <ArrowRight size={14} className="text-gray-700" />
      </div>
    </div>
  );
}


