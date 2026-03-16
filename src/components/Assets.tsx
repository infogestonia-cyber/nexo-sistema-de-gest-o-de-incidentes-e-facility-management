import React, { useState, useEffect } from 'react';
import { Plus, Cpu, MapPin, Calendar, Activity, Search, Filter, MoreVertical, LayoutGrid, List as ListIcon, X, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ASSET_CATEGORIES } from '../constants';
import DigitalTwin from './DigitalTwin';
import { canCreateAssets } from '../utils/permissions';
import { Toast, ToastType } from './ui/Toast';

export default function Assets({ 
  propertyId, 
  onClearFilter, 
  initialAsset, 
  onClearAsset 
}: { 
  propertyId?: string | null, 
  onClearFilter?: () => void,
  initialAsset?: any,
  onClearAsset?: () => void
}) {
  const [assets, setAssets] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [submitting, setSubmitting] = useState(false);
  const [dynamicCategories, setDynamicCategories] = useState<string[]>(ASSET_CATEGORIES);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [user] = useState<any>(() => {
    try {
      const u = localStorage.getItem('user');
      return u && u !== 'undefined' ? JSON.parse(u) : {};
    } catch { return {}; }
  });
  const [formData, setFormData] = useState({
    nome: '',
    categoria: ASSET_CATEGORIES[0],
    property_id: propertyId?.toString() || '',
    localizacao_detalhada: '',
    data_instalacao: new Date().toISOString().split('T')[0],
    probabilidade_falha: 'Baixa',
    sinais_alerta: '',
    parent_id: '',
    obsoleto: false,
    data_obsolescencia: ''
  });

  useEffect(() => {
    fetchAssets();
    fetchProperties();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (propertyId) {
      setFormData(prev => ({ ...prev, property_id: propertyId.toString() }));
    }
  }, [propertyId]);

  useEffect(() => {
    if (initialAsset) {
      setSelectedAsset(initialAsset);
    }
  }, [initialAsset]);

  const handleBack = () => {
    setSelectedAsset(null);
    if (onClearAsset) onClearAsset();
  };

  const filteredAssets = propertyId
    ? assets.filter(a => String(a.property_id) === String(propertyId))
    : assets;

  const fetchAssets = async () => {
    try {
      const res = await fetch('/api/assets', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = res.ok ? await res.json() : [];
      setAssets(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setAssets([]);
    }
  };

  const fetchProperties = async () => {
    try {
      const res = await fetch('/api/properties', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = res.ok ? await res.json() : [];
      setProperties(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setProperties([]);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/settings', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const settings = await res.json();
        const catSetting = settings.find((s: any) => s.setting_key === 'asset_categories');
        if (catSetting && Array.isArray(catSetting.setting_value)) {
          setDynamicCategories(catSetting.setting_value);
          // Only set initial category if we don't have one and we found categories
          setFormData(prev => ({ 
            ...prev, 
            categoria: prev.categoria || catSetting.setting_value[0] || ASSET_CATEGORIES[0] 
          }));
        }
      }
    } catch (e) {
      console.error("Erro ao carregar categorias:", e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setToast({ message: 'Ativo adicionado com sucesso!', type: 'success' });
        setIsModalOpen(false);
        fetchAssets();
        setFormData({ 
          nome: '', 
          categoria: dynamicCategories[0] || ASSET_CATEGORIES[0], 
          property_id: propertyId?.toString() || '',
          localizacao_detalhada: '', 
          sinais_alerta: '', 
          parent_id: '', 
          obsoleto: false, 
          data_obsolescencia: '',
          data_instalacao: new Date().toISOString().split('T')[0],
          probabilidade_falha: 'Baixa'
        });
      } else {
        const errorData = await res.json();
        setToast({ message: errorData.error || 'Erro ao adicionar ativo', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setToast({ message: 'Erro de rede ao tentar adicionar o ativo', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (selectedAsset) {
    return <DigitalTwin asset={selectedAsset} onBack={handleBack} />;
  }

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Consultar ativos..."
              className="pl-10 pr-4 py-2 bg-brand-surface border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-64 text-xs"
            />
          </div>
          {propertyId && (
            <button
              onClick={onClearFilter}
              className="px-3 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-none border border-emerald-500/20 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-500/20 transition-all"
            >
              Filtro Ativo <X size={12} />
            </button>
          )}
          <div className="flex bg-brand-surface p-1 rounded-none border border-brand-border">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-none transition-all ${viewMode === 'grid' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-none transition-all ${viewMode === 'list' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <ListIcon size={14} />
            </button>
          </div>
        </div>
        {canCreateAssets(user.perfil) && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-500 text-white px-6 py-2 rounded-none font-bold hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 text-xs"
          >
            <Plus size={16} />
            Inicializar Ativo
          </button>
        )}
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAssets.map((asset) => (
            <motion.div
              layout
              key={asset.id}
              onClick={() => setSelectedAsset(asset)}
              className="bg-brand-surface rounded-none border border-brand-border hover:border-emerald-500/30 transition-all group cursor-pointer overflow-hidden p-5"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 bg-white/5 rounded-none text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                  <Cpu size={18} />
                </div>
                <div className={`px-2 py-0.5 rounded-none text-[9px] font-bold uppercase tracking-wider ${asset.probabilidade_falha === 'Alta' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                  asset.probabilidade_falha === 'Média' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                    'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  }`}>
                  Risco {asset.probabilidade_falha}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-sm tracking-tight group-hover:text-emerald-500 transition-colors truncate">{asset.nome}</h3>
                    {asset.obsoleto && (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-gray-500/10 text-gray-400 border border-gray-500/20">
                        Obsoleto
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">{asset.categoria}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] text-gray-400">
                    <MapPin size={12} className="text-gray-600" />
                    <span className="truncate">{asset.property_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400">
                    <Calendar size={12} className="text-gray-600" />
                    <span>Instalado: {asset.data_instalacao}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-brand-border flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Activity size={12} className="text-emerald-500" />
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Ver Inspecções</span>
                  </div>
                  <Zap size={12} className="text-gray-600" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-brand-surface rounded-none border border-brand-border overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="col-header">Ativo</th>
                <th className="col-header">Categoria</th>
                <th className="col-header">Propriedade</th>
                <th className="col-header">Saúde</th>
                <th className="col-header">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filteredAssets.map((asset) => (
                <tr
                  key={asset.id}
                  className="data-row"
                  onClick={() => setSelectedAsset(asset)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-none bg-white/5 flex items-center justify-center text-emerald-500 border border-white/5">
                        <Cpu size={14} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-white text-xs">{asset.nome}</span>
                        {asset.obsoleto && (
                          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-0.5 max-w-max px-1.5 py-0.5 rounded bg-gray-500/10">Obsoleto</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{asset.categoria}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-300">{asset.property_name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-none ${asset.probabilidade_falha === 'Alta' ? 'bg-red-500' :
                        asset.probabilidade_falha === 'Média' ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}></div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{asset.probabilidade_falha}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button className="p-1.5 hover:bg-white/5 rounded-none text-gray-500 transition-colors">
                      <MoreVertical size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Novo Ativo */}
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
              className="bg-brand-surface w-full max-w-2xl shadow-2xl border border-brand-border relative z-10 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 bg-emerald-500 text-white flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-lg font-bold tracking-tight">Registar Ativo</h2>
                  <p className="text-emerald-100 text-[10px] font-medium uppercase tracking-widest mt-0.5">Novo Equipamento ou Instalação</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-none transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form id="asset-form" onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Nome do Ativo</label>
                    <input
                      type="text"
                      required
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="ex: Ar Condicionado GREE"
                      className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Categoria</label>
                    <select
                      value={formData.categoria}
                      onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
                    >
                      {dynamicCategories.map(c => <option key={c} value={c} className="bg-brand-surface">{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Propriedade *</label>
                    <select
                      required
                      value={formData.property_id}
                      onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
                    >
                      <option value="" className="bg-brand-surface">Selecionar Propriedade...</option>
                      {properties.map(p => <option key={p.id} value={p.id} className="bg-brand-surface">{p.endereco}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Data de Instalação</label>
                    <input
                      type="date"
                      value={formData.data_instalacao}
                      onChange={(e) => setFormData({ ...formData, data_instalacao: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
                    />
                  </div>
                </div>
                
                {/* Hierarquia e Ciclo de Vida */}
                <div className="pt-6 border-t border-brand-border">
                  <h3 className="text-sm font-bold text-white tracking-tight mb-4">Hierarquia e Ciclo de Vida</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Ativo Pai (Hierarquia)</label>
                      <select
                        value={formData.parent_id}
                        onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
                      >
                        <option value="" className="bg-brand-surface">Nenhum (Ativo Principal)</option>
                        {assets.map(a => <option key={a.id} value={a.id} className="bg-brand-surface">{a.nome} ({a.categoria})</option>)}
                      </select>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3 pt-6">
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            className="peer h-5 w-5 cursor-pointer appearance-none rounded-none border border-brand-border bg-white/5 checked:border-emerald-500 checked:bg-emerald-500 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            checked={formData.obsoleto}
                            onChange={(e) => setFormData({ ...formData, obsoleto: e.target.checked })}
                          />
                          <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none opacity-0 peer-checked:opacity-100 text-white transition-opacity" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <label className="text-xs font-bold text-gray-300">Marcar como Obsoleto</label>
                      </div>
                      
                      {formData.obsoleto && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Data de Obsolescência</label>
                          <input
                            required
                            type="date"
                            value={formData.data_obsolescencia}
                            onChange={(e) => setFormData({ ...formData, data_obsolescencia: e.target.value })}
                            className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </form>
              <div className="p-6 border-t border-brand-border shrink-0 bg-brand-surface">
                <button
                  type="submit"
                  form="asset-form"
                  disabled={submitting}
                  className="w-full py-3 bg-emerald-500 text-white rounded-none font-bold hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 uppercase tracking-widest text-xs disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <><div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-none animate-spin"></div> A processar...</>
                  ) : 'Confirmar Registo'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Toast 
        message={toast?.message || null} 
        type={toast?.type} 
        onClose={() => setToast(null)} 
      />
    </div>
  );
}


