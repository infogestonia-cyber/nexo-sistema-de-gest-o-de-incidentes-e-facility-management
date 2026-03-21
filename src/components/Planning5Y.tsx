import React, { useState, useEffect } from 'react';
import { ensureArray } from '../utils/safeArray';
import { Plus, Calendar, TrendingUp, Target, Search, Filter, X, ChevronRight, BarChart3, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { canManagePlanning } from '../utils/permissions';

// shadcn/ui components
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from './ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Separator } from './ui/separator';
import { Textarea } from './ui/textarea';

export default function Planning5Y() {
  const [planning, setPlanning] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [user] = useState<any>(() => {
    try {
      const u = (sessionStorage.getItem('user') || localStorage.getItem('user'));
      return u && u !== 'undefined' ? JSON.parse(u) : {};
    } catch { return {}; }
  });
  const [formData, setFormData] = useState({
    item: '',
    ano: new Date().getFullYear(),
    trimestre: 1,
    observacoes: ''
  });

  useEffect(() => {
    fetchPlanning();
  }, []);

  const fetchPlanning = async () => {
    try {
      const res = await fetch('/api/planning-5y', {
        headers: { 'Authorization': `Bearer ${(sessionStorage.getItem('token') || localStorage.getItem('token'))}` }
      });
      if (!res.ok) throw new Error('Falha ao carregar planeamento');
      const data = await res.json();
      setPlanning(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setPlanning([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/planning-5y', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(sessionStorage.getItem('token') || localStorage.getItem('token'))}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchPlanning();
        setFormData({ item: '', ano: new Date().getFullYear(), trimestre: 1, observacoes: '' });
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Erro ao adicionar objetivo estratégico');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de rede ao tentar adicionar o objetivo');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      <p className="text-sm font-medium text-muted-foreground animate-pulse">A carregar Roteiro Estratégico...</p>
    </div>
  );

  const filteredPlanning = ensureArray<any>(planning).filter(p => 
    p.item.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.observacoes.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const years = Array.from(new Set(filteredPlanning.map(p => p.ano))).sort();

  return (
    <div className="space-y-8 page-enter p-1">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Roteiro Estratégico de 5 Anos</h1>
          <p className="text-muted-foreground text-sm">Gestão de metas e objetivos a longo prazo.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Consultar roteiro..."
              className="pl-9 h-9 text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {canManagePlanning(user.perfil) && (
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 h-9">
                  <Plus className="h-4 w-4" />
                  Novo Item
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Objetivo Estratégico</DialogTitle>
                  <DialogDescription>
                    Adicione um novo marco ou objetivo ao roteiro estratégico da organização.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label htmlFor="item" className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Designação do Objetivo
                    </label>
                    <Input
                      id="item"
                      required
                      value={formData.item}
                      onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                      placeholder="ex: Modernização Total de HVAC"
                      className="text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="ano" className="text-xs font-medium leading-none">
                        Ano Fiscal
                      </label>
                      <Input
                        id="ano"
                        type="number"
                        required
                        value={formData.ano}
                        onChange={(e) => setFormData({ ...formData, ano: parseInt(e.target.value) })}
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium leading-none">
                        Trimestre
                      </label>
                      <Select
                        value={formData.trimestre.toString()}
                        onValueChange={(val) => setFormData({ ...formData, trimestre: parseInt(val) })}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Trimestre 1</SelectItem>
                          <SelectItem value="2">Trimestre 2</SelectItem>
                          <SelectItem value="3">Trimestre 3</SelectItem>
                          <SelectItem value="4">Trimestre 4</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="obs" className="text-xs font-medium leading-none">
                      Observações Estratégicas
                    </label>
                    <Textarea
                      id="obs"
                      rows={3}
                      value={formData.observacoes}
                      onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                      placeholder="Forneça contexto técnico e financeiro..."
                      className="text-xs resize-none"
                    />
                  </div>
                  <DialogFooter className="pt-4">
                    <Button type="submit" disabled={submitting} className="w-full sm:w-auto h-9 text-xs">
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          A processar...
                        </>
                      ) : 'Confirmar Objetivo'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Separator />

      <div className="space-y-12">
        {years.length > 0 ? years.map(year => (
          <div key={year} className="space-y-6">
            <div className="flex items-center gap-4">
              <h3 className="text-xl font-semibold tracking-tight">{year}</h3>
              <div className="h-[1px] flex-1 bg-border" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ano Fiscal</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(q => {
                const items = filteredPlanning.filter(p => p.ano === year && p.trimestre === q);
                return (
                  <Card key={q} className="flex flex-col h-full border-muted/60 hover:border-primary/20 transition-colors shadow-none bg-card/40">
                    <CardHeader className="p-4 pb-2 space-y-0 flex flex-row items-center justify-between">
                      <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        Q{q} - Trimestre
                      </CardTitle>
                      <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
                    </CardHeader>
                    <CardContent className="p-4 pt-2 flex-1 space-y-3">
                      {items.length > 0 ? items.map(item => (
                        <div key={item.id} className="p-3 border border-border/50 bg-background/50 rounded-sm hover:border-primary/20 transition-all cursor-default">
                          <h4 className="text-xs font-semibold mb-1 leading-tight">{item.item}</h4>
                          <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-3">{item.observacoes}</p>
                        </div>
                      )) : (
                        <div className="flex flex-col items-center justify-center py-6 opacity-20">
                          <Target className="h-6 w-6 text-muted-foreground mb-2" />
                          <span className="text-[9px] font-bold uppercase tracking-widest">Sem Metas</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )) : (
          <div className="flex flex-col items-center justify-center py-24 border border-dashed rounded-lg bg-muted/10">
            <TrendingUp className="h-10 w-10 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold">Sem Dados Estratégicos</h3>
            <p className="text-sm text-muted-foreground mt-1 text-center max-w-md px-6">
              Inicie o seu roteiro de 5 anos adicionando objetivos estratégicos para acompanhar o progresso a longo prazo da organização.
            </p>
            {canManagePlanning(user.perfil) && (
              <Button variant="outline" size="sm" className="mt-6" onClick={() => setIsModalOpen(true)}>
                Adicionar Primeiro Item
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

