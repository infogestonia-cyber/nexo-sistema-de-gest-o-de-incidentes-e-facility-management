import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, ShieldCheck, User, Lock, Eye, EyeOff, Zap } from 'lucide-react';
import { api } from '../../services/api';

interface Props {
  onLogin: (cliente: any, token: string) => void;
}

export default function ClientLogin({ onLogin }: Props) {
  const [codigo, setCodigo] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post('/api/auth/cliente', { 
        codigo: codigo.trim(), 
        pin: pin.trim() 
      });
      onLogin(data.cliente, data.token);
    } catch (err: any) {
      setError(err.error || 'Erro de ligação ao servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6 font-sans selection:bg-emerald-500/30">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-none blur-[120px] animate-float"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-teal-500/10 rounded-none blur-[120px] animate-float-delayed"></div>
        <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-emerald-400/5 rounded-none blur-[100px] animate-float-slow"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[400px] bg-brand-surface/70 backdrop-blur-3xl rounded-none shadow-2xl shadow-emerald-900/10 overflow-hidden relative z-10 border border-white/5"
      >
        <div className="p-8 text-center border-b border-brand-border bg-white/[0.02]">
          <div className="w-12 h-12 bg-emerald-500 rounded-none flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
            <Zap size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Nexo - Portal</h1>
          <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-[0.2em] font-bold">Portal do Cliente</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-3 bg-red-500/10 text-red-500 text-[11px] rounded-none border border-red-500/20 font-medium">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Código de Cliente</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 w-4 h-4" />
              <input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                className="w-full pl-11 pr-4 py-3 bg-background border border-input rounded-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-xs text-foreground placeholder:text-muted-foreground font-mono"
                placeholder="CLT-001"
                required
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">PIN de Acesso</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 w-4 h-4" />
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => setPin(e.target.value.slice(0, 6))}
                className="w-full pl-11 pr-12 py-3 bg-background border border-input rounded-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-xs text-foreground placeholder:text-muted-foreground font-mono tracking-widest"
                placeholder="••••••"
                maxLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                tabIndex={-1}
              >
                {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !codigo || pin.length < 4}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-none font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 disabled:opacity-50 uppercase tracking-widest text-[11px] transform hover:-translate-y-0.5"
          >
            {loading ? 'A autenticar...' : (
              <>
                Entrar no Portal
                <ShieldCheck size={16} />
              </>
            )}
          </button>

          <div className="mt-4 p-4 bg-white/[0.02] border border-white/5 rounded-none">
            <p className="text-[9px] text-gray-600 text-center uppercase tracking-widest font-bold mb-2">Acesso de Demonstração</p>
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-500">Código: <span className="text-emerald-500 font-mono font-bold">CLT-001</span></span>
              <span className="text-gray-500">PIN: <span className="text-emerald-500 font-mono font-bold">123456</span></span>
            </div>
          </div>
          <p className="text-center text-[9px] text-gray-700 mt-2 uppercase tracking-widest">Nexo SGFM © 2025 — Acesso Seguro</p>
        </form>
      </motion.div>
    </div>
  );
}
