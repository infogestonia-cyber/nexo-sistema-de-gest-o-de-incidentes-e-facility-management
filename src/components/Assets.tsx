import React, { useState, useEffect } from 'react';
import { Plus, Cpu, MapPin, Calendar, Activity, Search, Filter, MoreVertical, LayoutGrid, List as ListIcon, X, Zap, ArrowUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ASSET_CATEGORIES } from '../constants';
import DigitalTwin from './DigitalTwin';
import { canCreateAssets } from '../utils/permissions';

// --- shadcn UI imports ---
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Separator } from './ui/separator';

export default function Assets({ 
  propertyId, 
  onClearFilter, 
  initialAsset, 
  onClearAsset 
}: { 
  propertyId?: string | null, 
  onClearFilter?: () => void,
  initialAsset?: any,
  onClearAsset?: () => void
}) {
  const [assets, setAssets] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [submitting, setSubmitting] = useState(false);
  const [dynamicCategories, setDynamicCategories] = useState<string[]>(ASSET_CATEGORIES);
  const [search, setSearch] = useState('');
  
  const [user] = useState<any>(() => {
    try {
      const u = localStorage.getItem('user');
      return u && u !== 'undefined' ? JSON.parse(u) : {};
    } catch { return {}; }
  });
  
  const [formData, setFormData] = useState({
    nome: '',
    categoria: ASSET_CATEGORIES[0],
    property_id: propertyId?.toString() || '',
    localizacao_detalhada: '',
    data_instalacao: new Date().toISOString().split('T')[0],
    probabilidade_falha: 'Baixa',
    sinais_alerta: '',
    parent_id: '',
    obsoleto: false,
    data_obsolescencia: ''
  });

  useEffect(() => {
    fetchAssets();
    fetchProperties();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (propertyId) {
      setFormData(prev => ({ ...prev, property_id: propertyId.toString() }));
    }
  }, [propertyId]);

  useEffect(() => {
    if (initialAsset) {
      setSelectedAsset(initialAsset);
    }
  }, [initialAsset]);

  const handleBack = () => {
    setSelectedAsset(null);
    if (onClearAsset) onClearAsset();
  };

  const fetchAssets = async () => {
    try {
      const res = await fetch('/api/assets', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = res.ok ? await res.json() : [];
      setAssets(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setAssets([]);
    }
  };

  const fetchProperties = async () => {
    try {
      const res = await fetch('/api/properties', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = res.ok ? await res.json() : [];
      setProperties(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setProperties([]);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/settings', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const settings = await res.json();
        const catSetting = settings.find((s: any) => s.setting_key === 'asset_categories');
        if (catSetting && Array.isArray(catSetting.setting_value)) {
          setDynamicCategories(catSetting.setting_value);
          setFormData(prev => ({ 
            ...prev, 
            categoria: prev.categoria || catSetting.setting_value[0] || ASSET_CATEGORIES[0] 
          }));
        }
      }
    } catch (e) {
      console.error("Erro ao carregar categorias:", e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchAssets();
        setFormData({ 
          nome: '', 
          categoria: dynamicCategories[0] || ASSET_CATEGORIES[0], 
          property_id: propertyId?.toString() || '',
          localizacao_detalhada: '', 
          sinais_alerta: '', 
          parent_id: '', 
          obsoleto: false, 
          data_obsolescencia: '',
          data_instalacao: new Date().toISOString().split('T')[0],
          probabilidade_falha: 'Baixa'
        });
      } else {
        const errorData = await res.json();
        console.error(errorData.error || 'Erro ao adicionar ativo');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAssets = (propertyId
    ? assets.filter(a => String(a.property_id) === String(propertyId))
    : assets).filter(a => 
      !search || 
      a.nome?.toLowerCase().includes(search.toLowerCase()) || 
      a.categoria?.toLowerCase().includes(search.toLowerCase())
    );

  if (selectedAsset) {
    return <DigitalTwin asset={selectedAsset} onBack={handleBack} />;
  }

  return (
    <div className="space-y-6">
      {/* Header - Industrial Minimalism */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-6">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 w-3.5 h-3.5 group-focus-within:text-primary transition-colors" />
            <Input
              type="text"
              placeholder="Pesquisar ativos..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 w-64 h-9 text-xs bg-muted/10 border-border/50 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all shadow-none"
            />
          </div>
          {propertyId && (
            <Badge variant="secondary" className="h-9 px-3 gap-2 bg-primary/10 text-primary border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors" onClick={onClearFilter}>
              Filtro Local <X size={12} />
            </Badge>
          )}
          <div className="flex bg-muted/20 p-1 border border-border/50 rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
              className={`h-7 w-7 transition-all ${viewMode === 'grid' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
            >
              <LayoutGrid size={13} />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
              className={`h-7 w-7 transition-all ${viewMode === 'list' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
            >
              <ListIcon size={13} />
            </Button>
          </div>
        </div>
        {canCreateAssets(user.perfil) && (
          <Button
            onClick={() => setIsModalOpen(true)}
            className="h-9 gap-2 text-xs font-bold shadow-lg shadow-primary/10"
          >
            <Plus size={16} />
            Inicializar Ativo
          </Button>
        )}
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAssets.map((asset) => (
            <Card 
              key={asset.id}
              onClick={() => setSelectedAsset(asset)}
              className="shadow-sm border-border bg-card/50 backdrop-blur-sm card-shine hover:border-primary/20 transition-all cursor-pointer group"
            >
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                    <Cpu size={18} />
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`text-[9px] px-1.5 py-0 h-4 uppercase border-none ${
                        asset.probabilidade_falha === 'Alta' ? 'bg-rose-500/15 text-rose-500' :
                        asset.probabilidade_falha === 'Média' ? 'bg-amber-500/15 text-amber-500' :
                        'bg-emerald-500/15 text-emerald-500'
                    }`}
                  >
                    {asset.probabilidade_falha}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm tracking-tight truncate leading-none mb-1 group-hover:text-primary transition-colors">
                      {asset.nome}
                    </h3>
                  </div>
                  <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-black">
                    {asset.categoria}
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70 font-medium">
                    <MapPin size={11} className="text-muted-foreground/30" />
                    <span className="truncate">{asset.property_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70 font-medium">
                    <Calendar size={11} className="text-muted-foreground/30" />
                    <span>Instalado: {asset.data_instalacao}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                    <Zap size={12} className="text-primary" />
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Digital Twin</span>
                  </div>
                  {asset.obsoleto && <Badge variant="secondary" className="text-[8px] h-3.5 px-1.5 font-black bg-rose-500/10 text-rose-500 border-none uppercase tracking-tighter">Obsoleto</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="shadow-sm border-border bg-card/50 backdrop-blur-sm card-shine overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow className="hover:bg-transparent border-border/50 border-b">
                <TableHead className="text-[10px] uppercase font-bold h-10 tracking-widest px-4">Ativo</TableHead>
                <TableHead className="text-[10px] uppercase font-bold h-10 tracking-widest">Categoria</TableHead>
                <TableHead className="text-[10px] uppercase font-bold h-10 tracking-widest">Localização</TableHead>
                <TableHead className="text-[10px] uppercase font-bold h-10 tracking-widest">Estado (Risco)</TableHead>
                <TableHead className="text-[10px] uppercase font-bold h-10 tracking-widest text-right pr-4">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssets.map((asset) => (
                <TableRow 
                  key={asset.id} 
                  className="cursor-pointer group h-12"
                  onClick={() => setSelectedAsset(asset)}
                >
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 group-hover:scale-105 transition-transform shrink-0">
                        <Cpu size={14} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-xs truncate group-hover:text-primary transition-colors">{asset.nome}</span>
                        {asset.obsoleto && <span className="text-[8px] text-rose-500 font-bold uppercase tracking-widest">Descontinuado</span>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">{asset.categoria}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-medium text-muted-foreground/80">{asset.property_name}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                       <Badge 
                        variant="outline" 
                        className={`text-[9px] h-4 uppercase font-bold border-none ${
                            asset.probabilidade_falha === 'Alta' ? 'bg-rose-500/15 text-rose-500' :
                            asset.probabilidade_falha === 'Média' ? 'bg-amber-500/15 text-amber-500' :
                            'bg-emerald-500/15 text-emerald-500'
                        }`}
                      >
                        {asset.probabilidade_falha}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/30 group-hover:text-foreground">
                      <MoreVertical size={14} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Modal Novo Ativo */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl">
          <DialogHeader className="space-y-1">
             <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                   <Cpu size={20} />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold tracking-tight">Inicializar Ativo</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground/60">Registar novo equipamento no inventário técnico do sistema.</DialogDescription>
                </div>
             </div>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2.5">
                <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/50 ml-1">Nome do Equipamento</Label>
                <Input
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="ex: Gerador Caterpillar 500kVA"
                  className="h-10 bg-muted/10 border-border/50 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all font-medium"
                />
              </div>
              <div className="space-y-2.5">
                <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/50 ml-1">Categoria</Label>
                <Select 
                  value={formData.categoria} 
                  onValueChange={(val) => setFormData({ ...formData, categoria: val })}
                >
                  <SelectTrigger className="h-10 bg-muted/10 border-border/50 focus:ring-1 focus:ring-primary/20">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {dynamicCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2.5">
                <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/50 ml-1">Propriedade Vinculada</Label>
                <Select 
                  value={formData.property_id} 
                  onValueChange={(val) => setFormData({ ...formData, property_id: val })}
                  required
                >
                  <SelectTrigger className="h-10 bg-muted/10 border-border/50 focus:ring-1 focus:ring-primary/20">
                    <SelectValue placeholder="Vincular a unidade..." />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.endereco}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2.5">
                <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/50 ml-1">Data de Instalação</Label>
                <Input
                  type="date"
                  value={formData.data_instalacao}
                  onChange={(e) => setFormData({ ...formData, data_instalacao: e.target.value })}
                  className="h-10 bg-muted/10 border-border/50 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
                />
              </div>
            </div>
            
            <Separator className="bg-border/30" />

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                 <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Estado de Vida Útil</h3>
                 <div className="flex items-center space-x-2.5">
                    <Checkbox 
                      id="obsoleto" 
                      checked={formData.obsoleto}
                      onCheckedChange={(checked) => setFormData({ ...formData, obsoleto: !!checked })}
                      className="border-border/50 data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500"
                    />
                    <label htmlFor="obsoleto" className="text-xs font-bold text-muted-foreground/80 cursor-pointer select-none">
                      Equipamento Obsoleto
                    </label>
                 </div>
              </div>
              
              {formData.obsoleto && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2 max-w-xs"
                >
                  <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/50 ml-1">Data de Obsolescência</Label>
                  <Input
                    required
                    type="date"
                    value={formData.data_obsolescencia}
                    onChange={(e) => setFormData({ ...formData, data_obsolescencia: e.target.value })}
                    className="h-10 bg-rose-500/5 border-rose-500/20 focus-visible:ring-rose-500/30 text-rose-500"
                  />
                </motion.div>
              )}
            </div>

            <DialogFooter className="gap-3 pt-6 border-t border-border/30">
              <Button type="button" variant="ghost" className="flex-1 text-xs font-semibold h-10" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={submitting} className="flex-1 font-bold h-10 shadow-lg shadow-primary/20">
                {submitting ? 'A processar...' : 'Confirmar Inventário'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
