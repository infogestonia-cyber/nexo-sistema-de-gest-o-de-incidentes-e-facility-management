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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
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
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedProperty(null)}
              className="h-8 w-8"
            >
              <ArrowLeft size={14} />
            </Button>
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold tracking-tight leading-none mb-1">
                {selectedProperty.endereco}
              </h1>
              <p className="text-xs text-muted-foreground font-medium">
                #{selectedProperty.codigo} &bull; Propriedade Operacional
              </p>
            </div>
          </div>
          <Button
            onClick={() => onSelectProperty(selectedProperty.id)}
            variant="outline"
            size="sm"
            className="h-8 gap-2"
          >
            <Eye size={14} />
            Ver Inspecções
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Main Info Card */}
            <Card className="shadow-none border-border">
              <CardHeader>
                <CardTitle className="text-base">Informação da Unidade</CardTitle>
                <CardDescription className="text-xs">Contexto e identificação administrativa</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-sm">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Inquilino / Responsável</p>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-muted-foreground border border-border">
                        <User size={16} />
                      </div>
                      <p className="font-semibold text-foreground leading-none">{selectedProperty.inquilino || '—'}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Referência Interna</p>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-muted-foreground border border-border">
                        <Hash size={16} />
                      </div>
                      <p className="font-semibold text-foreground leading-none">{selectedProperty.referencia_interna || '—'}</p>
                    </div>
                  </div>
                </div>

                <Separator className="bg-border/50" />

                <div>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
                    Inventário de Ativos ({propAssets.length})
                  </h3>
                  {propAssets.length === 0 ? (
                    <div className="py-10 text-center border border-dashed border-border rounded-lg bg-muted/20">
                      <Cpu size={24} className="text-muted-foreground mx-auto mb-2 opacity-30" />
                      <p className="text-xs font-medium text-muted-foreground">Nenhum ativo vinculado</p>
                    </div>
                  ) : (
                    <div className="rounded-md border border-border overflow-hidden">
                      <Table>
                        <TableHeader className="bg-muted/30">
                          <TableRow>
                            <TableHead className="text-[10px] h-9">Ativo</TableHead>
                            <TableHead className="text-[10px] h-9">Categoria</TableHead>
                            <TableHead className="text-[10px] h-9">Impacto</TableHead>
                            <TableHead className="text-[10px] h-9 text-right font-mono">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ensureArray<any>(propAssets).map(asset => (
                            <TableRow key={asset.id}>
                              <TableCell className="py-2.5">
                                <span className="text-xs font-semibold">{asset.nome}</span>
                              </TableCell>
                              <TableCell className="py-2.5">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground">{asset.categoria}</span>
                              </TableCell>
                              <TableCell className="py-2.5">
                                <Badge variant={asset.probabilidade_falha === 'Alta' ? 'destructive' : 'outline'} className="text-[9px] px-1.5 py-0 h-4">
                                  {asset.probabilidade_falha || 'Baixa'}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-2.5 text-right">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary ml-auto"></div>
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
            {/* Quick Stats Card */}
            <Card className="shadow-none border-border">
              <CardHeader className="p-4 border-b border-border">
                <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                  <Activity size={14} className="text-muted-foreground" />
                  Estado Operacional
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 grid grid-cols-2 gap-3">
                {[
                  { label: 'Ativos', value: ensureArray<any>(propAssets).length, color: 'text-foreground' },
                  { label: 'Risco Crítico', value: ensureArray<any>(propAssets).filter(a => a.probabilidade_falha === 'Alta').length, color: 'text-destructive' },
                ].map((s, i) => (
                  <div key={i} className="p-3 bg-muted/20 border border-border rounded-md">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{s.label}</p>
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="shadow-none border-border bg-zinc-950 text-white">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-white/10 rounded">
                    <MapPin size={14} className="text-white" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Localização</span>
                </div>
                <p className="text-xs leading-relaxed text-zinc-300">
                  {selectedProperty.endereco}
                </p>
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
            <Input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar..."
              className="pl-9 w-64 h-9 text-xs bg-muted/20 border-border"
            />
          </div>
          <div className="hidden md:flex items-center gap-2 px-3 h-9 border border-border rounded-md bg-muted/10">
            <Building2 size={12} className="text-muted-foreground" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{filtered.length} Unidades</span>
          </div>
        </div>
        {canCreateProperties(user.perfil) && (
          <Button
            onClick={() => setIsModalOpen(true)}
            className="h-9 gap-2 text-xs font-bold"
          >
            <Plus size={16} />
            Nova Propriedade
          </Button>
        )}
      </div>

      <div className="p-3 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 rounded-md flex items-start gap-3">
        <Info size={14} className="text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Propriedades são instâncias físicas que agrupam ativos e geram protocolos de manutenção.
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
                className="shadow-none border-border hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors cursor-pointer group"
                onClick={() => setSelectedProperty(prop)}
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-muted-foreground shrink-0 border border-border">
                      <Building2 size={18} />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[9px] font-mono font-bold text-muted-foreground">#{prop.codigo}</span>
                      {highRisk > 0 && ( highRisk > 0 && (
                        <Badge variant="destructive" className="h-4 text-[8px] px-1 font-bold">
                          {highRisk} CRITICAL
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-semibold text-sm tracking-tight truncate leading-none mb-1">
                      {prop.endereco}
                    </h3>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                      {prop.inquilino || 'Sem Responsável'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Cpu size={12} className="text-muted-foreground" />
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {propAssets.length} {propAssets.length === 1 ? 'Ativo' : 'Ativos'}
                      </span>
                    </div>
                    <ChevronRight size={14} className="text-muted-foreground/30 group-hover:text-foreground transition-colors" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Property Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Propriedade</DialogTitle>
            <DialogDescription>Registar nova unidade física no sistema.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Código Interno</Label>
              <Input
                required
                value={formData.codigo}
                onChange={e => setFormData({ ...formData, codigo: e.target.value })}
                placeholder="ex: PR-01"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Endereço / Nome</Label>
              <Input
                required
                value={formData.endereco}
                onChange={e => setFormData({ ...formData, endereco: e.target.value })}
                placeholder="Nome da instalação"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Inquilino</Label>
                <Input
                  value={formData.inquilino}
                  onChange={e => setFormData({ ...formData, inquilino: e.target.value })}
                  placeholder="Responsável"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Referência</Label>
                <Input
                  value={formData.referencia_interna}
                  onChange={e => setFormData({ ...formData, referencia_interna: e.target.value })}
                  placeholder="ID Externo"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? 'Registar...' : 'Adicionar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
