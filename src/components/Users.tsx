import React, { useState, useEffect } from 'react';
import { Plus, User, X, MoreVertical, CheckCircle2, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { canManageUsers } from '../utils/permissions';

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
  const [toast, setToast] = useState<string | null>(null);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [formData, setFormData] = useState({ nome: '', email: '', password: '', perfil: 'Visualizador' });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    const data = await res.json();
    setUsers(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchUsers();
        setFormData({ nome: '', email: '', password: '', perfil: 'Visualizador' });
        showToast('✅ Utilizador criado com sucesso!');
      } else {
        const err = await res.json();
        showToast(err.error || 'Erro ao criar utilizador.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">A carregar utilizadores...</p>
    </div>
  );

  return (
    <div className="space-y-6 page-enter">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="fixed top-4 right-4 z-[200] bg-brand-surface border border-brand-border shadow-2xl px-5 py-3 text-sm font-bold text-white">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/5">
          <ShieldCheck size={12} className="text-emerald-500" />
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Controlo de Acesso — {users.length} utilizadores</span>
        </div>
        {canManageUsers(currentUser.perfil) && (
          <button onClick={() => setIsModalOpen(true)}
            className="bg-emerald-500 text-white px-6 py-2 rounded-none font-bold hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 text-xs">
            <Plus size={16} /> Adicionar Utilizador
          </button>
        )}
      </div>

      {/* Role Reference Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {ROLE_CAPABILITIES.map(r => (
          <div key={r.role} className="bg-brand-surface border border-brand-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2 h-2 rounded-full ${r.dot}`} />
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
              <th className="col-header">Utilizador</th>
              <th className="col-header">Perfil</th>
              <th className="col-header">Estado</th>
              <th className="col-header">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center">
                  <User size={28} className="text-gray-600 mx-auto mb-3" />
                  <p className="text-sm font-bold text-gray-500">Nenhum utilizador encontrado</p>
                </td>
              </tr>
            ) : users.map(u => {
              const roleInfo = ROLE_CAPABILITIES.find(r => r.role === u.perfil) || ROLE_CAPABILITIES[3];
              return (
                <tr key={u.id} className="data-row">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white/5 flex items-center justify-center text-[11px] font-bold text-emerald-500 border border-white/5">
                        {u.nome?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="font-bold text-white text-xs">{u.nome}</p>
                        <p className="text-[10px] text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${roleInfo.color}`}>{u.perfil}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${u.estado !== 'Inativo' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{u.estado || 'Ativo'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button className="p-1.5 hover:bg-white/5 text-gray-500 hover:text-gray-300 transition-colors">
                      <MoreVertical size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ─── Add User Modal ─── */}
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
                className="bg-brand-surface w-full max-w-md shadow-2xl border border-brand-border relative z-10"
              >
                <div className="p-6 bg-emerald-500 text-white flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold tracking-tight">Adicionar Utilizador</h2>
                    <p className="text-emerald-100 text-[10px] font-medium uppercase tracking-widest mt-0.5">Autorização de acesso ao sistema</p>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 transition-colors"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Nome Completo *</label>
                    <input type="text" required value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="ex: João Silva" className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Email *</label>
                    <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="ex: joao@nexo.com" className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Palavra-passe *</label>
                    <input type="password" required minLength={6} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                      placeholder="mínimo 6 caracteres" className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Perfil de Acesso</label>
                    <select value={formData.perfil} onChange={e => setFormData({ ...formData, perfil: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white">
                      <option value="Administrador" className="bg-brand-surface">Administrador — Acesso total</option>
                      <option value="Gestor" className="bg-brand-surface">Gestor — Gestão operacional</option>
                      <option value="Técnico" className="bg-brand-surface">Técnico — Incidentes e inspecções</option>
                      <option value="Visualizador" className="bg-brand-surface">Visualizador — Só leitura</option>
                    </select>
                  </div>
                  {/* Preview capabilities */}
                  <div className="p-3 bg-white/5 border border-brand-border">
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Este perfil pode:</p>
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
                      {submitting ? <><div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" /> A processar...</> : 'Criar Utilizador'}
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
