import React, { useState, useEffect } from 'react';
import { ensureArray } from '../utils/safeArray';
import {
  Plus, Building2, User, Hash, Search, X, Globe,
  Cpu, Activity, AlertCircle, Wrench, ChevronRight,
  ArrowLeft, MapPin, Settings, Eye, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { canCreateProperties } from '../utils/permissions';

// --- shadcn UI imports ---
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';

export default function Properties({ onSelectProperty }: { onSelectProperty: (id: string) => void }) {
  const [properties, setProperties] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [search, setSearch] = useState('');
  
  const [user] = useState<any>(() => {
    try {
      const u = localStorage.getItem('user');
      return u && u !== 'undefined' ? JSON.parse(u) : {};
    } catch { return {}; }
  });
  const [formData, setFormData] = useState({
    codigo: '',
    endereco: '',
    inquilino: '',
    referencia_interna: ''
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [propRes, assetRes] = await Promise.all([
        fetch('/api/properties', { headers }),
        fetch('/api/assets', { headers }),
      ]);

      const propData = propRes.ok ? await propRes.json() : [];
      const assetData = assetRes.ok ? await assetRes.json() : [];

      setProperties(Array.isArray(propData) ? propData : []);
      setAssets(Array.isArray(assetData) ? assetData : []);
    } catch (e) {
      console.error(e);
      setProperties([]);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchAll();
        setFormData({ codigo: '', endereco: '', inquilino: '', referencia_interna: '' });
      } else {
        const err = await res.json();
        console.error(err.error || 'Erro ao adicionar propriedade');
      }
    } catch {
      console.error('Erro de rede. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const getAssetsForProperty = (propId: string) => ensureArray<any>(assets).filter(a => a.property_id === propId);

  const filtered = ensureArray<any>(properties).filter(p =>
    !search ||
    p.endereco?.toLowerCase().includes(search.toLowerCase()) ||
    p.inquilino?.toLowerCase().includes(search.toLowerCase()) ||
    p.codigo?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">A carregar Propriedades...</p>
    </div>
  );

  // Property Detail View - Stark Minimalist
  if (selectedProperty) {
    const propAssets = getAssetsForProperty(selectedProperty.id);
    return (
      <div className="space-y-6">
        {/* Breadcrumb / Header */}
        <div className="flex items-center justify-between border-b border-border/50 pb-5">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedProperty(null)}
              className="h-9 w-9 bg-muted/5 border-border/50 hover:bg-muted/10 transition-colors"
            >
              <ArrowLeft size={16} />
            </Button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                 <Badge variant="outline" className="text-[8px] h-3.5 px-1 bg-emerald-500/10 text-emerald-500 border-none font-black uppercase tracking-tight">Ativa</Badge>
                 <h1 className="text-xl font-bold tracking-tight leading-none">
                    {selectedProperty.endereco}
                 </h1>
              </div>
              <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest mt-1 text-xs">
                Local ID: <span className="text-foreground tracking-normal font-mono px-1 bg-muted rounded">#{selectedProperty.codigo}</span> &bull; Unidade de Gestão
              </p>
            </div>
          </div>
          <Button
            onClick={() => onSelectProperty(selectedProperty.id)}
            variant="default"
            size="sm"
            className="h-9 gap-2 text-xs font-bold shadow-lg shadow-primary/10"
          >
            <Eye size={16} />
            Efetuar Inspeção
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Main Info Card */}
            <Card className="shadow-sm border-border bg-card/50 backdrop-blur-sm card-shine overflow-hidden">
              <CardHeader className="bg-muted/5 border-b border-border/30">
                <div className="flex items-center gap-2">
                   <Info size={16} className="text-primary" />
                   <div>
                      <CardTitle className="text-sm font-bold tracking-tight">Ficha da Unidade</CardTitle>
                      <CardDescription className="text-[10px] uppercase tracking-widest font-bold opacity-60">Registos Administrativos</CardDescription>
                   </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-sm">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">Inquilino / Responsável</p>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                        <User size={18} />
                      </div>
                      <div>
                         <p className="font-bold text-foreground text-sm tracking-tight">{selectedProperty.inquilino || 'Não Atribuído'}</p>
                         <p className="text-[10px] text-muted-foreground font-medium">Gestor de Localização</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">Referência Interna</p>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-zinc-500/10 flex items-center justify-center text-zinc-500 border border-zinc-500/20">
                        <Hash size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-sm tracking-tight font-mono">{selectedProperty.referencia_interna || 'SEM REF'}</p>
                        <p className="text-[10px] text-muted-foreground font-medium">ID de Integração ERP</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest flex items-center gap-2">
                      <Cpu size={14} className="text-primary" /> Inventário de Equipamentos
                    </h3>
                    <Badge variant="secondary" className="h-5 text-[9px] bg-muted/30 border-none font-bold">{propAssets.length} Unidades</Badge>
                  </div>
                  
                  {propAssets.length === 0 ? (
                    <div className="py-12 text-center border border-dashed border-border/50 rounded-xl bg-muted/5 group hover:border-primary/20 transition-colors">
                      <Cpu size={28} className="text-muted-foreground/20 mx-auto mb-3" />
                      <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Nenhum Ativo Registado</p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border/50 overflow-hidden bg-background/20 backdrop-blur-sm">
                      <Table>
                        <TableHeader className="bg-muted/10">
                          <TableRow className="hover:bg-transparent border-border/30">
                            <TableHead className="text-[10px] h-9 font-black uppercase tracking-widest px-4">Recurso</TableHead>
                            <TableHead className="text-[10px] h-9 font-black uppercase tracking-widest">Sistema</TableHead>
                            <TableHead className="text-[10px] h-9 font-black uppercase tracking-widest text-center">Saúde</TableHead>
                            <TableHead className="text-[10px] h-9 font-black uppercase tracking-widest text-right pr-4">Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ensureArray<any>(propAssets).map(asset => (
                            <TableRow key={asset.id} className="border-border/30 h-11 hover:bg-muted/5 transition-colors">
                              <TableCell className="py-2 px-4">
                                <span className="text-xs font-bold tracking-tight">{asset.nome}</span>
                              </TableCell>
                              <TableCell className="py-2">
                                <Badge variant="outline" className="text-[8px] px-1.5 h-3.5 bg-zinc-500/5 border-none font-black text-muted-foreground/70 uppercase">{asset.categoria}</Badge>
                              </TableCell>
                              <TableCell className="py-2 text-center">
                                <Badge 
                                  variant="outline" 
                                  className={`text-[8px] px-1.5 h-3.5 border-none font-black uppercase tracking-tight ${
                                    asset.probabilidade_falha === 'Alta' ? 'bg-rose-500/15 text-rose-500' :
                                    asset.probabilidade_falha === 'Média' ? 'bg-amber-500/15 text-amber-500' : 'bg-emerald-500/15 text-emerald-500'
                                  }`}
                                >
                                  {asset.probabilidade_falha || 'Nominal'}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-2 text-right pr-4">
                                <div className="flex items-center justify-end gap-1.5">
                                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                   <span className="text-[9px] font-bold uppercase tracking-tight opacity-50">Online</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="shadow-sm border-border bg-card/50 backdrop-blur-sm card-shine overflow-hidden">
              <CardHeader className="p-4 border-b border-border/30 bg-muted/5">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-muted-foreground/80">
                  <Activity size={14} className="text-primary" /> Monitor de Saúde
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { label: 'Recursos Instalados', value: ensureArray<any>(propAssets).length, icon: Cpu, color: 'text-primary', bgColor: 'bg-primary/5' },
                    { label: 'Pontos de Risco', value: ensureArray<any>(propAssets).filter(a => a.probabilidade_falha === 'Alta').length, icon: AlertCircle, color: 'text-rose-500', bgColor: 'bg-rose-500/5' },
                  ].map((s, i) => (
                    <div key={i} className={`p-4 ${s.bgColor} border border-border/50 rounded-xl flex items-center justify-between group transition-all hover:scale-[1.02]`}>
                      <div>
                        <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest mb-1">{s.label}</p>
                        <p className={`text-2xl font-black tracking-tighter ${s.color}`}>{s.value}</p>
                      </div>
                      <s.icon size={20} className={`${s.color} opacity-20 group-hover:opacity-100 transition-opacity`} />
                    </div>
                  ))}
                </div>
                <div className="pt-2">
                   <Button variant="outline" className="w-full text-[10px] font-bold uppercase tracking-widest h-9 bg-background/50 border-border/50 hover:bg-primary hover:text-white transition-all gap-2">
                      <Settings size={12} /> Configurações de Unidade
                   </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-2xl border-none bg-gradient-to-br from-zinc-900 via-zinc-950 to-black text-white overflow-hidden relative group">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.15),transparent)] opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
              <CardContent className="p-5 space-y-4 relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-500/20 rounded-lg ring-1 ring-blue-500/50">
                    <MapPin size={18} className="text-blue-400" />
                  </div>
                  <div>
                     <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Geodecodificação</span>
                     <p className="text-sm font-bold tracking-tight text-white leading-tight">Coordenadas Ativas</p>
                  </div>
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/10 backdrop-blur-md">
                   <p className="text-xs leading-relaxed text-zinc-300 font-medium">
                     {selectedProperty.endereco}
                   </p>
                </div>
                <div className="flex items-center justify-between pt-2">
                   <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Globe size={10} /> Sincronizado c/ Cloud
                   </span>
                   <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                   </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-6">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 w-3.5 h-3.5 group-focus-within:text-primary transition-colors" />
            <Input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar unidades ou inquilinos..."
              className="pl-9 w-64 h-9 text-xs bg-muted/10 border-border/50 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all shadow-none"
            />
          </div>
          <div className="hidden md:flex items-center gap-2 px-3 h-9 border border-border/50 rounded-md bg-muted/5">
            <Building2 size={12} className="text-muted-foreground/50" />
            <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest leading-none">{filtered.length} Unidades Regitadas</span>
          </div>
        </div>
        {canCreateProperties(user.perfil) && (
          <Button
            onClick={() => setIsModalOpen(true)}
            className="h-9 gap-2 text-xs font-bold shadow-lg shadow-primary/10"
          >
            <Plus size={16} />
            Nova Propriedade
          </Button>
        )}
      </div>

      <div className="p-3 border border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/5 rounded-lg flex items-start gap-3 backdrop-blur-sm">
        <div className="p-1 bg-blue-500/10 rounded overflow-hidden mt-0.5">
           <Info size={14} className="text-blue-500 shrink-0" />
        </div>
        <p className="text-[11px] text-muted-foreground/80 leading-relaxed font-medium">
          As <span className="text-blue-500 font-bold">Unidades Operacionais</span> representam os pontos físicos de manutenção. 
          Cada unidade centraliza ativos e históricos de intervenção técnica.
        </p>
      </div>

      {/* Property Grid - Cleaner 2D Cards */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-border rounded-xl">
          <Building2 size={32} className="text-muted-foreground mx-auto mb-3 opacity-20" />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
            {search ? 'Sem resultados' : 'Sem propriedades'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {ensureArray<any>(filtered).map((prop) => {
            const propAssets = getAssetsForProperty(prop.id);
            const highRisk = ensureArray<any>(propAssets).filter(a => a.probabilidade_falha === 'Alta').length;
            return (
              <Card 
                key={prop.id}
                className="shadow-sm border-border bg-card/50 backdrop-blur-sm card-shine hover:border-primary/20 transition-all cursor-pointer group"
                onClick={() => setSelectedProperty(prop)}
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0 border border-emerald-500/20 group-hover:scale-110 transition-transform duration-300">
                      <Building2 size={18} />
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-[10px] font-mono font-black text-muted-foreground/30 group-hover:text-primary transition-colors">#{prop.codigo}</span>
                      {highRisk > 0 && (
                        <Badge variant="outline" className="h-4 text-[8px] px-1.5 font-black bg-rose-500/15 text-rose-500 border-none uppercase tracking-tighter">
                          {highRisk} Risco
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-bold text-sm tracking-tight truncate leading-none mb-1 group-hover:text-primary transition-colors">
                      {prop.endereco}
                    </h3>
                    <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-black flex items-center gap-1.5">
                      <User size={10} className="text-muted-foreground/30" /> {prop.inquilino || 'Sem Responsável'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <div className="flex -space-x-2">
                          {[...Array(Math.min(3, propAssets.length))].map((_, i) => (
                            <div key={i} className="w-5 h-5 rounded-full bg-zinc-800 border-2 border-background flex items-center justify-center">
                               <Cpu size={8} className="text-zinc-500" />
                            </div>
                          ))}
                       </div>
                      <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-tight ml-1">
                        {propAssets.length} {propAssets.length === 1 ? 'Ativo' : 'Ativos'}
                      </span>
                    </div>
                    <ChevronRight size={14} className="text-muted-foreground/20 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Property Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                 <Building2 size={20} />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold tracking-tight">Nova Propriedade</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground/60">Registar nova unidade física no sistema operacional.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 pt-6">
            <div className="space-y-2.5">
              <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/50 ml-1">Código de Identificação</Label>
              <Input
                required
                value={formData.codigo}
                onChange={e => setFormData({ ...formData, codigo: e.target.value })}
                placeholder="ex: PR-01"
                className="h-10 bg-muted/10 border-border/50 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all font-mono"
              />
            </div>
            <div className="space-y-2.5">
              <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/50 ml-1">Designação / Endereço</Label>
              <Input
                required
                value={formData.endereco}
                onChange={e => setFormData({ ...formData, endereco: e.target.value })}
                placeholder="Nome da instalação física"
                className="h-10 bg-muted/10 border-border/50 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all font-bold"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2.5">
                <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/50 ml-1">Responsável</Label>
                <Input
                  value={formData.inquilino}
                  onChange={e => setFormData({ ...formData, inquilino: e.target.value })}
                  placeholder="Nome do inquilino"
                  className="h-10 bg-muted/10 border-border/50 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
                />
              </div>
              <div className="space-y-2.5">
                <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/50 ml-1">Referência</Label>
                <Input
                  value={formData.referencia_interna}
                  onChange={e => setFormData({ ...formData, referencia_interna: e.target.value })}
                  placeholder="ID Externo"
                  className="h-10 bg-muted/10 border-border/50 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
                />
              </div>
            </div>
            <DialogFooter className="gap-3 pt-6 border-t border-border/30">
              <Button type="button" variant="ghost" className="flex-1 text-xs font-semibold h-10" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={submitting} className="flex-1 font-bold h-10 shadow-lg shadow-primary/20">
                {submitting ? 'A registar...' : 'Confirmar Registo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
