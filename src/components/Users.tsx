import React, { useState, useEffect } from 'react';
import { Plus, User, X, MoreVertical, CheckCircle2, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { canManageUsers } from '../utils/permissions';
import { Toast, ToastType } from './ui/Toast';

const ROLE_CAPABILITIES = [
  {
    role: 'Administrador',
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    dot: 'bg-purple-500',
    capabilities: ['Gerir utilizadores', 'Criar/editar propriedades', 'Criar/editar ativos', 'Reportar incidentes', 'Gerir manutenção', 'Ver relatórios', 'Acesso total ao sistema'],
  },
  {
    role: 'Gestor',
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    dot: 'bg-blue-500',
    capabilities: ['Criar/editar propriedades', 'Criar/editar ativos', 'Reportar/gerir incidentes', 'Gerir manutenção', 'Ver relatórios', 'Registar inspecções'],
  },
  {
    role: 'Técnico',
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    dot: 'bg-amber-500',
    capabilities: ['Reportar incidentes', 'Actualizar estado de incidentes', 'Registar inspecções manuais', 'Ver planos de manutenção'],
  },
  {
    role: 'Cliente',
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    dot: 'bg-emerald-500',
    capabilities: ['Aceder ao Portal do Cliente', 'Validar ordens de trabalho', 'Ver gastos e orçamentos', 'Reportar novos incidentes'],
  },
  {
    role: 'Visualizador',
    color: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
    dot: 'bg-gray-500',
    capabilities: ['Ver dashboard', 'Ver propriedades e ativos', 'Ver incidentes (leitura)', 'Ver planos de manutenção'],
  },
];

export default function Users() {
  const [users, setUsers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
  const [currentUser] = useState<any>(() => {
    try {
      const u = localStorage.getItem('user');
      return u && u !== 'undefined' ? JSON.parse(u) : {};
    } catch { return {}; }
  });
  const [formData, setFormData] = useState({
    id: '',
    nome: '',
    email: '',
    password: '',
    perfil: 'Visualizador',
    codigo: '',
    pin: '',
    contrato: 'Standard',
    orcamento_mensal: '',
    property_id: '',
    asset_id: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const showToast = (msg: string, type: ToastType = 'success') => {
    setToast({ msg, type });
  };

  useEffect(() => { 
    fetchUsers(); 
    fetchMetadata();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      if (!res.ok) throw new Error('Falha ao carregar utilizadores');
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [pRes, aRes] = await Promise.all([
        fetch('/api/properties', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        fetch('/api/assets', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      ]);
      if (pRes.ok) setProperties(await pRes.json());
      if (aRes.ok) setAssets(await aRes.json());
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (user: any) => {
    if (!window.confirm(`Tem a certeza que deseja eliminar ${user.nome}?`)) return;
    try {
      const url = user.type === 'client' ? `/api/clientes/${user.id}` : `/api/users/${user.id}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        showToast('Eliminado com sucesso');
        fetchUsers();
      } else {
        const err = await res.json();
        showToast(err.error || 'Erro ao eliminar', 'error');
      }
    } catch (e) { showToast('Erro de rede', 'error'); }
  };

  const handleToggleStatus = async (user: any) => {
    try {
      if (user.type === 'client') return; // Clientes não têm estado por agora
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ estado: user.estado === 'Ativo' ? 'Inativo' : 'Ativo' }),
      });
      if (res.ok) {
        showToast(`Utilizador ${user.estado === 'Ativo' ? 'desativado' : 'ativado'}`);
        fetchUsers();
      }
    } catch (e) { showToast('Erro ao alterar estado', 'error'); }
  };

  const handleResetPassword = async (user: any) => {
    const newPass = window.prompt(`Defina a nova senha temporária para ${user.nome}:`, 'Nexo@2025');
    if (!newPass) return;
    try {
      const res = await fetch(`/api/users/${user.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ newPassword: newPass }),
      });
      if (res.ok) showToast('Senha resetada com sucesso');
      else showToast('Erro ao resetar senha', 'error');
    } catch (e) { showToast('Erro de rede', 'error'); }
  };

  const handleEdit = (u: any) => {
    setEditingId(u.id);
    setFormData({
      id: u.id,
      nome: u.nome || '',
      email: u.email || '',
      password: '', // Não editamos senha aqui
      perfil: u.perfil || 'Visualizador',
      codigo: u.email || '', // No caso de clientes, email guarda o código
      pin: '',
      contrato: u.details?.contrato || 'Standard',
      orcamento_mensal: u.details?.orcamento?.toString() || '',
      property_id: u.property_id || '',
      asset_id: u.asset_id || ''
    });
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const method = editingId ? 'PATCH' : 'POST';
      const url = editingId 
        ? (formData.perfil === 'Cliente' ? `/api/clientes/${editingId}` : `/api/users/${editingId}`)
        : '/api/users';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setEditingId(null);
        fetchUsers();
        setFormData({
          id: '', nome: '', email: '', password: '', perfil: 'Visualizador',
          codigo: '', pin: '', contrato: 'Standard', orcamento_mensal: '',
          property_id: '', asset_id: ''
        });
        showToast(`Sucesso: Registo guardado!`, 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Erro ao processar pedido.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-none animate-spin"></div>
      <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">A carregar utilizadores...</p>
    </div>
  );

  return (
    <div className="space-y-6 page-enter">
      {/* Modern Premium Toast */}
      <Toast
        message={toast?.msg || null}
        type={toast?.type}
        onClose={() => setToast(null)}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/5">
          <ShieldCheck size={12} className="text-emerald-500" />
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Controlo de Acesso — {users.length} acessos configurados</span>
        </div>
        {canManageUsers(currentUser.perfil) && (
          <button onClick={() => setIsModalOpen(true)}
            className="bg-emerald-500 text-white px-6 py-2 rounded-none font-bold hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 text-xs">
            <Plus size={16} /> Adicionar Acesso
          </button>
        )}
      </div>

      {/* Role Reference Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {ROLE_CAPABILITIES.map(r => (
          <div key={r.role} className="bg-brand-surface border border-brand-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2 h-2 rounded-none ${r.dot}`} />
              <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest border ${r.color}`}>{r.role}</span>
            </div>
            <ul className="space-y-1.5">
              {r.capabilities.map(cap => (
                <li key={cap} className="flex items-center gap-2 text-[10px] text-gray-400">
                  <CheckCircle2 size={10} className="text-emerald-500 shrink-0" /> {cap}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div className="bg-brand-surface rounded-none border border-brand-border overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/[0.02]">
              <th className="col-header">Utilizador / Cliente</th>
              <th className="col-header">Perfil / Código</th>
              <th className="col-header">Tipo</th>
              <th className="col-header">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center">
                  <User size={28} className="text-gray-600 mx-auto mb-3" />
                  <p className="text-sm font-bold text-gray-500">Nenhum acesso encontrado</p>
                </td>
              </tr>
            ) : users.map(u => {
              const roleInfo = ROLE_CAPABILITIES.find(r => r.role === u.perfil) || ROLE_CAPABILITIES[ROLE_CAPABILITIES.length - 1];
              const isClient = u.type === 'client';

              return (
                <tr key={u.id} className="data-row">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 ${isClient ? 'bg-emerald-500/10 text-emerald-500' : 'bg-white/5 text-blue-500'} flex items-center justify-center text-[11px] font-bold border border-white/5`}>
                        {u.nome?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="font-bold text-white text-xs">{u.nome}</p>
                        <p className="text-[10px] text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${roleInfo.color}`}>{u.perfil}</span>
                      {isClient && u.details?.contrato && (
                        <p className="text-[9px] text-gray-500 font-medium uppercase tracking-widest">{u.details.contrato}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-none ${isClient ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-blue-500'}`}></div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{isClient ? 'Cliente' : 'Staff'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 relative">
                    <button 
                      onClick={() => setActiveMenuId(activeMenuId === u.id ? null : u.id)}
                      className={`p-1.5 hover:bg-white/5 transition-colors ${activeMenuId === u.id ? 'text-emerald-500 bg-white/5' : 'text-gray-500'}`}
                    >
                      <MoreVertical size={14} />
                    </button>

                    <AnimatePresence>
                      {activeMenuId === u.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: -10 }} 
                            animate={{ opacity: 1, scale: 1, y: 0 }} 
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            className="absolute right-4 mt-1 w-40 bg-brand-surface border border-brand-border shadow-xl z-20 py-1"
                          >
                            <button onClick={() => handleEdit(u)} className="w-full text-left px-4 py-2 text-[10px] font-bold text-gray-300 hover:bg-white/5 flex items-center gap-2 uppercase tracking-widest">
                              Editar
                            </button>
                            {!isClient && (
                              <>
                                <button onClick={() => handleToggleStatus(u)} className="w-full text-left px-4 py-2 text-[10px] font-bold text-gray-300 hover:bg-white/5 flex items-center gap-2 uppercase tracking-widest">
                                  {u.estado === 'Ativo' ? 'Desativar' : 'Ativar'}
                                </button>
                                <button onClick={() => handleResetPassword(u)} className="w-full text-left px-4 py-2 text-[10px] font-bold text-amber-500 hover:bg-white/5 flex items-center gap-2 uppercase tracking-widest">
                                  Reset Senha
                                </button>
                              </>
                            )}
                            <div className="h-[1px] bg-brand-border my-1" />
                            <button onClick={() => handleDelete(u)} className="w-full text-left px-4 py-2 text-[10px] font-bold text-red-500 hover:bg-red-500/5 flex items-center gap-2 uppercase tracking-widest">
                              Eliminar
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ─── Add User/Client Modal ─── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] overflow-y-auto">
            <div className="flex min-h-full items-start justify-center p-4 pt-8 text-center">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setIsModalOpen(false)} className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-brand-surface w-full max-w-lg shadow-2xl border border-brand-border relative z-10 text-left"
              >
                <div className="p-6 bg-emerald-500 text-white flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold tracking-tight">{editingId ? 'Editar Acesso' : 'Adicionar Novo Acesso'}</h2>
                    <p className="text-emerald-100 text-[10px] font-medium uppercase tracking-widest mt-0.5">
                      {editingId ? 'Atualize as permissões e dados' : 'Utilizador do sistema ou novo cliente'}
                    </p>
                  </div>
                  <button onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="p-2 hover:bg-white/20 transition-colors"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Nome Completo / Entidade *</label>
                      <input type="text" required value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })}
                        placeholder="ex: João Silva ou Empresa ABC" className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white placeholder-gray-700" />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Perfil de Acesso</label>
                      <select value={formData.perfil} onChange={e => setFormData({ ...formData, perfil: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white">
                        <option value="Administrador" className="bg-brand-surface">Administrador</option>
                        <option value="Gestor" className="bg-brand-surface">Gestor</option>
                        <option value="Técnico" className="bg-brand-surface">Técnico</option>
                        <option value="Cliente" className="bg-brand-surface">Cliente</option>
                        <option value="Visualizador" className="bg-brand-surface">Visualizador</option>
                      </select>
                    </div>

                    {formData.perfil === 'Cliente' ? (
                      <>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Código Cliente *</label>
                          <input type="text" required value={formData.codigo} onChange={e => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                            placeholder="ex: CLT-100" className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white font-mono placeholder-gray-700" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">PIN de Acesso (6 dígitos) *</label>
                          <input type="password" required maxLength={6} minLength={4} value={formData.pin} onChange={e => setFormData({ ...formData, pin: e.target.value })}
                            placeholder="••••••" className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white tracking-widest placeholder-gray-700" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tipo de Contrato</label>
                          <select value={formData.contrato} onChange={e => setFormData({ ...formData, contrato: e.target.value })}
                            className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white">
                            <option value="Standard" className="bg-brand-surface">Standard</option>
                            <option value="Premium" className="bg-brand-surface">Premium</option>
                            <option value="Industrial" className="bg-brand-surface">Industrial</option>
                          </select>
                        </div>
                        <div className="space-y-1.5 col-span-2">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Orçamento Mensal (MT)</label>
                          <input type="number" value={formData.orcamento_mensal} onChange={e => setFormData({ ...formData, orcamento_mensal: e.target.value })}
                            placeholder="0,00" className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white placeholder-gray-700" />
                        </div>
                        <div className="space-y-1.5 col-span-2">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Propriedade Associada *</label>
                          <select required value={formData.property_id} onChange={e => setFormData({ ...formData, property_id: e.target.value })}
                            className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white">
                            <option value="" className="bg-brand-surface text-gray-500">Selecionar propriedade...</option>
                            {properties.map(p => (
                              <option key={p.id} value={p.id} className="bg-brand-surface">{p.endereco} ({p.codigo})</option>
                            ))}
                          </select>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Email Académico / Profissional *</label>
                          <input type="email" required disabled={!!editingId} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                            placeholder="ex: joao@nexo.com" className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white placeholder-gray-700 disabled:opacity-50" />
                        </div>
                        {!editingId && (
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Palavra-passe Temporária *</label>
                            <input type="password" required minLength={6} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                              placeholder="mínimo 6 caracteres" className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white placeholder-gray-700" />
                          </div>
                        )}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Vincular a Propriedade (Opcional)</label>
                          <select value={formData.property_id} onChange={e => setFormData({ ...formData, property_id: e.target.value, asset_id: '' })}
                            className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white">
                            <option value="" className="bg-brand-surface text-gray-500">Nenhuma vinculação</option>
                            {properties.map(p => (
                              <option key={p.id} value={p.id} className="bg-brand-surface">{p.endereco} ({p.codigo})</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Vincular a Ativo (Opcional)</label>
                          <select value={formData.asset_id} onChange={e => setFormData({ ...formData, asset_id: e.target.value })}
                            className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white">
                            <option value="" className="bg-brand-surface text-gray-500">Nenhum ativo</option>
                            {(formData.property_id ? assets.filter(a => a.property_id === formData.property_id) : assets).map(a => (
                              <option key={a.id} value={a.id} className="bg-brand-surface">{a.nome}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Preview capabilities */}
                  <div className="p-3 bg-white/5 border border-brand-border">
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Este perfil terá permissão para:</p>
                    {(ROLE_CAPABILITIES.find(r => r.role === formData.perfil)?.capabilities || []).map(c => (
                      <div key={c} className="flex items-center gap-2 text-[10px] text-gray-400 py-0.5">
                        <CheckCircle2 size={10} className="text-emerald-500 shrink-0" /> {c}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setIsModalOpen(false)}
                      className="px-5 py-3 border border-brand-border text-gray-400 hover:text-white hover:border-gray-400 transition-colors font-bold text-xs uppercase tracking-widest">
                      Cancelar
                    </button>
                    <button type="submit" disabled={submitting}
                      className="flex-1 py-3 bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 uppercase tracking-widest text-xs disabled:opacity-50 flex items-center justify-center gap-2">
                      {submitting ? <><div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-none animate-spin" /> A processar...</> : 'Confirmar Acesso'}
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

