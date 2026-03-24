import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Clock, AlertTriangle, ThumbsUp, X, MessageSquare, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { api } from '../../services/api';
import { Badge } from '../ui/badge';

const FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'Aberto', label: 'Pendentes' },
  { id: 'Em progresso', label: 'Em Curso' },
  { id: 'Resolvido', label: 'Concluídas' },
];

const SEVERITY_COLORS: Record<string, string> = {
  'Crítico': 'bg-red-500/20 text-red-400',
  'Alto': 'bg-orange-500/20 text-orange-400',
  'Médio': 'bg-amber-500/20 text-amber-400',
  'Baixa': 'bg-gray-500/20 text-gray-400',
};

const STATUS_ICON: Record<string, any> = {
  'Aberto': <Clock size={14} className="text-blue-400" />,
  'Em progresso': <div className="w-2 h-2 rounded-none bg-amber-400 animate-pulse" />,
  'Em validação': <AlertTriangle size={14} className="text-emerald-400" />,
  'Resolvido': <CheckCircle2 size={14} className="text-gray-400" />,
  'Fechado': <CheckCircle2 size={14} className="text-gray-600" />,
};

export default function ClientOrders() {
  const [ordens, setOrdens] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [observacao, setObservacao] = useState('');
  const [success, setSuccess] = useState(false);

  const fetchOrdens = async () => {
    setLoading(true);
    try {
      const url = activeFilter === 'all' ? '/api/cliente/ordens' : `/api/cliente/ordens?estado=${encodeURIComponent(activeFilter)}`;
      const data = await api.get(url);
      setOrdens(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Orders fetch error:', err);
      setOrdens([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrdens(); }, [activeFilter]);

  const handleValidar = async () => {
    if (!validatingId) return;
    try {
      await api.post(`/api/cliente/ordens/${validatingId}/validar`, { observacao });
      setSuccess(true);
      setTimeout(() => { setSuccess(false); setValidatingId(null); setObservacao(''); fetchOrdens(); }, 1800);
    } catch (err) {
      console.error('Falha ao validar ordem', err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 pb-32 space-y-8 no-scrollbar">
      <div className="flex items-center justify-between">
        <div>
           <p className="text-[10px] font-black text-emerald-500/50 uppercase tracking-[0.2em] mb-1">Gestão de Pedidos</p>
           <h2 className="text-2xl font-black text-white tracking-tight">Ordens de Serviço</h2>
        </div>
        <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
           <FileText size={20} className="text-gray-400" />
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={`flex-shrink-0 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${activeFilter === f.id
                ? 'bg-emerald-500 text-black border-emerald-500 shadow-lg shadow-emerald-500/20'
                : 'bg-white/5 text-gray-500 border-white/5 hover:bg-white/10 hover:text-gray-300'
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest animate-pulse">Sincronizando Ordens</p>
        </div>
      ) : (
        <div className="space-y-4">
          {ordens.map((os, i) => (
            <motion.div
              key={os.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group bg-white/[0.03] border border-white/5 rounded-3xl p-6 space-y-5 hover:bg-white/[0.05] transition-all card-shine relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
                 <FileText size={40} className="text-white" />
              </div>

              {/* Header */}
              <div className="flex items-start justify-between gap-4 relative z-10">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                     <span className="text-[10px] font-mono text-emerald-500/60 font-bold uppercase tracking-wider bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">#{os.id.slice(0, 8).toUpperCase()}</span>
                     <span className="text-gray-800 text-[10px]">/</span>
                     <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest truncate">{os.categoria}</p>
                  </div>
                  <p className="text-sm font-bold text-white leading-relaxed group-hover:text-emerald-400 transition-colors">{os.descricao}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 pt-1">
                  {STATUS_ICON[os.estado]}
                </div>
              </div>

              {/* Meta row */}
              <div className="flex items-center justify-between pt-4 border-t border-white/5 relative z-10">
                <div className="flex items-center gap-3">
                   <Badge variant="outline" className={`text-[8px] font-black px-2 py-0.5 rounded border-none shadow-sm ${SEVERITY_COLORS[os.severidade]} uppercase tracking-tighter`}>{os.severidade}</Badge>
                   <div className="flex items-center gap-1.5 text-gray-600">
                      <Clock size={12} />
                      <span className="text-[9px] font-bold uppercase tracking-wider">{format(new Date(os.data_abertura), 'dd MMM yyyy', { locale: ptBR })}</span>
                   </div>
                </div>
                {os.custo_estimado > 0 && (
                  <div className="text-right">
                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Investimento</p>
                    <p className="text-xs font-black text-emerald-400">{os.custo_estimado} MT</p>
                  </div>
                )}
              </div>

              {/* Technician Info (Subtle) */}
              {os.tecnico && (
                <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-2xl w-fit border border-white/5">
                   <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[8px] font-bold text-emerald-500">
                      {os.tecnico.charAt(0)}
                   </div>
                   <span className="text-[9px] font-bold text-gray-400">{os.tecnico}</span>
                </div>
              )}

              {/* Validate button */}
              {os.estado === 'Em validação' && !os.validado && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setValidatingId(os.id)}
                  className="w-full py-4 bg-emerald-500 text-black font-black text-xs uppercase tracking-[0.2em] rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20 active:translate-y-0.5 transition-all"
                >
                  <ThumbsUp size={16} /> Validar e Aprovar
                </motion.button>
              )}
              {os.validado && (
                <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-[10px] text-emerald-500 font-bold uppercase tracking-widest">
                  <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                     <CheckCircle2 size={12} className="text-black" />
                  </div>
                  Validado pelo Cliente
                </div>
              )}
            </motion.div>
          ))}
          {ordens.length === 0 && (
            <div className="text-center py-24 space-y-4">
               <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-6 opacity-20">
                  <CheckCircle2 size={40} className="text-gray-400" />
               </div>
               <p className="text-gray-600 text-xs font-black uppercase tracking-[0.2em]">Nenhuma ordem encontrada</p>
            </div>
          )}
        </div>
      )}

      {/* Validate Modal */}
      <AnimatePresence>
        {validatingId && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" onClick={() => setValidatingId(null)} />
            <motion.div
              initial={{ opacity: 0, y: 48 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 48 }}
              className="fixed bottom-0 left-0 right-0 bg-[#0f1929] border border-white/10 rounded-none p-6 z-50 space-y-4"
            >
              {success ? (
                <div className="text-center py-6">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-16 h-16 bg-emerald-500 rounded-none flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={32} className="text-black" />
                  </motion.div>
                  <p className="text-white font-black text-lg">Validado!</p>
                  <p className="text-gray-500 text-xs mt-1">Obrigado pela sua confirmação.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-black text-white">Confirmar Validação</h3>
                    <button onClick={() => setValidatingId(null)} className="text-gray-500 hover:text-white"><X size={18} /></button>
                  </div>
                  <p className="text-xs text-gray-400">Ao validar, confirma que o trabalho foi executado corretamente e de acordo com as suas expectativas.</p>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5"><MessageSquare size={10} /> Observação (opcional)</label>
                    <textarea
                      value={observacao}
                      onChange={e => setObservacao(e.target.value)}
                      rows={3}
                      placeholder="Tudo conforme o esperado..."
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-none text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={handleValidar} className="w-full py-4 bg-emerald-500 text-black font-black text-sm uppercase tracking-widest rounded-none flex items-center justify-center gap-2">
                    <ThumbsUp size={16} /> Confirmar Validação
                  </motion.button>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}


