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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
            <Input
              type="text"
              placeholder="Pesquisar ativos..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 w-64 h-9 text-xs bg-muted/20 border-border"
            />
          </div>
          {propertyId && (
            <Badge variant="secondary" className="h-9 px-3 gap-2 bg-primary/10 text-primary border-primary/20 cursor-pointer" onClick={onClearFilter}>
              Filtro Ativo <X size={12} />
            </Badge>
          )}
          <div className="flex bg-muted/20 p-1 border border-border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
              className="h-7 w-7"
            >
              <LayoutGrid size={13} />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
              className="h-7 w-7"
            >
              <ListIcon size={13} />
            </Button>
          </div>
        </div>
        {canCreateAssets(user.perfil) && (
          <Button
            onClick={() => setIsModalOpen(true)}
            className="h-9 gap-2 text-xs font-bold"
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
              className="shadow-none border-border hover:border-zinc-400 dark:hover:border-zinc-600 transition-all cursor-pointer group rounded-none"
            >
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-muted-foreground border border-border">
                    <Cpu size={18} />
                  </div>
                  <Badge variant={asset.probabilidade_falha === 'Alta' ? 'destructive' : 'outline'} className="text-[9px] px-1.5 py-0 h-4 uppercase">
                    {asset.probabilidade_falha}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm tracking-tight truncate leading-none mb-1 group-hover:text-primary transition-colors">
                      {asset.nome}
                    </h3>
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                    {asset.categoria}
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <MapPin size={11} className="text-muted-foreground/50" />
                    <span className="truncate">{asset.property_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Calendar size={11} className="text-muted-foreground/50" />
                    <span>Instalado: {asset.data_instalacao}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                    <Activity size={12} className="text-muted-foreground" />
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Ver Digital Twin</span>
                  </div>
                  {asset.obsoleto && <Badge variant="secondary" className="text-[8px] h-3.5 px-1 bg-zinc-200 dark:bg-zinc-800">OBSOLETO</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="shadow-none border-border overflow-hidden rounded-none">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[10px] uppercase font-bold h-10">Ativo</TableHead>
                <TableHead className="text-[10px] uppercase font-bold h-10">Categoria</TableHead>
                <TableHead className="text-[10px] uppercase font-bold h-10">Propriedade</TableHead>
                <TableHead className="text-[10px] uppercase font-bold h-10">Risco</TableHead>
                <TableHead className="text-[10px] uppercase font-bold h-10 text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssets.map((asset) => (
                <TableRow 
                  key={asset.id} 
                  className="cursor-pointer group h-12"
                  onClick={() => setSelectedAsset(asset)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-muted-foreground border border-border group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                        <Cpu size={14} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-xs truncate">{asset.nome}</span>
                        {asset.obsoleto && <span className="text-[8px] text-destructive font-bold uppercase tracking-tighter">Obsoleto</span>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{asset.categoria}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">{asset.property_name}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        asset.probabilidade_falha === 'Alta' ? 'bg-destructive' :
                        asset.probabilidade_falha === 'Média' ? 'bg-amber-500' : 'bg-primary'
                      }`}></div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">{asset.probabilidade_falha}</span>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Inicializar Ativo</DialogTitle>
            <DialogDescription>Registar novo equipamento ou componente técnico no sistema.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Nome do Ativo</Label>
                <Input
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="ex: Gerador Caterpillar 500kVA"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Categoria</Label>
                <Select 
                  value={formData.categoria} 
                  onValueChange={(val) => setFormData({ ...formData, categoria: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {dynamicCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Propriedade Vinculada</Label>
                <Select 
                  value={formData.property_id} 
                  onValueChange={(val) => setFormData({ ...formData, property_id: val })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Vincular a unidade..." />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.endereco}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Data de Instalação</Label>
                <Input
                  type="date"
                  value={formData.data_instalacao}
                  onChange={(e) => setFormData({ ...formData, data_instalacao: e.target.value })}
                />
              </div>
            </div>
            
            <Separator />

            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Ciclo de Vida e Obsolescência</h3>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="obsoleto" 
                  checked={formData.obsoleto}
                  onCheckedChange={(checked) => setFormData({ ...formData, obsoleto: !!checked })}
                />
                <label htmlFor="obsoleto" className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Marcar como equipamento obsoleto
                </label>
              </div>
              
              {formData.obsoleto && (
                <div className="space-y-2 max-w-xs animate-in fade-in slide-in-from-top-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Data de Obsolescência</Label>
                  <Input
                    required
                    type="date"
                    value={formData.data_obsolescencia}
                    onChange={(e) => setFormData({ ...formData, data_obsolescencia: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? 'A processar...' : 'Confirmar Registo'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
