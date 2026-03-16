import React, { useState, useEffect } from 'react';
import { ensureArray } from '../utils/safeArray';
import {
  Plus, Building2, User, Hash, Search, X, Globe,
  Cpu, Activity, AlertCircle, Wrench, ChevronRight,
  ArrowLeft, MapPin, Settings, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { canCreateProperties } from '../utils/permissions';
import { Toast, ToastType } from './ui/Toast';
export default function Properties({ onSelectProperty }: { onSelectProperty: (id: string) => void }) {
  const [properties, setProperties] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
  const [user] = useState<any>(() => {
    try {
      const u = localStorage.getItem('user');
      return u && u !== 'undefined' ? JSON.parse(u) : {};
    } catch { return {}; }
  });
  const [formData, setFormData] = useState({
    codigo: '',
    endereco: '',
    inquilino: '',
    referencia_interna: ''
  });

  const showToast = (msg: string, type: ToastType = 'success') => {
    setToast({ msg, type });
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [propRes, assetRes] = await Promise.all([
        fetch('/api/properties', { headers }),
        fetch('/api/assets', { headers }),
      ]);

      const propData = propRes.ok ? await propRes.json() : [];
      const assetData = assetRes.ok ? await assetRes.json() : [];

      setProperties(Array.isArray(propData) ? propData : []);
      setAssets(Array.isArray(assetData) ? assetData : []);
    } catch (e) {
      console.error(e);
      setProperties([]);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchAll();
        setFormData({ codigo: '', endereco: '', inquilino: '', referencia_interna: '' });
        showToast('Propriedade registada com sucesso!', 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Erro ao adicionar propriedade', 'error');
      }
    } catch {
      showToast('Erro de rede. Tente novamente.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getAssetsForProperty = (propId: string) => ensureArray<any>(assets).filter(a => a.property_id === propId);

  const filtered = ensureArray<any>(properties).filter(p =>
    !search ||
    p.endereco?.toLowerCase().includes(search.toLowerCase()) ||
    p.inquilino?.toLowerCase().includes(search.toLowerCase()) ||
    p.codigo?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-none animate-spin"></div>
      <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">A carregar Propriedades...</p>
    </div>
  );

  // Property Detail View
  if (selectedProperty) {
    const propAssets = getAssetsForProperty(selectedProperty.id);
    return (
      <div className="space-y-5 page-enter">
        {/* Breadcrumb */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedProperty(null)}
            className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors font-bold text-[10px] uppercase tracking-widest"
          >
            <ArrowLeft size={13} />
            Todas as Propriedades
          </button>
          <ChevronRight size={12} className="text-gray-600" />
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{selectedProperty.endereco}</span>
        </div>

        {/* Property Header */}
        <div className="bg-brand-surface border border-brand-border p-6 flex flex-col md:flex-row md:items-start gap-4 justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
              <Building2 size={22} />
            </div>
            <div>
              <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-1">
                PROPRIEDADE #{selectedProperty.codigo}
              </p>
              <h2 className="text-lg font-bold text-white tracking-tight">{selectedProperty.endereco}</h2>
              <div className="flex flex-wrap gap-4 mt-2">
                {selectedProperty.inquilino && (
                  <span className="text-[10px] text-gray-400 flex items-center gap-1.5">
                    <User size={11} className="text-gray-600" /> {selectedProperty.inquilino}
                  </span>
                )}
                {selectedProperty.referencia_interna && (
                  <span className="text-[10px] text-gray-400 flex items-center gap-1.5">
                    <Hash size={11} className="text-gray-600" /> {selectedProperty.referencia_interna}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => onSelectProperty(selectedProperty.id)}
              className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-all flex items-center gap-2"
            >
              <Eye size={13} />
              Ver em Inspecções
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total de Ativos', value: ensureArray<any>(propAssets).length, icon: Cpu, color: 'text-emerald-500' },
            { label: 'Risco Alto', value: ensureArray<any>(propAssets).filter(a => a.probabilidade_falha === 'Alta').length, icon: AlertCircle, color: 'text-red-500' },
            { label: 'Risco Médio', value: ensureArray<any>(propAssets).filter(a => a.probabilidade_falha === 'Média').length, icon: Activity, color: 'text-amber-500' },
            { label: 'Risco Baixo', value: ensureArray<any>(propAssets).filter(a => a.probabilidade_falha !== 'Alta' && a.probabilidade_falha !== 'Média').length, icon: Settings, color: 'text-blue-500' },
          ].map((s, i) => (
            <div key={i} className="bg-brand-surface border border-brand-border p-4">
              <div className="flex items-center gap-2 mb-1">
                <s.icon size={13} className={s.color} />
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{s.label}</p>
              </div>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Assets list */}
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            Ativos desta Propriedade ({propAssets.length})
          </h3>
          {propAssets.length === 0 ? (
            <div className="bg-brand-surface border border-brand-border p-10 text-center">
              <Cpu size={28} className="text-gray-600 mx-auto mb-3" />
              <p className="text-sm font-bold text-gray-500">Nenhum ativo registado nesta propriedade</p>
              <p className="text-xs text-gray-600 mt-1">Adicione ativos na secção "Ativos & Inspecções"</p>
            </div>
          ) : (
            <div className="bg-brand-surface border border-brand-border overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/[0.02]">
                    <th className="col-header">Ativo</th>
                    <th className="col-header">Categoria</th>
                    <th className="col-header">Localização</th>
                    <th className="col-header">Risco</th>
                    <th className="col-header">Instalado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {ensureArray<any>(propAssets).map(asset => (
                    <tr key={asset.id} className="data-row">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 bg-white/5 border border-white/5 flex items-center justify-center text-emerald-500">
                            <Cpu size={13} />
                          </div>
                          <span className="text-xs font-bold text-white">{asset.nome}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{asset.categoria}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] text-gray-500">{asset.localizacao_detalhada || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest border ${asset.probabilidade_falha === 'Alta' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                          asset.probabilidade_falha === 'Média' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                            'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          }`}>
                          {asset.probabilidade_falha || 'Baixa'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-mono text-gray-500">{asset.data_instalacao || '—'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 page-enter">
      {/* Modern Premium Toast */}
      <Toast
        message={toast?.msg || null}
        type={toast?.type}
        onClose={() => setToast(null)}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-3.5 h-3.5" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar propriedades..."
              className="pl-10 pr-4 py-2 bg-brand-surface border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-64 text-xs"
            />
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/5">
            <Building2 size={12} className="text-emerald-500" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{filtered.length} Propriedades</span>
          </div>
        </div>
        {canCreateProperties(user.perfil) && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-500 text-white px-6 py-2 rounded-none font-bold hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 text-xs"
          >
            <Plus size={16} />
            Registar Propriedade
          </button>
        )}
      </div>

      {/* Info banner — explains structure */}
      <div className="flex items-start gap-3 p-4 bg-blue-500/5 border border-blue-500/10 text-xs text-blue-300">
        <Building2 size={14} className="text-blue-400 shrink-0 mt-0.5" />
        <p>
          <strong className="text-blue-300">Propriedade</strong> é um imóvel ou instalação física (ex: edifício, escritório).
          Cada propriedade pode ter vários <strong className="text-blue-300">Ativos</strong> (ex: ar condicionado, elevador, gerador).
          Clique em "Ver Ativos" numa propriedade para ver os seus ativos e inspecções.
        </p>
      </div>

      {/* Property Grid */}
      {filtered.length === 0 ? (
        <div className="bg-brand-surface border border-brand-border p-12 text-center">
          <Building2 size={32} className="text-gray-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-500">
            {search ? 'Nenhuma propriedade encontrada' : 'Nenhuma propriedade registada'}
          </p>
          {!search && canCreateProperties(user.perfil) && (
            <button onClick={() => setIsModalOpen(true)} className="mt-4 px-4 py-2 bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-all">
              + Registar primeira propriedade
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {ensureArray<any>(filtered).map((prop) => {
            const propAssets = getAssetsForProperty(prop.id);
            const highRisk = ensureArray<any>(propAssets).filter(a => a.probabilidade_falha === 'Alta').length;
            return (
              <motion.div
                layout
                key={prop.id}
                className="bg-brand-surface border border-brand-border hover:border-emerald-500/30 transition-all group overflow-hidden cursor-pointer"
                onClick={() => setSelectedProperty(prop)}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2.5 bg-white/5 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                      <Building2 size={18} />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[9px] font-mono text-gray-600 font-bold">#{prop.codigo}</span>
                      {highRisk > 0 && (
                        <span className="px-1.5 py-0.5 text-[8px] font-bold bg-red-500/10 border border-red-500/20 text-red-400 uppercase">
                          {highRisk} Risco Alto
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h3 className="font-bold text-white text-sm tracking-tight group-hover:text-emerald-500 transition-colors">
                        {prop.endereco}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest px-1.5 py-0.5 bg-white/5 border border-white/5">
                          PROPRIEDADE
                        </span>
                      </div>
                    </div>

                    {prop.inquilino && (
                      <div className="flex items-center gap-2 text-[10px] text-gray-400">
                        <User size={11} className="text-gray-600" />
                        <span className="truncate">{prop.inquilino}</span>
                      </div>
                    )}

                    <div className="pt-3 border-t border-brand-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Cpu size={12} className="text-emerald-500" />
                          <span className="text-[10px] font-bold text-gray-400">
                            {propAssets.length} {propAssets.length === 1 ? 'Ativo' : 'Ativos'}
                          </span>
                        </div>
                        <ChevronRight size={13} className="text-gray-600 group-hover:text-emerald-500 transition-colors" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ─── Add Property Modal ─── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] overflow-y-auto">
            <div className="flex min-h-full items-start justify-center p-4 pt-8">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsModalOpen(false)}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-brand-surface w-full max-w-md shadow-2xl border border-brand-border relative z-10 flex flex-col"
              >
                {/* Modal Header */}
                <div className="p-6 bg-emerald-500 text-white flex items-center justify-between shrink-0">
                  <div>
                    <h2 className="text-lg font-bold tracking-tight">Registar Propriedade</h2>
                    <p className="text-emerald-100 text-[10px] font-medium uppercase tracking-widest mt-0.5">
                      Nova propriedade ou instalação física
                    </p>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 transition-colors">
                    <X size={20} />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Código Interno *</label>
                    <input
                      type="text"
                      required
                      value={formData.codigo}
                      onChange={e => setFormData({ ...formData, codigo: e.target.value })}
                      placeholder="ex: PROP-001"
                      className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Endereço / Nome do Imóvel *</label>
                    <input
                      type="text"
                      required
                      value={formData.endereco}
                      onChange={e => setFormData({ ...formData, endereco: e.target.value })}
                      placeholder="ex: Av. Liberdade 123, Maputo"
                      className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Inquilino / Responsável</label>
                    <input
                      type="text"
                      value={formData.inquilino}
                      onChange={e => setFormData({ ...formData, inquilino: e.target.value })}
                      placeholder="ex: PETROMOC S.A."
                      className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Referência Interna</label>
                    <input
                      type="text"
                      value={formData.referencia_interna}
                      onChange={e => setFormData({ ...formData, referencia_interna: e.target.value })}
                      placeholder="ex: Contrato 2024/FM-007"
                      className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-5 py-3 border border-brand-border text-gray-400 hover:text-white hover:border-gray-400 transition-colors font-bold text-xs uppercase tracking-widest"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 py-3 bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 uppercase tracking-widest text-xs disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <><div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-none animate-spin" /> A processar...</>
                      ) : 'Registar Propriedade'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

