import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, ShieldCheck, Mail, Lock } from 'lucide-react';
import { api } from '../services/api';

interface LoginProps {
  onLogin: (user: any, token: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await api.post('/api/login', { email, password });
      onLogin(data.user, data.token);
    } catch (err: any) {
      setError(err.error || 'Erro ao entrar. Verifique as suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6 font-sans selection:bg-emerald-500/30">
      {/* Premium Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-none blur-[120px] animate-float"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-teal-500/10 rounded-none blur-[120px] animate-float-delayed"></div>
        <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-emerald-400/5 rounded-none blur-[100px] animate-float-slow"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[420px] bg-brand-surface/70 backdrop-blur-3xl rounded-none shadow-2xl shadow-emerald-900/10 overflow-hidden relative z-10 border border-white/5"
      >
        <div className="p-10 text-center border-b border-brand-border bg-white/[0.02]">
          <div className="w-16 h-16 bg-emerald-500 rounded-none flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20 transform rotate-3">
            <ShieldCheck size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">NEXO <span className="text-emerald-500">SGFM</span></h1>
          <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-[0.3em] font-bold">Gestão de Incidentes & Facilities</p>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-8">
          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-4 bg-red-500/10 text-red-500 text-[11px] rounded-none border border-red-500/20 font-bold uppercase tracking-widest text-center"
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Credenciais de Acesso</label>
            <div className="space-y-4">
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-emerald-500 transition-colors w-4 h-4" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-4 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-0 focus:border-emerald-500 transition-all text-sm text-white placeholder:text-gray-700 font-medium"
                  placeholder="utilizador@exemplo.com"
                  required
                />
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-emerald-500 transition-colors w-4 h-4" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-4 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-0 focus:border-emerald-500 transition-all text-sm text-white placeholder:text-gray-700 font-medium"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-none font-black transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 disabled:opacity-50 uppercase tracking-[0.2em] text-[11px] transform hover:-translate-y-1"
          >
            {loading ? 'Validando Acesso...' : (
              <>
                Entrar no Sistema
                <LogIn size={18} />
              </>
            )}
          </button>

          <div className="text-center pt-2">
            <a href="#" className="text-[9px] text-gray-600 hover:text-emerald-500 transition-colors uppercase tracking-[0.2em] font-black border-b border-transparent hover:border-emerald-500/30 pb-1">Suporte Técnico</a>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
