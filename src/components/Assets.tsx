import React, { useState, useEffect } from 'react';
import { Plus, Cpu, MapPin, Calendar, Activity, Search, Filter, MoreVertical, LayoutGrid, List as ListIcon, X, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ASSET_CATEGORIES } from '../constants';
import DigitalTwin from './DigitalTwin';
import { canCreateAssets } from '../utils/permissions';

export default function Assets({ propertyId, onClearFilter }: { propertyId?: number | null, onClearFilter?: () => void }) {
  const [assets, setAssets] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [submitting, setSubmitting] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [formData, setFormData] = useState({
    nome: '',
    categoria: ASSET_CATEGORIES[0],
    property_id: propertyId?.toString() || '',
    localizacao_detalhada: '',
    data_instalacao: new Date().toISOString().split('T')[0],
    probabilidade_falha: 'Baixa',
    sinais_alerta: ''
  });

  useEffect(() => {
    fetchAssets();
    fetchProperties();
  }, []);

  useEffect(() => {
    if (propertyId) {
      setFormData(prev => ({ ...prev, property_id: propertyId.toString() }));
    }
  }, [propertyId]);

  const filteredAssets = propertyId 
    ? assets.filter(a => a.property_id === propertyId)
    : assets;

  const fetchAssets = async () => {
    const res = await fetch('/api/assets', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json();
    setAssets(data);
  };

  const fetchProperties = async () => {
    const res = await fetch('/api/properties', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json();
    setProperties(data);
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
        alert('Ativo adicionado com sucesso!');
        setIsModalOpen(false);
        fetchAssets();
        setFormData({ ...formData, nome: '', localizacao_detalhada: '', sinais_alerta: '' });
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Erro ao adicionar ativo');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de rede ao tentar adicionar o ativo');
    } finally {
      setSubmitting(false);
    }
  };

  if (selectedAsset) {
    return (
      <div className="space-y-6 page-enter">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setSelectedAsset(null)}
            className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors font-bold text-[10px] uppercase tracking-widest"
          >
            <X size={14} />
            Sair do Gémeo Digital
          </button>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Estado do Ativo:</span>
            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-emerald-500/20">Nominal</span>
          </div>
        </div>
        <DigitalTwin asset={selectedAsset} onBack={() => setSelectedAsset(null)} />
      </div>
    );
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
              className="pl-10 pr-4 py-2 bg-brand-surface border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-64 text-xs"
            />
          </div>
          {propertyId && (
            <button 
              onClick={onClearFilter}
              className="px-3 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-500/20 transition-all"
            >
              Filtro Ativo <X size={12} />
            </button>
          )}
          <div className="flex bg-brand-surface p-1 rounded-xl border border-brand-border">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <LayoutGrid size={14} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <ListIcon size={14} />
            </button>
          </div>
        </div>
        {canCreateAssets(user.perfil) && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 text-xs"
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
              className="bg-brand-surface rounded-[24px] border border-brand-border hover:border-emerald-500/30 transition-all group cursor-pointer overflow-hidden p-5"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 bg-white/5 rounded-xl text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                  <Cpu size={18} />
                </div>
                <div className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                  asset.probabilidade_falha === 'Alta' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                  asset.probabilidade_falha === 'Média' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                  'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                }`}>
                  Risco {asset.probabilidade_falha}
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-white text-sm tracking-tight group-hover:text-emerald-500 transition-colors truncate">{asset.nome}</h3>
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
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Telemetria Ativa</span>
                  </div>
                  <Zap size={12} className="text-amber-500 animate-pulse" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-brand-surface rounded-[24px] border border-brand-border overflow-hidden">
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
                      <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-emerald-500 border border-white/5">
                        <Cpu size={14} />
                      </div>
                      <span className="font-bold text-white text-xs">{asset.nome}</span>
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
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        asset.probabilidade_falha === 'Alta' ? 'bg-red-500' :
                        asset.probabilidade_falha === 'Média' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}></div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{asset.probabilidade_falha}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button className="p-1.5 hover:bg-white/5 rounded-lg text-gray-500 transition-colors">
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
              className="bg-brand-surface w-full max-w-2xl rounded-[32px] shadow-2xl relative z-10 overflow-hidden border border-brand-border"
            >
              <div className="p-6 bg-emerald-500 text-white flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold tracking-tight">Inicializar Ativo</h2>
                  <p className="text-emerald-100 text-[10px] font-medium uppercase tracking-widest">Novo Protocolo de Gémeo Digital</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Designação do Ativo</label>
                    <input 
                      type="text" 
                      required
                      value={formData.nome}
                      onChange={(e) => setFormData({...formData, nome: e.target.value})}
                      placeholder="ex: Unidade HVAC 04"
                      className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Classificação</label>
                    <select 
                      value={formData.categoria}
                      onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                      className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
                    >
                      {ASSET_CATEGORIES.map(c => <option key={c} value={c} className="bg-brand-surface">{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Atribuição de Propriedade</label>
                    <select 
                      required
                      value={formData.property_id}
                      onChange={(e) => setFormData({...formData, property_id: e.target.value})}
                      className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
                    >
                      <option value="" className="bg-brand-surface">Selecionar Propriedade...</option>
                      {properties.map(p => <option key={p.id} value={p.id} className="bg-brand-surface">{p.endereco}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Data de Implementação</label>
                    <input 
                      type="date" 
                      value={formData.data_instalacao}
                      onChange={(e) => setFormData({...formData, data_instalacao: e.target.value})}
                      className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
                    />
                  </div>
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
                  ) : 'Confirmar Implementação'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
