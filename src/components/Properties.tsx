import React, { useState, useEffect } from 'react';
import { Plus, MapPin, Building2, User, Hash, Search, Filter, MoreVertical, X, ArrowUpRight, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { canCreateProperties } from '../utils/permissions';

export default function Properties({ onSelectProperty }: { onSelectProperty: (id: number) => void }) {
  const [properties, setProperties] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [formData, setFormData] = useState({
    codigo: '',
    endereco: '',
    inquilino: '',
    referencia_interna: ''
  });

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    const res = await fetch('/api/properties', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json();
    setProperties(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        alert('Propriedade adicionada com sucesso!');
        setIsModalOpen(false);
        fetchProperties();
        setFormData({ codigo: '', endereco: '', inquilino: '', referencia_interna: '' });
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Erro ao adicionar propriedade');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de rede ao tentar adicionar a propriedade');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">A carregar Portfólio de Ativos...</p>
    </div>
  );

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-3.5 h-3.5" />
            <input 
              type="text" 
              placeholder="Filtrar portfólio..." 
              className="pl-10 pr-4 py-2 bg-brand-surface border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-64 text-xs"
            />
          </div>
          <button className="p-2 bg-brand-surface border border-brand-border rounded-xl hover:bg-white/5 transition-colors text-gray-400 flex items-center gap-2 px-4">
            <Filter size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Filtros</span>
          </button>
        </div>
        {canCreateProperties(user.perfil) && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 text-xs"
          >
            <Plus size={16} />
            Adicionar Propriedade
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {properties.map((prop) => (
          <motion.div 
            layout
            key={prop.id}
            className="bg-brand-surface rounded-[24px] border border-brand-border hover:border-emerald-500/30 transition-all group overflow-hidden"
          >
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 bg-white/5 rounded-xl text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                  <Building2 size={18} />
                </div>
                <span className="text-[10px] font-mono text-gray-600 font-bold">#{prop.codigo}</span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-white text-sm tracking-tight group-hover:text-emerald-500 transition-colors truncate">{prop.endereco}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Globe size={10} className="text-gray-600" />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ativo Principal</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] text-gray-400">
                    <User size={12} className="text-gray-600" />
                    <span className="truncate">Inquilino: {prop.inquilino || 'N/A'}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-brand-border flex items-center justify-between">
                  <button 
                    onClick={() => onSelectProperty(prop.id)}
                    className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest hover:underline flex items-center gap-1"
                  >
                    Ver Ativos <ArrowUpRight size={10} />
                  </button>
                  <div className="flex -space-x-1.5">
                    {[1,2].map(i => (
                      <div key={i} className="w-5 h-5 rounded-full border border-brand-surface bg-gray-800 flex items-center justify-center text-[7px] font-bold">U{i}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

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
              className="bg-brand-surface w-full max-w-md rounded-[32px] shadow-2xl relative z-10 overflow-hidden border border-brand-border"
            >
              <div className="p-6 bg-emerald-500 text-white flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold tracking-tight">Adicionar Propriedade</h2>
                  <p className="text-emerald-100 text-[10px] font-medium uppercase tracking-widest">Protocolo de Expansão de Portfólio</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Código Interno</label>
                  <input 
                    type="text" 
                    required
                    value={formData.codigo}
                    onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                    placeholder="ex: PROP-001"
                    className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Endereço Completo</label>
                  <input 
                    type="text" 
                    required
                    value={formData.endereco}
                    onChange={(e) => setFormData({...formData, endereco: e.target.value})}
                    placeholder="ex: Av. Liberdade, 123"
                    className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Inquilino Principal</label>
                  <input 
                    type="text" 
                    value={formData.inquilino}
                    onChange={(e) => setFormData({...formData, inquilino: e.target.value})}
                    placeholder="ex: TechCorp S.A."
                    className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
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
                  ) : 'Registar Propriedade'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
