import React, { useState } from 'react';
import { ShieldCheck, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { Toast, ToastType } from './ui/Toast';

export default function ChangePassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);

  const showToast = (msg: string, type: ToastType = 'success') => {
    setToast({ msg, type });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      showToast('As palavras-passe não coincidem', 'error');
      return;
    }
    if (password.length < 6) {
      showToast('A palavra-passe deve ter pelo menos 6 caracteres', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(sessionStorage.getItem('token') || localStorage.getItem('token'))}`
        },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        showToast('Palavra-passe atualizada com sucesso! Redirecionando...');
        // Update local user data
        const user = JSON.parse((sessionStorage.getItem('user') || localStorage.getItem('user')) || '{}');
        user.must_change_password = false;
        localStorage.setItem('user', JSON.stringify(user));
        
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
      } else {
        const err = await res.json();
        showToast(err.error || 'Erro ao atualizar palavra-passe', 'error');
      }
    } catch (e) {
      showToast('Erro de rede', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center p-4">
      <Toast
        message={toast?.msg || null}
        type={toast?.type}
        onClose={() => setToast(null)}
      />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-brand-surface border border-brand-border p-8 shadow-2xl"
      >
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-none flex items-center justify-center mb-4 border border-emerald-500/20">
            <ShieldCheck size={32} className="text-emerald-500" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2 tracking-tight">Segurança Obrigatória</h1>
          <p className="text-xs text-gray-400 uppercase tracking-widest leading-relaxed">
            Por motivos de segurança, deve atualizar a sua palavra-passe no primeiro acesso.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Lock size={12} className="text-emerald-500" /> Nova Palavra-passe
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite a nova senha"
              className="w-full px-4 py-3 bg-white/5 border border-brand-border text-xs text-white placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 size={12} className="text-emerald-500" /> Confirmar Nova Senha
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a nova senha"
              className="w-full px-4 py-3 bg-white/5 border border-brand-border text-xs text-white placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono"
            />
          </div>

          <div className="bg-white/5 border border-brand-border p-4 space-y-2">
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1">
              <AlertCircle size={10} className="text-amber-500" /> Requisitos:
            </p>
            <ul className="space-y-1">
              <li className="flex items-center gap-2 text-[10px] text-gray-400">
                <CheckCircle2 size={10} className={password.length >= 6 ? 'text-emerald-500' : 'text-gray-600'} /> 
                Mínimo de 6 caracteres
              </li>
              <li className="flex items-center gap-2 text-[10px] text-gray-400">
                <CheckCircle2 size={10} className={password === confirmPassword && password !== '' ? 'text-emerald-500' : 'text-gray-600'} /> 
                As senhas devem coincidir
              </li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 uppercase tracking-widest text-xs disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <><div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-none animate-spin" /> Atualizando...</>
            ) : (
              'Atualizar e Continuar'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

