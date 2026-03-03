import React, { useState, useEffect } from 'react';
import { Plus, Calendar, TrendingUp, Target, Search, Filter, X, ChevronRight, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { canManagePlanning } from '../utils/permissions';

export default function Planning5Y() {
  const [planning, setPlanning] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [formData, setFormData] = useState({
    item: '',
    ano: new Date().getFullYear(),
    trimestre: 1,
    observacoes: ''
  });

  useEffect(() => {
    fetchPlanning();
  }, []);

  const fetchPlanning = async () => {
    const res = await fetch('/api/planning-5y', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json();
    setPlanning(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/planning-5y', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        alert('Objetivo estratégico adicionado com sucesso!');
        setIsModalOpen(false);
        fetchPlanning();
        setFormData({ item: '', ano: new Date().getFullYear(), trimestre: 1, observacoes: '' });
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Erro ao adicionar objetivo estratégico');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de rede ao tentar adicionar o objetivo');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">A carregar Roteiro Estratégico...</p>
    </div>
  );

  const years = Array.from(new Set(planning.map(p => p.ano))).sort();

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Consultar roteiro..."
              className="pl-10 pr-4 py-2 bg-brand-surface border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-64 text-xs"
            />
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-xl border border-white/5">
            <BarChart3 size={12} className="text-emerald-500" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Visão Estratégica</span>
          </div>
        </div>
        {canManagePlanning(user.perfil) && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 text-xs"
          >
            <Plus size={16} />
            Novo Item Estratégico
          </button>
        )}
      </div>

      <div className="space-y-8">
        {years.length > 0 ? years.map(year => (
          <div key={year} className="space-y-4">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-bold text-white tracking-tighter">{year}</h3>
              <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/30 to-transparent"></div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ano Fiscal</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(q => {
                const items = planning.filter(p => p.ano === year && p.trimestre === q);
                return (
                  <div key={q} className="bg-brand-surface rounded-none border border-brand-border p-5 flex flex-col h-full group hover:border-emerald-500/30 transition-all relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <TrendingUp size={48} />
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Trimestre {q}</span>
                      <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                        <ChevronRight size={14} />
                      </div>
                    </div>

                    <div className="flex-1 space-y-3">
                      {items.length > 0 ? items.map(item => (
                        <div key={item.id} className="bg-white/5 p-3 rounded-2xl border border-white/5 hover:border-emerald-500/20 transition-all">
                          <h4 className="text-xs font-bold text-white mb-1">{item.item}</h4>
                          <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-2">{item.observacoes}</p>
                        </div>
                      )) : (
                        <div className="flex flex-col items-center justify-center py-6 opacity-20">
                          <Target size={24} className="text-gray-500 mb-2" />
                          <span className="text-[9px] font-bold uppercase tracking-widest">Sem Metas</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )) : (
          <div className="flex flex-col items-center justify-center py-16 bg-brand-surface rounded-none border border-brand-border border-dashed">
            <TrendingUp size={32} className="text-gray-700 mb-3" />
            <h3 className="text-base font-bold text-white tracking-tight">Sem Dados Estratégicos</h3>
            <p className="text-xs text-gray-500 mt-1">Inicie o seu roteiro de 5 anos adicionando objetivos estratégicos.</p>
          </div>
        )}
      </div>

      {/* Modal Novo Item */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-brand-surface w-full max-w-md rounded-none shadow-2xl relative z-10 overflow-hidden border border-brand-border"
            >
              <div className="p-6 bg-emerald-500 text-white flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold tracking-tight">Objetivo Estratégico</h2>
                  <p className="text-emerald-100 text-[10px] font-medium uppercase tracking-widest">Protocolo de Integração de Roteiro</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Designação do Objetivo</label>
                  <input
                    type="text"
                    required
                    value={formData.item}
                    onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                    placeholder="ex: Modernização Total de HVAC"
                    className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white placeholder:text-gray-600"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Ano Fiscal</label>
                    <input
                      type="number"
                      required
                      value={formData.ano}
                      onChange={(e) => setFormData({ ...formData, ano: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Trimestre</label>
                    <select
                      value={formData.trimestre}
                      onChange={(e) => setFormData({ ...formData, trimestre: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
                    >
                      {[1, 2, 3, 4].map(q => <option key={q} value={q} className="bg-brand-surface">Trimestre {q}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Observações Estratégicas</label>
                  <textarea
                    rows={3}
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    placeholder="Forneça contexto técnico e financeiro..."
                    className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white placeholder:text-gray-600 resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 uppercase tracking-widest text-xs disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      A processar...
                    </>
                  ) : 'Confirmar Objetivo'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
