import React, { useState, useEffect } from 'react';
import { Plus, User, Mail, Shield, Search, Filter, X, MoreVertical, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { canManageUsers } from '../utils/permissions';

export default function Users() {
  const [users, setUsers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: '',
    perfil: 'Visualizador'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const res = await fetch('/api/users', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
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
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchUsers();
        setFormData({ nome: '', email: '', password: '', perfil: 'Visualizador' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">A carregar Pessoal...</p>
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
              placeholder="Pesquisar pessoal..." 
              className="pl-10 pr-4 py-2 bg-brand-surface border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-64 text-xs"
            />
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-xl border border-white/5">
            <ShieldCheck size={12} className="text-emerald-500" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Controlo de Acesso</span>
          </div>
        </div>
        {canManageUsers(user.perfil) && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 text-xs"
          >
            <Plus size={16} />
            Adicionar Utilizador
          </button>
        )}
      </div>

      <div className="bg-brand-surface rounded-[24px] border border-brand-border overflow-hidden">
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
            {users.map((user) => (
              <tr key={user.id} className="data-row">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-[10px] font-bold text-emerald-500 border border-white/5">
                      {user.nome.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-white text-xs">{user.nome}</p>
                      <p className="text-[10px] text-gray-500">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                    user.perfil === 'Administrador' ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20' :
                    user.perfil === 'Gestor' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                    'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                  }`}>
                    {user.perfil}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${user.estado === 'Ativo' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{user.estado}</span>
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
              className="bg-brand-surface w-full max-w-md rounded-[32px] shadow-2xl relative z-10 overflow-hidden border border-brand-border"
            >
              <div className="p-6 bg-emerald-500 text-white flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold tracking-tight">Adicionar Pessoal</h2>
                  <p className="text-emerald-100 text-[10px] font-medium uppercase tracking-widest">Protocolo de Autorização de Acesso</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Nome Completo</label>
                  <input 
                    type="text" 
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    placeholder="ex: João Silva"
                    className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Endereço de Email</label>
                  <input 
                    type="email" 
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="ex: joao@gestpro.com"
                    className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Palavra-passe de Acesso</label>
                  <input 
                    type="password" 
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Perfil de Acesso</label>
                  <select 
                    value={formData.perfil}
                    onChange={(e) => setFormData({...formData, perfil: e.target.value})}
                    className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
                  >
                    <option value="Administrador" className="bg-brand-surface">Administrador</option>
                    <option value="Gestor" className="bg-brand-surface">Gestor</option>
                    <option value="Técnico" className="bg-brand-surface">Técnico</option>
                    <option value="Visualizador" className="bg-brand-surface">Visualizador</option>
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
                  ) : 'Autorizar Utilizador'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
