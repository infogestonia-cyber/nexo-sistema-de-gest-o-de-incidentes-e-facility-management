import React, { useState, useEffect, useRef } from 'react';
import { ensureArray } from '../utils/safeArray';
import {
  Plus, Calendar, Settings, User, Clock, CheckCircle2, AlertCircle,
  Search, Filter, X, MoreVertical, DollarSign, Activity, Shield,
  Zap, ShieldCheck, Eye, Edit2, Trash2, Check, AlertTriangle,
  ChevronDown, FileText, Wrench, ListChecks, ShieldCheck as HistoryIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { canManageMaintenance } from '../utils/permissions';
import { Toast, ToastType } from './ui/Toast';

type MaintenanceTab = 'executions' | 'automation' | 'history';

export default function Maintenance() {
  const [plans, setPlans] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<MaintenanceTab>('executions');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAutomationModalOpen, setIsAutomationModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [user] = useState<any>(() => {
    try {
      const u = localStorage.getItem('user');
      return u && u !== 'undefined' ? JSON.parse(u) : {};
    } catch { return {}; }
  });

  const [formData, setFormData] = useState({
    asset_id: '',
    tipo: 'Preventiva',
    periodicidade: 'Mensal',
    proxima_data: format(new Date(), 'yyyy-MM-dd'),
    responsavel_id: '',
    custo_estimado: '',
    descricao: '',
  });

  const [automationFormData, setAutomationFormData] = useState({
    asset_id: '',
    task_description: '',
    frequency_days: '',
    threshold_value: '',
    categoria: 'Preventiva'
  });

  const showToast = (msg: string, type: ToastType = 'success') => {
    setToast({ msg, type });
  };

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
      const h = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
      const [execRes, schedRes, histRes, assetsRes, usersRes] = await Promise.all([
        fetch('/api/maintenance/executions', { headers: h }),
        fetch('/api/maintenance/schedules', { headers: h }),
        fetch('/api/maintenance/history', { headers: h }),
        fetch('/api/assets', { headers: h }),
        fetch('/api/users', { headers: h })
      ]);

      const execData = execRes.ok ? await execRes.json() : [];
      const schedData = schedRes.ok ? await schedRes.json() : [];
      const histData = histRes.ok ? await histRes.json() : [];
      const assetsData = assetsRes.ok ? await assetsRes.json() : [];
      const usersData = usersRes.ok ? await usersRes.json() : [];

      setPlans(Array.isArray(execData) ? execData : []);
      setSchedules(Array.isArray(schedData) ? schedData : []);
      setHistory(Array.isArray(histData) ? histData : []);
      setAssets(Array.isArray(assetsData) ? assetsData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
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
        showToast('Plano de manutenção criado com sucesso!', 'success');
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

  const handleAutomationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!automationFormData.asset_id || !automationFormData.task_description) {
      showToast('Por favor preencha Ativo e Descrição da Tarefa.', 'error');
      return;
    }
    if (!automationFormData.frequency_days && !automationFormData.threshold_value) {
      showToast('Defina pelo menos uma frequência (em dias) ou um limite de uso.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/maintenance/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...automationFormData,
          frequency_days: automationFormData.frequency_days ? parseInt(automationFormData.frequency_days) : null,
          threshold_value: automationFormData.threshold_value ? parseInt(automationFormData.threshold_value) : null
        })
      });

      if (res.ok) {
        setIsAutomationModalOpen(false);
        setAutomationFormData({ asset_id: '', task_description: '', frequency_days: '', threshold_value: '', categoria: 'Preventiva' });
        showToast('✓ Agendamento de automação criado com sucesso!');
        fetchData();
      } else {
        const err = await res.json();
        showToast(err.error || 'Erro ao criar agendamento', 'error');
      }
    } catch {
      showToast('Erro de rede ao criar agendamento.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartPlan = async (planId: string) => {
    try {
      const res = await fetch(`/api/maintenance/executions/${planId}/start`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        showToast('Plano iniciado com sucesso!');
        fetchData();
      } else {
        const err = await res.json();
        showToast(err.error || 'Erro ao iniciar plano', 'error');
      }
    } catch {
      showToast('Erro de rede ao iniciar plano.', 'error');
    }
  };

  const handleMarkComplete = async (plan: any) => {
    setOpenMenuId(null);
    showToast('Processando conclusão do plano...', 'success');
    try {
      const res = await fetch(`/api/maintenance/executions/${plan.id}/complete`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ observations: 'Concluído via interface de manutenção' })
      });
      if (res.ok) {
        await fetchData();
        showToast('✓ Plano de manutenção concluído com sucesso!', 'success');
        setSelectedPlan(null);
      } else {
        const err = await res.json();
        showToast(err.error || 'Erro ao concluir plano', 'error');
      }
    } catch (error: any) {
      showToast(`Erro ao actualizar plano: ${error.message}`, 'error');
    }
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
        showToast('Plano eliminado com sucesso!', 'success');
      }
    } catch {
      showToast('Erro ao eliminar plano.', 'error');
    }
    setOpenMenuId(null);
  };

  const filteredPlans = ensureArray<any>(plans).filter(p => {
    const matchesSearch = !searchQuery ||
      p.asset_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tipo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.periodicidade?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const planDate = new Date(p.proxima_data);
    const matchesMonth = planDate.getMonth() === selectedMonth && planDate.getFullYear() === selectedYear;
    
    return matchesSearch && matchesMonth;
  });

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-none animate-spin"></div>
      <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">A carregar Protocolos de Manutenção...</p>
    </div>
  );

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center gap-4 bg-brand-surface border border-brand-border p-1 rounded-none w-fit">
        {[
          { id: 'executions', label: 'Protocolos Ativos', icon: Activity },
          { id: 'automation', label: 'Automação & Agendamento', icon: Zap },
          { id: 'history', label: 'Histórico', icon: HistoryIcon },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as MaintenanceTab)}
            className={`px-4 py-2 flex items-center gap-2 text-xs font-bold uppercase transition-all rounded-none ${
              activeTab === tab.id 
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      <Toast message={toast?.msg || null} type={toast?.type} onClose={() => setToast(null)} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Planos Ativos', value: plans.length, icon: Settings, color: 'text-emerald-500' },
          { label: 'Preventiva', value: plans.filter(p => p.tipo === 'Preventiva').length, icon: Shield, color: 'text-blue-500' },
          { label: 'Correctiva', value: plans.filter(p => p.tipo === 'Correctiva').length, icon: Wrench, color: 'text-amber-500' },
          { label: 'Orçamento Total', value: `MT ${plans.reduce((acc, p) => acc + (p.custo_estimado || 0), 0).toLocaleString()}`, icon: DollarSign, color: 'text-purple-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-brand-surface p-4 border border-brand-border flex items-center gap-4">
            <div className={`p-2 bg-white/5 ${stat.color}`}><stat.icon size={16} /></div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{stat.label}</p>
              <p className="text-sm font-bold text-white">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-3.5 h-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Pesquisar..."
            className="pl-10 pr-4 py-2 bg-brand-surface border border-brand-border text-xs w-64"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-brand-surface border border-brand-border p-1">
            <select 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(parseInt(e.target.value))}
              className="bg-transparent text-xs text-white border-none focus:ring-0 px-2 py-1 outline-none"
            >
              {months.map((m, i) => <option key={i} value={i} className="bg-brand-surface text-white">{m}</option>)}
            </select>
            <select 
              value={selectedYear} 
              onChange={e => setSelectedYear(parseInt(e.target.value))}
              className="bg-transparent text-xs text-white border-none focus:ring-0 px-2 py-1 outline-none ml-1"
            >
              {[2024, 2025, 2026].map(y => <option key={y} value={y} className="bg-brand-surface text-white">{y}</option>)}
            </select>
          </div>

          {activeTab === 'executions' && canManageMaintenance(user.perfil) && (
            <button onClick={() => setIsModalOpen(true)} className="bg-emerald-500 text-white px-4 py-2 text-xs font-bold flex items-center gap-2">
              <Plus size={14} /> Novo Plano
            </button>
          )}
          {activeTab === 'automation' && canManageMaintenance(user.perfil) && (
            <button onClick={() => setIsAutomationModalOpen(true)} className="bg-amber-500 text-white px-4 py-2 text-xs font-bold flex items-center gap-2">
              <Zap size={14} /> Novo Agendamento
            </button>
          )}
          {activeTab === 'executions' && (
            <div className="flex bg-brand-surface border border-brand-border p-1">
              <button onClick={() => setViewMode('list')} className={`p-1.5 text-xs font-bold ${viewMode === 'list' ? 'bg-emerald-500 text-white' : 'text-gray-500'}`}><ListChecks size={14} /></button>
              <button onClick={() => setViewMode('calendar')} className={`p-1.5 text-xs font-bold ${viewMode === 'calendar' ? 'bg-emerald-500 text-white' : 'text-gray-500'}`}><Calendar size={14} /></button>
            </div>
          )}
        </div>
      </div>

      {activeTab === 'executions' && (
        viewMode === 'list' ? (
          <div className="bg-brand-surface border border-brand-border overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">Ativo</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">Frequência</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">Responsável</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">Próxima Data</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {filteredPlans.map(plan => (
                  <tr key={plan.id} className="hover:bg-white/[0.01] cursor-pointer" onClick={() => setSelectedPlan(plan)}>
                    <td className="px-4 py-3 text-xs font-bold text-white">{plan.asset_name}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 text-[9px] font-bold uppercase ${plan.tipo === 'Preventiva' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>{plan.tipo}</span></td>
                    <td className="px-4 py-3 text-[10px] text-gray-400 uppercase">{plan.periodicidade}</td>
                    <td className="px-4 py-3 text-xs text-gray-300">{plan.responsavel_nome}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-xs font-mono text-white">{plan.proxima_data}</span>
                        <span className="text-[9px] text-gray-500 uppercase tracking-tighter">
                          {Math.ceil((new Date(plan.proxima_data).getTime() - new Date().getTime()) / (1000 * 3600 * 24)) <= 0 ? (
                            <span className="text-red-500 font-bold">Vencido</span>
                          ) : (
                            `Faltam ${Math.ceil((new Date(plan.proxima_data).getTime() - new Date().getTime()) / (1000 * 3600 * 24))} ${Math.ceil((new Date(plan.proxima_data).getTime() - new Date().getTime()) / (1000 * 3600 * 24)) === 1 ? 'dia' : 'dias'}`
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === plan.id ? null : plan.id); }} className="p-1 text-gray-500 hover:text-white"><MoreVertical size={14} /></button>
                      {openMenuId === plan.id && (
                        <div className="absolute right-0 mt-2 w-40 bg-brand-surface border border-brand-border shadow-xl z-50">
                          <button onClick={() => handleMarkComplete(plan)} className="w-full text-left px-4 py-2 text-xs hover:bg-white/5 flex items-center gap-2"><Check size={12} /> Concluir</button>
                          <button onClick={() => handleDelete(plan.id)} className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-white/5 flex items-center gap-2"><Trash2 size={12} /> Eliminar</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="p-2 bg-white/[0.02] border border-brand-border text-[10px] font-bold text-gray-500 uppercase text-center">{day}</div>
            ))}
            {(() => {
              const monthStart = startOfMonth(new Date(selectedYear, selectedMonth));
              const monthEnd = endOfMonth(monthStart);
              const startDate = startOfWeek(monthStart);
              const endDate = endOfWeek(monthEnd);
              const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

              return calendarDays.map((day, i) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const dayPlans = filteredPlans.filter(p => p.proxima_data === dayStr);
                const isCurrentMonth = isSameMonth(day, monthStart);

                return (
                  <div key={i} className={`bg-brand-surface border border-brand-border p-1 min-h-[80px] ${!isCurrentMonth ? 'opacity-20' : ''}`}>
                    <p className={`text-[9px] font-bold mb-1 ${isSameDay(day, new Date()) ? 'text-emerald-500' : 'text-gray-500'}`}>{format(day, 'd')}</p>
                    <div className="space-y-1">
                      {dayPlans.map(p => (
                        <div key={p.id} onClick={() => setSelectedPlan(p)} className={`p-1 border cursor-pointer hover:brightness-125 transition-all ${p.tipo === 'Preventiva' ? 'bg-emerald-500/20 border-emerald-500/40 text-white' : 'bg-red-500/20 border-red-500/40 text-white'}`}>
                          <p className="text-[8px] font-bold leading-tight truncate drop-shadow-md">{p.asset_name}</p>
                          <p className="text-[7px] opacity-80 truncate uppercase tracking-tighter">{p.responsavel_nome}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )
      )}

      {activeTab === 'automation' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-brand-surface border border-brand-border divide-y divide-brand-border">
            <div className="p-4 bg-white/[0.02] border-b border-brand-border flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2"><Zap size={14} className="text-amber-500" /> Agendamentos Inteligentes</h3>
            </div>
            {schedules.length === 0 ? (
              <div className="p-12 text-center text-gray-500 text-xs italic">Nenhum agendamento ativo.</div>
            ) : schedules.map(s => (
              <div key={s.id} className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">{s.task_description}</h4>
                  <p className="text-[10px] text-gray-500 tracking-wider">ATIVO: {s.assets?.nome} • FREQ: {s.frequency_days ? `${s.frequency_days} dias` : `Limite ${s.threshold_value}`}</p>
                </div>
                <span className="px-2 py-1 bg-amber-500/10 text-amber-500 text-[9px] font-bold uppercase">Ativo</span>
              </div>
            ))}
          </div>
          <div className="bg-brand-surface border border-brand-border p-6 space-y-4">
             <h3 className="text-xs font-bold text-white uppercase tracking-widest">Motor de Automação</h3>
             <p className="text-[11px] text-gray-400 leading-relaxed italic">Verifica gatilhos de manutenção em tempo real.</p>
             <div className="p-4 bg-brand-surface/50 border border-brand-border">
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2"><Activity size={12} /> Sincronizado</p>
                <p className="text-xs text-white mt-1">Status: Operacional</p>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-brand-surface border border-brand-border overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">Ativo</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">Tipo</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">Concluído</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">Responsável</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {history.map(h => (
                <tr key={h.id} className="hover:bg-white/[0.01]">
                  <td className="px-4 py-3 text-xs font-bold text-white">{h.assets?.nome}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 bg-gray-500/10 text-gray-400 text-[9px] font-bold uppercase">{h.tipo}</span></td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-300">{h.data_conclusao ? format(new Date(h.data_conclusao), 'dd/MM/yyyy') : '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{h.profiles?.nome}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-brand-surface w-full max-w-lg border border-brand-border relative z-10 shadow-2xl">
              <div className="p-6 bg-emerald-500 text-white flex justify-between items-center">
                <h2 className="font-bold">Novo Plano de Manutenção</h2>
                <X size={20} className="cursor-pointer" onClick={() => setIsModalOpen(false)} />
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ativo</label>
                  <select required value={formData.asset_id} onChange={e => setFormData({...formData, asset_id: e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-brand-border text-xs text-white">
                    <option value="">Selecionar Ativo...</option>
                    {assets.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tipo</label>
                    <select value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-brand-border text-xs text-white">
                      <option value="Preventiva">Preventiva</option>
                      <option value="Correctiva">Correctiva</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Frequência</label>
                    <select value={formData.periodicidade} onChange={e => setFormData({...formData, periodicidade: e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-brand-border text-xs text-white">
                      <option value="Única">Única</option>
                      <option value="Semanal">Semanal</option>
                      <option value="Mensal">Mensal</option>
                      <option value="Trimestral">Trimestral</option>
                      <option value="Semestral">Semestral</option>
                      <option value="Anual">Anual</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Data</label>
                    <input type="date" value={formData.proxima_data} onChange={e => setFormData({...formData, proxima_data: e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-brand-border text-xs text-white" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Responsável *</label>
                  <select required value={formData.responsavel_id} onChange={e => setFormData({...formData, responsavel_id: e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-brand-border text-xs text-white">
                    <option value="">Selecionar Responsável...</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.nome} ({u.perfil})</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Descrição / Observações</label>
                  <textarea rows={3} value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})} placeholder="Instruções para o técnico..." className="w-full px-4 py-3 bg-white/5 border border-brand-border text-xs text-white resize-none" />
                </div>
                <button type="submit" disabled={submitting} className="w-full py-4 bg-emerald-500 text-white font-bold uppercase tracking-widest text-xs">Confirmar Plano</button>
              </form>
            </motion.div>
          </div>
        )}

        {isAutomationModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAutomationModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-brand-surface w-full max-w-lg border border-brand-border relative z-10 shadow-2xl">
              <div className="p-6 bg-amber-500 text-white flex justify-between items-center">
                <h2 className="font-bold">Nova Automação</h2>
                <X size={20} className="cursor-pointer" onClick={() => setIsAutomationModalOpen(false)} />
              </div>
              <form onSubmit={handleAutomationSubmit} className="p-8 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ativo Alvo</label>
                  <select required value={automationFormData.asset_id} onChange={e => setAutomationFormData({...automationFormData, asset_id: e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-brand-border text-xs text-white">
                    <option value="">Selecionar Ativo...</option>
                    {assets.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tarefa</label>
                  <input type="text" required value={automationFormData.task_description} onChange={e => setAutomationFormData({...automationFormData, task_description: e.target.value})} placeholder="ex: Troca de Óleo" className="w-full px-4 py-3 bg-white/5 border border-brand-border text-xs text-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Freq. (Dias)</label>
                    <input type="number" value={automationFormData.frequency_days} onChange={e => setAutomationFormData({...automationFormData, frequency_days: e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-brand-border text-xs text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Limite Uso</label>
                    <input type="number" value={automationFormData.threshold_value} onChange={e => setAutomationFormData({...automationFormData, threshold_value: e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-brand-border text-xs text-white" />
                  </div>
                </div>
                <button type="submit" disabled={submitting} className="w-full py-4 bg-amber-500 text-white font-bold uppercase tracking-widest text-xs">Ativar Automação</button>
              </form>
            </motion.div>
          </div>
        )}

        {selectedPlan && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedPlan(null)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-brand-surface w-full max-w-md border border-brand-border relative z-10 p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-white uppercase tracking-tight">Detalhes do Protocolo</h3>
                <X size={18} className="text-gray-500 cursor-pointer" onClick={() => setSelectedPlan(null)} />
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-white/5 border border-brand-border">
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Ativo</p>
                  <p className="text-sm font-bold text-white">{selectedPlan.asset_name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 bg-white/5 border border-brand-border">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Tipo</p>
                    <p className="text-sm font-bold text-white">{selectedPlan.tipo}</p>
                  </div>
                  <div className="p-4 bg-white/5 border border-brand-border">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Data</p>
                    <p className="text-sm font-bold text-white">{selectedPlan.proxima_data}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 border border-brand-border">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Periodicidade</p>
                    <p className="text-sm font-bold text-white">{selectedPlan.periodicidade}</p>
                  </div>
                  <div className="p-4 bg-white/5 border border-brand-border">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Responsável</p>
                    <p className="text-xs font-bold text-emerald-500">{selectedPlan.responsavel_nome}</p>
                  </div>
                </div>
                <div className="p-4 bg-white/5 border border-brand-border">
                   <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Observações / Instruções</p>
                   <p className="text-xs text-gray-400 leading-relaxed italic">{selectedPlan.descricao || 'Nenhuma instrução adicional.'}</p>
                </div>
              </div>
              <div className="mt-8 flex gap-3">
                <button onClick={() => handleMarkComplete(selectedPlan)} className="flex-1 py-3 bg-emerald-500 text-white font-bold text-xs uppercase">Concluir Agora</button>
                <button onClick={() => setSelectedPlan(null)} className="flex-1 py-3 border border-brand-border text-gray-400 text-xs uppercase">Fechar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
