import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, MoreVertical, ArrowUpRight, AlertCircle, Clock, CheckCircle2, X as XCircle, Activity, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CATEGORIES, SEVERITIES } from '../constants';
import { canReportIncidents } from '../utils/permissions';

export default function Incidents({ onSelectIncident }: { onSelectIncident: (id: number) => void }) {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [formData, setFormData] = useState({
    property_id: '',
    asset_id: '',
    categoria: CATEGORIES[0],
    descricao: '',
    severidade: 'Médio',
    responsavel_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [incRes, propRes, assetRes, userRes] = await Promise.all([
      fetch('/api/incidents', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
      fetch('/api/properties', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
      fetch('/api/assets', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
      fetch('/api/users', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
    ]);
    
    const [incData, propData, assetData, userData] = await Promise.all([
      incRes.json(), propRes.json(), assetRes.json(), userRes.json()
    ]);

    setIncidents(incData);
    setProperties(propData);
    setAssets(assetData);
    setUsers(userData);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
        setFormData({ property_id: '', asset_id: '', categoria: CATEGORIES[0], descricao: '', severidade: 'Médio', responsavel_id: '' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">A carregar Matriz de Incidentes...</p>
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
              placeholder="Consultar matriz..." 
              className="pl-10 pr-4 py-2 bg-brand-surface border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-64 text-xs"
            />
          </div>
          <button className="p-2 bg-brand-surface border border-brand-border rounded-xl hover:bg-white/5 transition-colors text-gray-400 flex items-center gap-2 px-4">
            <Filter size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Filtros</span>
          </button>
        </div>
        {canReportIncidents(user.perfil) && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 text-xs"
          >
            <Plus size={16} />
            Reportar Incidente
          </button>
        )}
      </div>

      <div className="bg-brand-surface rounded-[24px] border border-brand-border overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/[0.02]">
              <th className="col-header">Protocolo</th>
              <th className="col-header">Ativo / Localização</th>
              <th className="col-header">Severidade</th>
              <th className="col-header">Estado</th>
              <th className="col-header">Responsável</th>
              <th className="col-header">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {incidents.map((incident) => (
              <tr 
                key={incident.id} 
                className="data-row"
                onClick={() => onSelectIncident(incident.id)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-[10px] font-mono font-bold text-emerald-500 border border-white/5">
                      #{incident.id.toString().padStart(3, '0')}
                    </div>
                    <div>
                      <p className="font-bold text-white text-xs tracking-tight">{incident.categoria}</p>
                      <p className="text-[9px] text-gray-500 font-mono uppercase tracking-tighter">{format(new Date(incident.data_hora), 'dd MMM HH:mm', { locale: ptBR })}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-300 font-medium truncate max-w-[150px]">{incident.property_name}</span>
                    <span className="text-[9px] text-gray-500 uppercase tracking-widest">Ativo da Infraestrutura</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                    incident.severidade === 'Crítico' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                    incident.severidade === 'Alto' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                    incident.severidade === 'Médio' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                    'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                  }`}>
                    {incident.severidade}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      incident.estado === 'Resolvido' ? 'bg-emerald-500' :
                      incident.estado === 'Aberto' ? 'bg-blue-500' : 'bg-amber-500'
                    }`}></div>
                    <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">{incident.estado}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[8px] font-bold text-gray-400 border border-white/5">
                      {incident.responsavel_nome?.charAt(0) || '?'}
                    </div>
                    <span className="text-xs text-gray-300">{incident.responsavel_nome || 'Não Atribuído'}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button className="p-1.5 hover:bg-white/5 rounded-lg text-gray-500 transition-colors">
                    <ArrowUpRight size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
              className="bg-brand-surface w-full max-w-2xl rounded-[32px] shadow-2xl relative z-10 overflow-hidden border border-brand-border"
            >
              <div className="p-6 bg-emerald-500 text-white flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold tracking-tight">Reportar Incidente</h2>
                  <p className="text-emerald-100 text-[10px] font-medium uppercase tracking-widest">Protocolo de Falha Operacional</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                  <XCircle size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Propriedade</label>
                    <select 
                      required
                      value={formData.property_id}
                      onChange={(e) => setFormData({...formData, property_id: e.target.value})}
                      className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
                    >
                      <option value="" className="bg-brand-surface">Selecionar Propriedade</option>
                      {properties.map(p => <option key={p.id} value={p.id} className="bg-brand-surface">{p.endereco}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Ativo (Opcional)</label>
                    <select 
                      value={formData.asset_id}
                      onChange={(e) => setFormData({...formData, asset_id: e.target.value})}
                      className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
                    >
                      <option value="" className="bg-brand-surface">Selecionar Ativo</option>
                      {assets.filter(a => a.property_id.toString() === formData.property_id).map(a => (
                        <option key={a.id} value={a.id} className="bg-brand-surface">{a.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Categoria</label>
                    <select 
                      value={formData.categoria}
                      onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                      className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c} className="bg-brand-surface">{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Severidade</label>
                    <select 
                      value={formData.severidade}
                      onChange={(e) => setFormData({...formData, severidade: e.target.value})}
                      className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
                    >
                      {SEVERITIES.map(s => <option key={s} value={s} className="bg-brand-surface">{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Descrição</label>
                  <textarea 
                    required
                    rows={3}
                    value={formData.descricao}
                    onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                    placeholder="Descreva o incidente em detalhe..."
                    className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Atribuir Responsável</label>
                  <select 
                    value={formData.responsavel_id}
                    onChange={(e) => setFormData({...formData, responsavel_id: e.target.value})}
                    className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
                  >
                    <option value="" className="bg-brand-surface">Selecionar Responsável</option>
                    {users.map(u => <option key={u.id} value={u.id} className="bg-brand-surface">{u.nome}</option>)}
                  </select>
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
                  ) : 'Submeter Protocolo'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
