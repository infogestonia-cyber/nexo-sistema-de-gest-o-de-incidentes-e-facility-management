import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Settings, User, Clock, CheckCircle2, AlertCircle, Search, Filter, X, MoreVertical, DollarSign, Activity, Shield, Zap, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { canManageMaintenance } from '../utils/permissions';

export default function Maintenance() {
  const [plans, setPlans] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [formData, setFormData] = useState({
    asset_id: '',
    tipo: 'Preventiva',
    periodicidade: 'Mensal',
    proxima_data: format(new Date(), 'yyyy-MM-dd'),
    responsavel_id: '',
    custo_estimado: ''
  });

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
      
      if (!plansRes.ok || !assetsRes.ok || !usersRes.ok) {
        throw new Error('Falha ao carregar dados');
      }

      const [plansData, assetsData, usersData] = await Promise.all([
        plansRes.json(),
        assetsRes.json(),
        usersRes.json()
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
    console.log('handleSubmit triggered');
    
    if (!formData.asset_id || !formData.responsavel_id) {
      alert('Por favor, selecione um Ativo e um Responsável.');
      return;
    }

    console.log('Submitting maintenance plan:', formData);
    setSubmitting(true);
    try {
      const res = await fetch('/api/maintenance-plans', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      
      console.log('Response status:', res.status);
      
      if (res.ok) {
        alert('Plano de manutenção criado com sucesso!');
        setIsModalOpen(false);
        fetchData();
        setFormData({ asset_id: '', tipo: 'Preventiva', periodicidade: 'Mensal', proxima_data: format(new Date(), 'yyyy-MM-dd'), responsavel_id: '', custo_estimado: '' });
      } else {
        const errorData = await res.json();
        console.error('Server error:', errorData);
        alert(errorData.error || 'Erro ao criar plano de manutenção');
      }
    } catch (err) {
      console.error('Network error:', err);
      alert('Erro de rede ao tentar criar o plano');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">A carregar Protocolos de Manutenção...</p>
    </div>
  );

  return (
    <div className="space-y-6 page-enter">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Planos Ativos', value: plans.length, icon: Settings, color: 'text-emerald-500' },
          { label: 'Preventiva', value: plans.filter(p => p.tipo === 'Preventiva').length, icon: Shield, color: 'text-blue-500' },
          { label: 'Próximos', value: plans.length, icon: Clock, color: 'text-amber-500' },
          { label: 'Orçamento Total', value: `MT ${plans.reduce((acc, p) => acc + (p.custo_estimado || 0), 0).toLocaleString()}`, icon: DollarSign, color: 'text-purple-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-brand-surface p-4 rounded-2xl border border-brand-border flex items-center gap-4">
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
              placeholder="Pesquisar planos..." 
              className="pl-10 pr-4 py-2 bg-brand-surface border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-64 text-xs"
            />
          </div>
          <button className="p-2 bg-brand-surface border border-brand-border rounded-xl hover:bg-white/5 transition-colors text-gray-400 flex items-center gap-2 px-4">
            <Filter size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Filtros</span>
          </button>
        </div>
        {canManageMaintenance(user.perfil) && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 text-xs"
          >
            <Plus size={16} />
            Novo Plano
          </button>
        )}
      </div>

      <div className="bg-brand-surface rounded-[24px] border border-brand-border overflow-hidden">
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
            {plans.map((plan) => (
              <tr key={plan.id} className="data-row">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-emerald-500 border border-white/5">
                      <Activity size={14} />
                    </div>
                    <span className="font-bold text-white text-xs">{plan.asset_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                    plan.tipo === 'Preventiva' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
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
                    <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[8px] font-bold text-gray-400 border border-white/5">
                      {plan.responsavel_nome?.charAt(0) || '?'}
                    </div>
                    <span className="text-xs text-gray-300">{plan.responsavel_nome}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[11px] font-mono font-bold text-white">MT {plan.custo_estimado?.toLocaleString()}</span>
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
                  <h2 className="text-lg font-bold tracking-tight">Novo Plano de Manutenção</h2>
                  <p className="text-emerald-100 text-[10px] font-medium uppercase tracking-widest">Protocolo de Longevidade de Ativos</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Seleção de Ativo</label>
                    <select 
                      required
                      value={formData.asset_id}
                      onChange={(e) => setFormData({...formData, asset_id: e.target.value})}
                      className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
                    >
                      <option value="" className="bg-brand-surface">Selecionar Ativo</option>
                      {assets.map(a => <option key={a.id} value={a.id} className="bg-brand-surface">{a.nome} ({a.property_name})</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Pessoal Responsável</label>
                    <select 
                      required
                      value={formData.responsavel_id}
                      onChange={(e) => setFormData({...formData, responsavel_id: e.target.value})}
                      className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
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
                      onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                      className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
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
                      onChange={(e) => setFormData({...formData, periodicidade: e.target.value})}
                      className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
                    >
                      <option value="Semanal" className="bg-brand-surface">Semanal</option>
                      <option value="Mensal" className="bg-brand-surface">Mensal</option>
                      <option value="Trimestral" className="bg-brand-surface">Trimestral</option>
                      <option value="Semestral" className="bg-brand-surface">Semestral</option>
                      <option value="Anual" className="bg-brand-surface">Anual</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Próxima Execução</label>
                    <input 
                      type="date" 
                      required
                      value={formData.proxima_data}
                      onChange={(e) => setFormData({...formData, proxima_data: e.target.value})}
                      className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Orçamento Estimado (MT)</label>
                  <input 
                    type="number" 
                    required
                    value={formData.custo_estimado}
                    onChange={(e) => setFormData({...formData, custo_estimado: e.target.value})}
                    placeholder="ex: 1500"
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
                  ) : 'Confirmar Plano'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
