import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Clock, AlertTriangle, ThumbsUp, X, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { api } from '../../services/api';

const FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'Em progresso', label: 'Em Curso' },
  { id: 'Em validação', label: 'Validar' },
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
    <div className="flex-1 overflow-y-auto px-4 py-6 pb-28 space-y-4">
      <h2 className="text-xl font-black text-white">Ordens de Serviço</h2>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-none text-[10px] font-black uppercase tracking-widest transition-all border ${activeFilter === f.id
                ? 'bg-emerald-500 text-black border-emerald-500'
                : 'bg-white/5 text-gray-400 border-white/10'
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-none animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {ordens.map((os, i) => (
            <motion.div
              key={os.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-white/[0.03] border border-white/8 rounded-none p-4 space-y-3"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-bold text-white leading-snug">{os.descricao}</p>
                  <p className="text-[9px] text-gray-600 mt-1 font-mono uppercase">{os.categoria} · #{os.id.slice(0, 8)}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {STATUS_ICON[os.estado]}
                </div>
              </div>

              {/* Meta row */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[8px] font-bold px-2 py-0.5 rounded-none ${SEVERITY_COLORS[os.severidade]}`}>{os.severidade}</span>
                <span className="text-[8px] text-gray-600">·</span>
                <span className="text-[9px] text-gray-500">{format(new Date(os.data_abertura), 'dd MMM yyyy', { locale: ptBR })}</span>
                {os.tecnico && <><span className="text-[8px] text-gray-600">·</span><span className="text-[9px] text-gray-500">🔧 {os.tecnico}</span></>}
                {os.custo_estimado > 0 && <><span className="text-[8px] text-gray-600">·</span><span className="text-[9px] font-bold text-emerald-500">{os.custo_estimado} MT</span></>}
              </div>

              {/* Validate button */}
              {os.estado === 'Em validação' && !os.validado && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setValidatingId(os.id)}
                  className="w-full py-3 bg-emerald-500 text-black font-black text-[10px] uppercase tracking-widest rounded-none flex items-center justify-center gap-2"
                >
                  <ThumbsUp size={14} /> Validar e Aprovar
                </motion.button>
              )}
              {os.validado && (
                <div className="flex items-center gap-2 text-[9px] text-emerald-500/70 font-bold uppercase">
                  <CheckCircle2 size={12} /> Validado pelo cliente
                </div>
              )}
            </motion.div>
          ))}
          {ordens.length === 0 && (
            <div className="text-center py-16">
              <CheckCircle2 size={40} className="text-gray-700 mx-auto mb-3" />
              <p className="text-gray-600 text-xs font-bold uppercase tracking-widest">Nenhuma ordem encontrada</p>
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


