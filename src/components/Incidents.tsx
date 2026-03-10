import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, ArrowUpRight, AlertCircle, Clock, CheckCircle2, X as XIcon, Activity, ChevronDown, Trash2, Download, Calendar as CalendarIcon, LayoutGrid, List, User as UserIcon, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CATEGORIES, SEVERITIES } from '../constants';
import { canReportIncidents } from '../utils/permissions';

// Safe date formatter - never crashes on invalid dates
const safeFormat = (dateStr: string | null | undefined, fmt: string) => {
  if (!dateStr) return '—';
  try {
    const d = parseISO(dateStr);
    if (!isValid(d)) return '—';
    return format(d, fmt, { locale: ptBR });
  } catch { return '—'; }
};

export default function Incidents({ onSelectIncident }: { onSelectIncident: (id: string) => void }) {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [quickFilter, setQuickFilter] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [formData, setFormData] = useState({
    property_id: '',
    asset_id: '',
    categoria: CATEGORIES[0],
    descricao: '',
    severidade: 'Médio',
    responsavel_id: ''
  });

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const h = { Authorization: `Bearer ${token}` };
      const [incRes, propRes, assetRes, userRes] = await Promise.all([
        fetch('/api/incidents', { headers: h }),
        fetch('/api/properties', { headers: h }),
        fetch('/api/assets', { headers: h }),
        fetch('/api/users', { headers: h })
      ]);
      const [incData, propData, assetData, userData] = await Promise.all([
        incRes.json(), propRes.json(), assetRes.json(), userRes.json()
      ]);
      setIncidents(Array.isArray(incData) ? incData : []);
      setProperties(Array.isArray(propData) ? propData : []);
      setAssets(Array.isArray(assetData) ? assetData : []);
      setUsers(Array.isArray(userData) ? userData : []);
    } catch (err) {
      showToast('Erro ao carregar incidentes.', 'error');
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.property_id) {
      showToast('Selecione uma Propriedade.', 'error');
      return;
    }
    if (!formData.descricao.trim()) {
      showToast('Preencha a descrição do incidente.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
        setFormData({ property_id: '', asset_id: '', categoria: CATEGORIES[0], descricao: '', severidade: 'Médio', responsavel_id: '' });
        showToast('✅ Incidente reportado com sucesso!');
      } else {
        const err = await res.json();
        showToast(err.error || 'Erro ao reportar incidente', 'error');
      }
    } catch {
      showToast('Erro de rede. Tente novamente.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBatchUpdate = async (updates: any) => {
    if (selectedIds.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/incidents/batch', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ids: selectedIds, updates })
      });
      if (res.ok) {
        showToast(`✅ ${selectedIds.length} incidentes atualizados.`);
        setSelectedIds([]);
        fetchData();
      }
    } catch {
      showToast('Erro ao atualizar em massa.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(i => i.id));
    }
  };

  const toggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleExport = () => {
    if (filtered.length === 0) return;
    
    const headers = ['Protocolo', 'Categoria', 'Descricao', 'Propriedade', 'Severidade', 'Estado', 'Responsavel', 'Data'];
    const rows = filtered.map(i => [
      `#${i.id?.toString().slice(-4).toUpperCase()}`,
      i.categoria,
      i.descricao.replace(/,/g, ';'), // simple csv escape
      i.property_name,
      i.severidade,
      i.estado,
      i.responsavel_nome || 'Não Atribuído',
      safeFormat(i.created_at, 'yyyy-MM-dd HH:mm')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `incidentes_nexo_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('✅ Exportação concluída!');
  };

  const CalendarView = () => {
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

    const getIncidentsForDay = (day: number) => {
      const dateStr = format(new Date(new Date().getFullYear(), new Date().getMonth(), day), 'yyyy-MM-dd');
      return filtered.filter(i => i.created_at?.startsWith(dateStr));
    };

    return (
      <div className="bg-brand-surface border border-brand-border p-4">
        <div className="grid grid-cols-7 gap-px bg-brand-border border border-brand-border">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="bg-white/[0.02] p-2 text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">{d}</div>
          ))}
          {blanks.map(b => <div key={`b-${b}`} className="bg-brand-surface h-32 opacity-20" />)}
          {days.map(d => (
            <div key={d} className="bg-brand-surface h-32 p-2 border-t border-brand-border relative overflow-hidden group hover:bg-white/[0.01] transition-all">
              <span className="text-[10px] font-bold text-gray-600 group-hover:text-emerald-500 transition-colors">{d}</span>
              <div className="mt-1 space-y-1">
                {getIncidentsForDay(d).slice(0, 3).map(i => (
                  <div key={i.id} onClick={() => onSelectIncident(i.id)} className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-bold text-emerald-400 truncate cursor-pointer hover:bg-emerald-500 hover:text-white transition-all">
                    {i.categoria}
                  </div>
                ))}
                {getIncidentsForDay(d).length > 3 && <p className="text-[8px] text-gray-500 text-center font-bold">+{getIncidentsForDay(d).length - 3} mais</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const severityConfig: Record<string, string> = {
    'Crítico': 'bg-red-500/10 text-red-400 border-red-500/20',
    'Alto': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    'Médio': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'Baixo': 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  };

  const statusDot: Record<string, string> = {
    'Resolvido': 'bg-emerald-500', 'Fechado': 'bg-teal-500',
    'Aberto': 'bg-blue-500', 'Em progresso': 'bg-amber-500',
  };

  const filtered = incidents.filter(i => {
    const matchSearch = !search || i.categoria?.toLowerCase().includes(search.toLowerCase())
      || i.property_name?.toLowerCase().includes(search.toLowerCase())
      || i.descricao?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || i.estado === filterStatus;
    
    if (quickFilter === 'high') return matchSearch && matchStatus && i.severidade === 'Crítico';
    if (quickFilter === 'mine') return matchSearch && matchStatus && i.responsavel_id === currentUser.id;
    if (quickFilter === 'overdue') {
      const isOverdue = new Date(i.sla_resposta_limite) < new Date() && i.estado === 'Aberto';
      return matchSearch && matchStatus && isOverdue;
    }

    return matchSearch && matchStatus;
  });

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">A carregar Incidentes...</p>
    </div>
  );

  return (
    <div className="space-y-5 page-enter">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className={`fixed top-4 right-4 z-[200] px-5 py-3 text-sm font-bold text-white shadow-2xl border ${toast.type === 'error' ? 'bg-red-900 border-red-500/30' : 'bg-brand-surface border-brand-border'}`}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-3.5 h-3.5" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar incidentes..."
              className="pl-10 pr-4 py-2 bg-brand-surface border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-52 text-xs" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-brand-surface border border-brand-border text-xs text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
            <option value="">Todos os estados</option>
            <option value="Aberto">Aberto</option>
            <option value="Em progresso">Em progresso</option>
            <option value="Resolvido">Resolvido</option>
            <option value="Fechado">Fechado</option>
          </select>
          <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/5">
            <AlertCircle size={12} className="text-emerald-500" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{filtered.length} incidentes</span>
          </div>
          <button onClick={handleExport} className="p-2 bg-brand-surface border border-brand-border text-gray-400 hover:text-emerald-500 transition-all" title="Exportar CSV">
            <Download size={14} />
          </button>
          <div className="flex bg-brand-surface border border-brand-border p-1">
            <button onClick={() => setViewMode('list')} className={`p-1 transition-all ${viewMode === 'list' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-gray-500 hover:text-white'}`}>
              <List size={14} />
            </button>
            <button onClick={() => setViewMode('calendar')} className={`p-1 transition-all ${viewMode === 'calendar' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-gray-500 hover:text-white'}`}>
              <CalendarIcon size={14} />
            </button>
          </div>
        </div>
        {canReportIncidents(currentUser.perfil) && (
          <button onClick={() => setIsModalOpen(true)}
            className="bg-emerald-500 text-white px-6 py-2 rounded-none font-bold hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 text-xs shrink-0">
            <Plus size={16} /> Reportar Incidente
          </button>
        )}
      </div>

      {/* Quick Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        <button onClick={() => setQuickFilter('')} className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest border transition-all ${!quickFilter ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white/5 text-gray-500 border-white/5 hover:text-white'}`}>
          Todos
        </button>
        <button onClick={() => setQuickFilter('high')} className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest border transition-all flex items-center gap-2 ${quickFilter === 'high' ? 'bg-red-500 text-white border-red-500' : 'bg-white/5 text-gray-500 border-white/5 hover:text-white'}`}>
          <AlertTriangle size={12} /> Alta Prioridade
        </button>
        <button onClick={() => setQuickFilter('mine')} className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest border transition-all flex items-center gap-2 ${quickFilter === 'mine' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white/5 text-gray-500 border-white/5 hover:text-white'}`}>
          <UserIcon size={12} /> Meus Protocolos
        </button>
        <button onClick={() => setQuickFilter('overdue')} className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest border transition-all flex items-center gap-2 ${quickFilter === 'overdue' ? 'bg-orange-600 text-white border-orange-600' : 'bg-white/5 text-gray-500 border-white/5 hover:text-white'}`}>
          <Clock size={12} /> Atrasados
        </button>
      </div>

      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[150] bg-brand-surface border border-emerald-500/30 px-6 py-3 shadow-2xl flex items-center gap-6"
          >
            <div className="flex items-center gap-3 pr-6 border-r border-brand-border">
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{selectedIds.length} Selecionados</span>
              <button onClick={() => setSelectedIds([])} className="text-gray-500 hover:text-white transition-colors"><XIcon size={14} /></button>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="group relative">
                <button className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-white transition-all">
                  Alterar Estado <ChevronDown size={12} />
                </button>
                <div className="absolute bottom-full left-0 mb-2 w-40 bg-brand-surface border border-brand-border shadow-2xl hidden group-hover:block">
                  {['Aberto', 'Em progresso', 'Resolvido', 'Fechado'].map(s => (
                    <button key={s} onClick={() => handleBatchUpdate({ estado: s })} className="w-full text-left px-4 py-2 text-[10px] text-gray-400 hover:bg-emerald-500 hover:text-white transition-all uppercase tracking-widest font-bold border-b border-brand-border last:border-0">{s}</button>
                  ))}
                </div>
              </div>

              <div className="group relative">
                <button className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-white transition-all">
                  Severidade <ChevronDown size={12} />
                </button>
                <div className="absolute bottom-full left-0 mb-2 w-40 bg-brand-surface border border-brand-border shadow-2xl hidden group-hover:block">
                  {SEVERITIES.map(s => (
                    <button key={s} onClick={() => handleBatchUpdate({ severidade: s })} className="w-full text-left px-4 py-2 text-[10px] text-gray-400 hover:bg-emerald-500 hover:text-white transition-all uppercase tracking-widest font-bold border-b border-brand-border last:border-0">{s}</button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {viewMode === 'calendar' ? <CalendarView /> : (
        <div className="bg-brand-surface rounded-none border border-brand-border overflow-hidden">
          <table className="w-full text-left">
          <thead>
            <tr className="bg-white/[0.02]">
              <th className="px-4 py-3 w-10">
                <input 
                  type="checkbox" 
                  checked={selectedIds.length === filtered.length && filtered.length > 0} 
                  onChange={toggleSelectAll}
                  className="accent-emerald-500" 
                />
              </th>
              <th className="col-header">Protocolo</th>
              <th className="col-header">Localização</th>
              <th className="col-header">Severidade</th>
              <th className="col-header">Estado</th>
              <th className="col-header">Responsável</th>
              <th className="col-header">Data</th>
              <th className="col-header">Ver</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <AlertCircle size={32} className="text-gray-600 mx-auto mb-3" />
                  <p className="text-sm font-bold text-gray-500">
                    {search || filterStatus ? 'Nenhum incidente encontrado' : 'Nenhum incidente registado'}
                  </p>
                  {!search && !filterStatus && canReportIncidents(currentUser.perfil) && (
                    <button onClick={() => setIsModalOpen(true)}
                      className="mt-3 px-4 py-2 bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-all">
                      + Reportar primeiro incidente
                    </button>
                  )}
                </td>
              </tr>
            ) : filtered.map((incident) => (
              <tr key={incident.id} className={`data-row cursor-pointer transition-all ${selectedIds.includes(incident.id) ? 'bg-emerald-500/5' : ''}`} onClick={() => onSelectIncident(incident.id)}>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <input 
                    type="checkbox" 
                    checked={selectedIds.includes(incident.id)} 
                    onChange={e => setSelectedIds(prev => prev.includes(incident.id) ? prev.filter(x => x !== incident.id) : [...prev, incident.id])}
                    className="accent-emerald-500" 
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/5 flex items-center justify-center text-[9px] font-mono font-bold text-emerald-500 border border-white/5 shrink-0">
                      #{incident.id?.toString().slice(-4).toUpperCase() || '0000'}
                    </div>
                    <div>
                      <p className="font-bold text-white text-xs">{incident.categoria}</p>
                      <p className="text-[9px] text-gray-600 truncate max-w-[120px]">{incident.descricao}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-xs text-gray-300 truncate max-w-[140px]">{incident.property_name || '—'}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${severityConfig[incident.severidade] || severityConfig['Baixo']}`}>
                    {incident.severidade}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${statusDot[incident.estado] || 'bg-gray-500'}`}></div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{incident.estado}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-gray-400">{incident.responsavel_nome || 'Não Atribuído'}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[10px] font-mono text-gray-500">{safeFormat(incident.created_at, 'dd/MM HH:mm')}</span>
                </td>
                <td className="px-4 py-3">
                  <button className="p-1.5 hover:bg-white/5 text-gray-500 hover:text-emerald-400 transition-colors">
                    <ArrowUpRight size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {/* ─── Report Incident Modal ─── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] overflow-y-auto">
            <div className="flex min-h-full items-start justify-center p-4 pt-8">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setIsModalOpen(false)} className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-brand-surface w-full max-w-2xl shadow-2xl border border-brand-border relative z-10"
              >
                {/* Modal Header */}
                <div className="p-6 bg-emerald-500 text-white flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold tracking-tight">Reportar Incidente</h2>
                    <p className="text-emerald-100 text-[10px] font-medium uppercase tracking-widest mt-0.5">Protocolo de Falha Operacional</p>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 transition-colors"><XIcon size={20} /></button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Propriedade *</label>
                      <select required value={formData.property_id} onChange={e => setFormData({ ...formData, property_id: e.target.value, asset_id: '' })}
                        className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white">
                        <option value="" className="bg-brand-surface">Selecionar Propriedade</option>
                        {properties.map(p => <option key={p.id} value={p.id} className="bg-brand-surface">{p.endereco}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ativo (Opcional)</label>
                      <select value={formData.asset_id} onChange={e => setFormData({ ...formData, asset_id: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white">
                        <option value="" className="bg-brand-surface">Selecionar Ativo</option>
                        {assets.filter(a => !formData.property_id || a.property_id === formData.property_id).map(a => (
                          <option key={a.id} value={a.id} className="bg-brand-surface">{a.nome}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Categoria</label>
                      <select value={formData.categoria} onChange={e => setFormData({ ...formData, categoria: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white">
                        {CATEGORIES.map(c => <option key={c} value={c} className="bg-brand-surface">{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Severidade</label>
                      <select value={formData.severidade} onChange={e => setFormData({ ...formData, severidade: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white">
                        {SEVERITIES.map(s => <option key={s} value={s} className="bg-brand-surface">{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Descrição *</label>
                    <textarea required rows={4} value={formData.descricao} onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                      placeholder="Descreva o incidente em detalhe: o que aconteceu, quando, onde exatamente..."
                      className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white resize-none" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Atribuir Responsável</label>
                    <select value={formData.responsavel_id} onChange={e => setFormData({ ...formData, responsavel_id: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white">
                      <option value="" className="bg-brand-surface">Selecionar Responsável (Opcional)</option>
                      {users.map(u => <option key={u.id} value={u.id} className="bg-brand-surface">{u.nome} — {u.perfil}</option>)}
                    </select>
                  </div>

                  {/* SLA preview */}
                  <div className="p-3 bg-white/5 border border-brand-border text-[10px] text-gray-400 flex items-center gap-2">
                    <Clock size={12} className="text-emerald-500 shrink-0" />
                    {formData.severidade === 'Crítico' ? 'SLA: Resposta em 1h · Resolução em 4h' :
                      formData.severidade === 'Alto' ? 'SLA: Resposta em 4h · Resolução em 24h' :
                        formData.severidade === 'Médio' ? 'SLA: Resposta em 24h · Resolução em 72h' :
                          'SLA: Resposta em 48h · Resolução em 168h'}
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setIsModalOpen(false)}
                      className="px-5 py-3 border border-brand-border text-gray-400 hover:text-white hover:border-gray-400 transition-colors font-bold text-xs uppercase tracking-widest">
                      Cancelar
                    </button>
                    <button type="submit" disabled={submitting}
                      className="flex-1 py-3 bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 uppercase tracking-widest text-xs disabled:opacity-50 flex items-center justify-center gap-2">
                      {submitting ? <><div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" /> A processar...</> : 'Submeter Protocolo'}
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
