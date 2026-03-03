import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Calendar, Settings, User, Clock, CheckCircle2, AlertCircle,
  Search, Filter, X, MoreVertical, DollarSign, Activity, Shield,
  Zap, ShieldCheck, Eye, Edit2, Trash2, Check, AlertTriangle,
  ChevronDown, FileText, Wrench
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { canManageMaintenance } from '../utils/permissions';

export default function Maintenance() {
  const [plans, setPlans] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [formData, setFormData] = useState({
    asset_id: '',
    tipo: 'Preventiva',
    periodicidade: 'Mensal',
    proxima_data: format(new Date(), 'yyyy-MM-dd'),
    responsavel_id: '',
    custo_estimado: '',
    descricao: '',
  });

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [plansRes, assetsRes, usersRes] = await Promise.all([
        fetch('/api/maintenance-plans', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
        fetch('/api/assets', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
        fetch('/api/users', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
      ]);

      if (!plansRes.ok || !assetsRes.ok || !usersRes.ok) throw new Error('Falha ao carregar dados');

      const [plansData, assetsData, usersData] = await Promise.all([
        plansRes.json(), assetsRes.json(), usersRes.json()
      ]);

      setPlans(plansData);
      setAssets(assetsData);
      setUsers(usersData);
    } catch (err) {
      console.error('Erro ao carregar dados de manutenção:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.asset_id || !formData.responsavel_id) {
      showToast('Selecione um Ativo e um Responsável.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/maintenance-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
        setFormData({ asset_id: '', tipo: 'Preventiva', periodicidade: 'Mensal', proxima_data: format(new Date(), 'yyyy-MM-dd'), responsavel_id: '', custo_estimado: '', descricao: '' });
        showToast('✅ Plano de manutenção criado com sucesso!');
      } else {
        const err = await res.json();
        showToast(err.error || 'Erro ao criar plano', 'error');
      }
    } catch {
      showToast('Erro de rede ao criar plano.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkComplete = async (plan: any) => {
    try {
      const res = await fetch(`/api/maintenance-plans/${plan.id}/complete`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        fetchData();
        showToast('✅ Plano marcado como concluído!');
      }
    } catch {
      showToast('Erro ao actualizar plano.', 'error');
    }
    setOpenMenuId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem a certeza que deseja eliminar este plano?')) return;
    try {
      const res = await fetch(`/api/maintenance-plans/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setPlans(prev => prev.filter(p => p.id !== id));
        showToast('✅ Plano eliminado.');
      }
    } catch {
      showToast('Erro ao eliminar plano.', 'error');
    }
    setOpenMenuId(null);
  };

  const filteredPlans = plans.filter(p =>
    !searchQuery ||
    p.asset_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.tipo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.periodicidade?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">A carregar Protocolos de Manutenção...</p>
    </div>
  );

  return (
    <div className="space-y-6 page-enter">

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`fixed top-4 right-4 z-[200] px-5 py-3 text-sm font-bold text-white shadow-2xl border ${toast.type === 'error' ? 'bg-red-900 border-red-500/30' : 'bg-brand-surface border-brand-border'
              }`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Planos Ativos', value: plans.length, icon: Settings, color: 'text-emerald-500' },
          { label: 'Preventiva', value: plans.filter(p => p.tipo === 'Preventiva').length, icon: Shield, color: 'text-blue-500' },
          { label: 'Correctiva', value: plans.filter(p => p.tipo === 'Correctiva').length, icon: Wrench, color: 'text-amber-500' },
          { label: 'Orçamento Total', value: `MT ${plans.reduce((acc, p) => acc + (p.custo_estimado || 0), 0).toLocaleString()}`, icon: DollarSign, color: 'text-purple-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-brand-surface p-4 rounded-none border border-brand-border flex items-center gap-4">
            <div className={`p-2 rounded-xl bg-white/5 ${stat.color}`}>
              <stat.icon size={16} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{stat.label}</p>
              <p className="text-sm font-bold text-white">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-3.5 h-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Pesquisar planos..."
              className="pl-10 pr-4 py-2 bg-brand-surface border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-64 text-xs"
            />
          </div>
        </div>
        {canManageMaintenance(user.perfil) && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-500 text-white px-6 py-2 rounded-none font-bold hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 text-xs"
          >
            <Plus size={16} />
            Novo Plano
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-brand-surface rounded-none border border-brand-border overflow-visible">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/[0.02]">
              <th className="col-header">Ativo</th>
              <th className="col-header">Tipo</th>
              <th className="col-header">Frequência</th>
              <th className="col-header">Próxima Data</th>
              <th className="col-header">Responsável</th>
              <th className="col-header">Orçamento</th>
              <th className="col-header">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {filteredPlans.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <Settings size={28} className="text-gray-600 mx-auto mb-3" />
                  <p className="text-sm font-bold text-gray-500">Nenhum plano de manutenção encontrado</p>
                  {searchQuery && <p className="text-xs text-gray-600 mt-1">Tente limpar o filtro de pesquisa</p>}
                </td>
              </tr>
            ) : filteredPlans.map((plan) => (
              <tr
                key={plan.id}
                className="data-row cursor-pointer"
                onClick={() => setSelectedPlan(plan)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-none bg-white/5 flex items-center justify-center text-emerald-500 border border-white/5">
                      <Activity size={14} />
                    </div>
                    <span className="font-bold text-white text-xs">{plan.asset_name || '—'}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-none text-[9px] font-bold uppercase tracking-wider ${plan.tipo === 'Preventiva'
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      : 'bg-red-500/10 text-red-500 border border-red-500/20'
                    }`}>
                    {plan.tipo}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{plan.periodicidade}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 text-white font-mono text-[11px]">
                    <Calendar size={12} className="text-gray-500" />
                    {plan.proxima_data}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[8px] font-bold text-emerald-400 border border-emerald-500/20">
                      {plan.responsavel_nome?.charAt(0) || 'A'}
                    </div>
                    <span className="text-xs text-gray-300">{plan.responsavel_nome || 'Administrador'}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[11px] font-mono font-bold text-white">MT {plan.custo_estimado?.toLocaleString() || '0'}</span>
                </td>
                {/* Actions 3-dot */}
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <div className="relative" ref={openMenuId === plan.id ? menuRef : null}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === plan.id ? null : plan.id);
                      }}
                      className="p-1.5 hover:bg-white/10 rounded-none text-gray-400 hover:text-white transition-colors"
                    >
                      <MoreVertical size={14} />
                    </button>

                    <AnimatePresence>
                      {openMenuId === plan.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -5 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -5 }}
                          className="absolute right-0 top-8 z-[150] bg-[#141414] border border-brand-border shadow-2xl w-48 overflow-hidden"
                        >
                          <button
                            onClick={() => { setSelectedPlan(plan); setOpenMenuId(null); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-xs text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                          >
                            <Eye size={13} className="text-blue-400" />
                            Ver Detalhes
                          </button>
                          <button
                            onClick={() => handleMarkComplete(plan)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-xs text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                          >
                            <Check size={13} className="text-emerald-400" />
                            Marcar Concluído
                          </button>
                          <div className="border-t border-brand-border" />
                          <button
                            onClick={() => handleDelete(plan.id)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-xs text-red-400 hover:bg-red-500/5 transition-colors"
                          >
                            <Trash2 size={13} />
                            Eliminar Plano
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Plan Detail Modal */}
      <AnimatePresence>
        {selectedPlan && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPlan(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-brand-surface w-full max-w-lg shadow-2xl border border-brand-border relative z-10 flex flex-col max-h-[90vh]"
            >
              {/* Detail Header */}
              <div className={`p-5 flex items-center justify-between shrink-0 border-b border-brand-border ${selectedPlan.tipo === 'Preventiva' ? 'bg-emerald-900/20' : 'bg-red-900/20'
                }`}>
                <div>
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 border ${selectedPlan.tipo === 'Preventiva'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                    {selectedPlan.tipo}
                  </span>
                  <p className="text-white font-bold mt-2 text-base">{selectedPlan.asset_name || 'Ativo não associado'}</p>
                  <p className="text-gray-400 text-[10px] mt-0.5">Plano #{selectedPlan.id?.toString().slice(0, 8)}</p>
                </div>
                <button
                  onClick={() => setSelectedPlan(null)}
                  className="p-2 hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Detail Body */}
              <div className="overflow-y-auto flex-1 p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Frequência', value: selectedPlan.periodicidade, icon: Clock },
                    { label: 'Próxima Execução', value: selectedPlan.proxima_data, icon: Calendar },
                    { label: 'Responsável', value: selectedPlan.responsavel_nome || 'Administrador', icon: User },
                    { label: 'Orçamento Estimado', value: `MT ${(selectedPlan.custo_estimado || 0).toLocaleString()}`, icon: DollarSign },
                  ].map((item, i) => (
                    <div key={i} className="p-4 bg-white/5 border border-brand-border">
                      <div className="flex items-center gap-2 mb-1">
                        <item.icon size={12} className="text-gray-500" />
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{item.label}</p>
                      </div>
                      <p className="text-xs font-bold text-white">{item.value}</p>
                    </div>
                  ))}
                </div>

                {selectedPlan.descricao && (
                  <div className="p-4 bg-white/5 border border-brand-border">
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <FileText size={11} /> Descrição / Acção
                    </p>
                    <p className="text-xs text-gray-300 leading-relaxed">{selectedPlan.descricao}</p>
                  </div>
                )}

                <div className="p-4 bg-white/[0.02] border border-brand-border">
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Próximas Acções Recomendadas</p>
                  <ul className="space-y-1.5">
                    <li className="flex items-center gap-2 text-[10px] text-gray-400">
                      <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
                      Agendar data de execução com o responsável
                    </li>
                    <li className="flex items-center gap-2 text-[10px] text-gray-400">
                      <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
                      Verificar disponibilidade de materiais e ferramentas
                    </li>
                    <li className="flex items-center gap-2 text-[10px] text-gray-400">
                      <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
                      Documentar resultado após conclusão
                    </li>
                  </ul>
                </div>
              </div>

              {/* Detail Footer */}
              <div className="p-4 border-t border-brand-border flex gap-3 shrink-0 bg-brand-surface">
                <button
                  onClick={() => setSelectedPlan(null)}
                  className="flex-1 py-2.5 border border-brand-border text-gray-400 hover:text-white hover:border-gray-400 transition-colors font-bold text-xs uppercase tracking-widest"
                >
                  Fechar
                </button>
                <button
                  onClick={() => handleMarkComplete(selectedPlan)}
                  className="flex-1 py-2.5 bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <Check size={13} />
                  Marcar Concluído
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Plan Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
              {/* Modal Header */}
              <div className="p-6 bg-emerald-500 text-white flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-lg font-bold tracking-tight">Novo Plano de Manutenção</h2>
                  <p className="text-emerald-100 text-[10px] font-medium uppercase tracking-widest mt-0.5">Protocolo de Longevidade de Ativos</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-none transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable Form */}
              <div className="overflow-y-auto flex-1 p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Seleção de Ativo *</label>
                    <select
                      required
                      value={formData.asset_id}
                      onChange={(e) => setFormData({ ...formData, asset_id: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
                    >
                      <option value="" className="bg-brand-surface">Selecionar Ativo</option>
                      {assets.map(a => <option key={a.id} value={a.id} className="bg-brand-surface">{a.nome} ({a.property_name})</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Pessoal Responsável *</label>
                    <select
                      required
                      value={formData.responsavel_id}
                      onChange={(e) => setFormData({ ...formData, responsavel_id: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
                    >
                      <option value="" className="bg-brand-surface">Selecionar Responsável</option>
                      {users.map(u => <option key={u.id} value={u.id} className="bg-brand-surface">{u.nome}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Tipo de Plano</label>
                    <select
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
                    >
                      <option value="Preventiva" className="bg-brand-surface">Preventiva</option>
                      <option value="Correctiva" className="bg-brand-surface">Correctiva</option>
                      <option value="Preditiva" className="bg-brand-surface">Preditiva</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Frequência</label>
                    <select
                      value={formData.periodicidade}
                      onChange={(e) => setFormData({ ...formData, periodicidade: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
                    >
                      {['Semanal', 'Mensal', 'Trimestral', 'Semestral', 'Anual'].map(p => (
                        <option key={p} value={p} className="bg-brand-surface">{p}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Próxima Execução</label>
                    <input
                      type="date"
                      required
                      value={formData.proxima_data}
                      onChange={(e) => setFormData({ ...formData, proxima_data: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Orçamento Estimado (MT)</label>
                    <input
                      type="number"
                      value={formData.custo_estimado}
                      onChange={(e) => setFormData({ ...formData, custo_estimado: e.target.value })}
                      placeholder="ex: 1500"
                      className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Descrição / Acção</label>
                    <textarea
                      rows={3}
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      placeholder="Descreva a acção de manutenção a realizar..."
                      className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white resize-none placeholder-gray-600"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-brand-border flex gap-3 shrink-0 bg-brand-surface">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 border border-brand-border text-gray-400 hover:text-white hover:border-gray-400 transition-colors font-bold text-xs uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 py-3 bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 uppercase tracking-widest text-xs disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <><div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" /> A processar...</>
                  ) : 'Confirmar Plano'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
