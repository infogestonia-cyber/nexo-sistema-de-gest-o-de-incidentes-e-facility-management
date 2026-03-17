import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, ShieldCheck, Mail, Lock } from 'lucide-react';
import { api } from '../services/api';

// shadcn UI + Aceternity + Magic UI imports
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';

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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 font-sans dark">
      <Card className="w-full max-w-[420px] shadow-sm border-border bg-card">
        <CardHeader className="text-center pb-2">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring' }}
            className="w-12 h-12 bg-primary rounded-md flex items-center justify-center mx-auto mb-4 border border-border"
          >
            <ShieldCheck size={24} className="text-primary-foreground" />
          </motion.div>
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Nexo SGFM
          </CardTitle>
          <CardDescription className="uppercase tracking-widest text-[10px] font-semibold mt-1">
            Gestão de Facilities
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-destructive/10 text-destructive text-xs rounded-md border border-destructive/20 font-semibold text-center"
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground ml-1">E-mail</Label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors w-4 h-4" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 bg-background"
                  placeholder="utilizador@exemplo.com"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground ml-1">Palavra-passe</Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors w-4 h-4" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11 bg-background"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
          </div>

          {/* shadcn default primary button */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 text-sm font-semibold"
          >
            {loading ? 'Validando Acesso...' : (
              <>
                Entrar no Sistema
                <LogIn size={18} className="ml-2" />
              </>
            )}
          </Button>

          <div className="text-center pt-2">
            <a href="#" className="text-xs text-muted-foreground hover:text-primary transition-colors uppercase tracking-[0.1em] font-semibold underline-offset-4 hover:underline">
              Suporte Técnico
            </a>
          </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
