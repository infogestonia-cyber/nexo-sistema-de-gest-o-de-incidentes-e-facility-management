import React, { useState, useEffect } from 'react';
import { Plus, Cpu, MapPin, Calendar, Activity, Search, Filter, MoreVertical, LayoutGrid, List as ListIcon, X, Zap, ArrowUpDown, Download, FileSpreadsheet, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ASSET_CATEGORIES } from '../constants';
import DigitalTwin from './DigitalTwin';
import { canCreateAssets } from '../utils/permissions';
import * as XLSX from 'xlsx';

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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from './ui/dropdown-menu';

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
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' | null }>({ key: '', direction: null });
  const [assetFilter, setAssetFilter] = useState<'all' | 'active' | 'obsolete'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  
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
    fetchCompanyInfo();
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

  const fetchCompanyInfo = async () => {
    try {
      const res = await fetch('/api/company-info', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) setCompanyInfo(await res.json());
    } catch (e) { console.error(e); }
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

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const exportToCSV = () => {
    const reportTitle = "Relatório de Inventário de Ativos";
    const extractionDate = new Date().toLocaleString();
    
    // Create an array of arrays representing the grid
    // Row indices: 1-indexed for clarity
    const grid: any[][] = [];

    // Ensure empty rows are represented by empty arrays
    for (let i = 0; i < 26; i++) grid[i] = [];

    // Row 2 (index 1): Column B (index 1) = Company Name
    grid[1][1] = companyInfo?.nome || 'Platinum Group';
    
    // Row 3 (index 2): Column B = Address
    grid[2][1] = companyInfo?.endereco || 'Av. Mao-Tsé-Tung, 11ESQ, Maputo';
    
    // Row 4 (index 3): Column B = Phone
    grid[3][1] = `Telefone: ${companyInfo?.telefone || '+258 84 000 0000'}`;
    
    // Row 5 (index 4): Column B = Date
    grid[4][1] = `Data de Extracção: ${extractionDate}`;

    // Row 8 (index 7): Centered title
    // In AOC, "centering" for CSV/XLSX usually means placing in a middle column or merging
    // We'll place it in Column D/E area (index 3/4) to appear centered relative to a 6-col table
    grid[7][3] = reportTitle;

    // Row 10 (index 9): Headers starting from Column B
    grid[9] = [
      '', // Column A
      'Nome', 
      'Categoria', 
      'Localização', 
      'Data de Instalação', 
      'Estado (Risco)', 
      'Status'
    ];

    // Rows 11+ (index 10+): Data starting from Column B
    sortedAndFilteredAssets.forEach((a, idx) => {
      grid[10 + idx] = [
        '', // Column A
        a.nome,
        a.categoria,
        a.property_name,
        a.data_instalacao,
        a.probabilidade_falha,
        a.obsoleto ? 'Obsoleto' : 'Ativo'
      ];
    });

    const worksheet = XLSX.utils.aoa_to_sheet(grid);
    
    // Column widths (A: index 0, B: index 1, etc.)
    worksheet['!cols'] = [
      { wch: 5 },  // A (Narrow)
      { wch: 35 }, // B (Nome)
      { wch: 20 }, // C (Categoria)
      { wch: 30 }, // D (Localização)
      { wch: 18 }, // E (Data)
      { wch: 15 }, // F (Risco)
      { wch: 10 }  // G (Status)
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ativos");
    XLSX.writeFile(workbook, `Inventario_Ativos_${new Date().toISOString().split('T')[0]}.xlsx`);
  };


  const filteredAssets = (propertyId
    ? assets.filter(a => String(a.property_id) === String(propertyId))
    : assets).filter(a => {
      const matchesSearch = !search || 
        a.nome?.toLowerCase().includes(search.toLowerCase()) || 
        a.categoria?.toLowerCase().includes(search.toLowerCase());
      
      const matchesObsolescence = 
        assetFilter === 'all' ? true :
        assetFilter === 'active' ? !a.obsoleto :
        a.obsoleto;

      return matchesSearch && matchesObsolescence;
    });

  const sortedAndFilteredAssets = [...filteredAssets].sort((a, b) => {
    if (!sortConfig.key || !sortConfig.direction) return 0;
    
    const aValue = a[sortConfig.key]?.toString().toLowerCase() || '';
    const bValue = b[sortConfig.key]?.toString().toLowerCase() || '';
    
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedAndFilteredAssets.length / itemsPerPage);
  const paginatedAssets = sortedAndFilteredAssets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, assetFilter, sortConfig]);

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
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2 text-xs border-border/50 bg-muted/5 hover:bg-muted/10 transition-colors">
                <Download size={14} className="text-muted-foreground" />
                <span>Exportar</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl p-1">
              <DropdownMenuLabel className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/50 px-2 py-1.5">Formato de Ficheiro</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/30" />
              <DropdownMenuItem onClick={exportToCSV} className="flex items-center gap-2 text-xs font-medium cursor-pointer focus:bg-primary/5 focus:text-primary py-2 px-2 rounded-sm transition-colors">
                <FileSpreadsheet size={14} className="text-emerald-500" />
                <span>Exportar CSV (.csv)</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-4 bg-border/50" />

          <Select value={assetFilter} onValueChange={(val: any) => setAssetFilter(val)}>
            <SelectTrigger className="h-9 w-32 text-[10px] uppercase font-bold tracking-widest bg-muted/20 border-border/50 focus:ring-1 focus:ring-primary/20">
              <div className="flex items-center gap-2">
                <Filter size={12} className="text-muted-foreground/50" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-[10px] uppercase font-bold">Todos</SelectItem>
              <SelectItem value="active" className="text-[10px] uppercase font-bold">Ativos</SelectItem>
              <SelectItem value="obsolete" className="text-[10px] uppercase font-bold text-rose-500">Obsoletos</SelectItem>
            </SelectContent>
          </Select>
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
          {paginatedAssets.map((asset) => (
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
                <TableHead 
                  className="text-[10px] uppercase font-bold h-10 tracking-widest px-4 cursor-pointer hover:text-primary transition-colors group/th"
                  onClick={() => handleSort('nome')}
                >
                  <div className="flex items-center gap-2">
                    Ativo
                    <ArrowUpDown size={10} className={`transition-opacity ${sortConfig.key === 'nome' ? 'opacity-100' : 'opacity-0 group-hover/th:opacity-50'}`} />
                  </div>
                </TableHead>
                <TableHead 
                  className="text-[10px] uppercase font-bold h-10 tracking-widest cursor-pointer hover:text-primary transition-colors group/th"
                   onClick={() => handleSort('categoria')}
                >
                  <div className="flex items-center gap-2">
                    Categoria
                    <ArrowUpDown size={10} className={`transition-opacity ${sortConfig.key === 'categoria' ? 'opacity-100' : 'opacity-0 group-hover/th:opacity-50'}`} />
                  </div>
                </TableHead>
                <TableHead 
                  className="text-[10px] uppercase font-bold h-10 tracking-widest cursor-pointer hover:text-primary transition-colors group/th"
                  onClick={() => handleSort('property_name')}
                >
                  <div className="flex items-center gap-2">
                    Localização
                    <ArrowUpDown size={10} className={`transition-opacity ${sortConfig.key === 'property_name' ? 'opacity-100' : 'opacity-0 group-hover/th:opacity-50'}`} />
                  </div>
                </TableHead>
                <TableHead 
                  className="text-[10px] uppercase font-bold h-10 tracking-widest cursor-pointer hover:text-primary transition-colors group/th"
                  onClick={() => handleSort('probabilidade_falha')}
                >
                  <div className="flex items-center gap-2">
                    Estado (Risco)
                    <ArrowUpDown size={10} className={`transition-opacity ${sortConfig.key === 'probabilidade_falha' ? 'opacity-100' : 'opacity-0 group-hover/th:opacity-50'}`} />
                  </div>
                </TableHead>
                <TableHead className="text-[10px] uppercase font-bold h-10 tracking-widest text-right pr-4">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedAssets.map((asset) => (
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

      {/* Pagination Control */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-6 border-t border-border/30">
          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/50">
            Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, sortedAndFilteredAssets.length)} de {sortedAndFilteredAssets.length} ativos
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 px-3 gap-1.5 text-[10px] uppercase font-bold tracking-tighter border-border/50 hover:bg-muted/10"
            >
              <ChevronLeft size={12} /> Anterior
            </Button>
            <div className="flex items-center gap-1 mx-2">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-7 h-7 rounded-md text-[10px] font-bold transition-all ${
                    currentPage === i + 1 
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                      : 'text-muted-foreground hover:bg-muted/10'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8 px-3 gap-1.5 text-[10px] uppercase font-bold tracking-tighter border-border/50 hover:bg-muted/10"
            >
              Próximo <ChevronRight size={12} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
