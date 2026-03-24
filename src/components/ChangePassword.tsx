import React, { useState } from 'react';
import { ShieldCheck, Lock, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { Toast, ToastType } from './ui/Toast';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';

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
    <div className="min-h-screen bg-[#080d18] flex items-center justify-center p-6 relative overflow-hidden dark">
      {/* Mesh Background & Dot Pattern */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] bg-emerald-500/5 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-blue-500/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
      </div>

      <Toast
        message={toast?.msg || null}
        type={toast?.type}
        onClose={() => setToast(null)}
      />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-[440px] z-10"
      >
        <Card className="border-white/5 bg-[#0a1220]/80 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500 to-emerald-500/0"></div>
          
          <CardHeader className="text-center pb-4 pt-8">
            <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/5">
              <ShieldCheck size={28} className="text-emerald-500" />
            </div>
            <CardTitle className="text-2xl font-black text-white tracking-tight">Segurança Nexo</CardTitle>
            <CardDescription className="text-[10px] font-black text-emerald-500/50 uppercase tracking-[0.25em] mt-1">
              Atualização Obrigatória
            </CardDescription>
            <p className="text-xs text-gray-400 mt-4 leading-relaxed px-4">
              Por motivos de segurança, deverá atualizar a sua palavra-passe no primeiro acesso ao sistema.
            </p>
          </CardHeader>

          <CardContent className="pb-8 px-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Lock size={12} className="text-emerald-500" /> Nova Palavra-passe
                  </Label>
                  <div className="relative group">
                    <Input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-12 bg-white/5 border-white/10 text-white placeholder-gray-600 focus:border-emerald-500/50 focus:ring-emerald-500/20 transition-all font-mono pl-4"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <CheckCircle2 size={12} className="text-emerald-500" /> Confirmar Nova Senha
                  </Label>
                  <div className="relative group">
                    <Input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-12 bg-white/5 border-white/10 text-white placeholder-gray-600 focus:border-emerald-500/50 focus:ring-emerald-500/20 transition-all font-mono pl-4"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white/[0.03] border border-white/5 p-4 rounded-lg space-y-3">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.15em] mb-1 flex items-center gap-2">
                  <AlertCircle size={12} className="text-amber-500" /> Requisitos Mínimos
                </p>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center border ${password.length >= 6 ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-500' : 'bg-white/5 border-white/10 text-gray-600'}`}>
                      {password.length >= 6 ? <CheckCircle2 size={10} /> : <div className="w-1 h-1 bg-current rounded-full" />}
                    </div>
                    <span className={`text-[10px] font-bold tracking-tight ${password.length >= 6 ? 'text-gray-200' : 'text-gray-500'}`}>Mínimo de 6 caracteres</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center border ${password === confirmPassword && password !== '' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-500' : 'bg-white/5 border-white/10 text-gray-600'}`}>
                      {password === confirmPassword && password !== '' ? <CheckCircle2 size={10} /> : <div className="w-1 h-1 bg-current rounded-full" />}
                    </div>
                    <span className={`text-[10px] font-bold tracking-tight ${password === confirmPassword && password !== '' ? 'text-gray-200' : 'text-gray-500'}`}>Senhas coincidentes</span>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-[#080d18] font-black uppercase tracking-[0.2em] text-[10px] shadow-[0_8px_20px_rgba(16,185,129,0.15)] disabled:opacity-50 group border-none"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-[#080d18]/20 border-t-[#080d18] rounded-full animate-spin" />
                ) : (
                  <>
                    Atualizar e Continuar
                    <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <p className="text-center mt-6 text-[9px] text-gray-600 font-bold uppercase tracking-[0.3em]">
          Nexo Digital Estate Management &copy; 2026
        </p>
      </motion.div>
    </div>
  );
}
