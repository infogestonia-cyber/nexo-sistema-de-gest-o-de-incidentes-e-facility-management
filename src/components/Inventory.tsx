import React, { useState, useEffect } from 'react';
import { 
  Plus, Package, Search, Filter, LayoutGrid, List as ListIcon, 
  X, AlertTriangle, ArrowUpRight, ArrowDownRight, ShoppingCart, 
  DollarSign, Layers, MoreVertical, Edit3, Trash2, Download, 
  Upload, MoreHorizontal, History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { INVENTORY_CATEGORIES } from '../constants';
import socket from '../services/socketService';

// --- shadcn UI imports ---
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Separator } from './ui/separator';
import { Pagination } from './ui/Pagination';
import { RefreshButton } from './ui/RefreshButton';

export default function Inventory() {
  const [items, setItems] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockAction, setStockAction] = useState<{ id: string, type: 'add' | 'remove', quantity: number }>({ id: '', type: 'add', quantity: 1 });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const defaultFormData = {
    nome: '',
    categoria: INVENTORY_CATEGORIES[0],
    quantidade: '0',
    stock_minimo: '0',
    preco_compra: '0',
    preco_venda: '0',
    property_id: '',
    asset_id: ''
  };

  const [formData, setFormData] = useState(defaultFormData);

  useEffect(() => {
    fetchInventory();
    fetchSupportData();
    socket.on("inventory-update", () => fetchInventory());
    return () => { socket.off("inventory-update"); };
  }, []);

  const fetchSupportData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${(sessionStorage.getItem('token') || localStorage.getItem('token'))}` };
      const [pRes, aRes] = await Promise.all([
        fetch('/api/properties', { headers }),
        fetch('/api/assets', { headers })
      ]);
      const pData = pRes.ok ? await pRes.json() : [];
      const aData = aRes.ok ? await aRes.json() : [];
      setProperties(Array.isArray(pData) ? pData : []);
      setAssets(Array.isArray(aData) ? aData : []);
    } catch (e) { console.error(e); }
  };

  const fetchInventory = async () => {
    try {
      const res = await fetch('/api/inventory', {
        headers: { 'Authorization': `Bearer ${(sessionStorage.getItem('token') || localStorage.getItem('token'))}` }
      });
      const data = res.ok ? await res.json() : [];
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.property_id) return;
    const isEditing = !!selectedItem;
    const endpoint = isEditing ? `/api/inventory/${selectedItem.id}` : '/api/inventory';
    setSubmitting(true);
    try {
      const res = await fetch(endpoint, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(sessionStorage.getItem('token') || localStorage.getItem('token'))}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchInventory();
        setSelectedItem(null);
        setFormData(defaultFormData);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleStockAdjust = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/inventory/${stockAction.id}/stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(sessionStorage.getItem('token') || localStorage.getItem('token'))}`
        },
        body: JSON.stringify({
          quantity_change: stockAction.quantity,
          type: stockAction.type
        })
      });
      if (res.ok) {
        setIsStockModalOpen(false);
        fetchInventory();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: any) => {
    setSelectedItem(item);
    setFormData({
      nome: item.nome || '',
      categoria: item.categoria || INVENTORY_CATEGORIES[0],
      quantidade: item.quantidade?.toString() ?? '0',
      stock_minimo: item.stock_minimo?.toString() ?? '0',
      preco_compra: item.preco_compra?.toString() ?? '0',
      preco_venda: item.preco_venda?.toString() ?? '0',
      property_id: item.property_id || '',
      asset_id: item.asset_id || ''
    });
    setIsModalOpen(true);
  };

  const handleExport = () => {
    const csvHeaders = ['Nome', 'Categoria', 'Quantidade', 'Stock Minimo', 'Propriedade', 'Ativo'];
    const csvRows = items.map(i => [i.nome, i.categoria, i.quantidade, i.stock_minimo, i.property_name, i.asset_name].join(','));
    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventario_${new Date().getTime()}.csv`;
    link.click();
  };

  const filteredItems = items.filter(item =>
    !searchTerm ||
    item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalValue = items.reduce((acc, item) => acc + (parseFloat(item.preco_compra || 0) * item.quantidade), 0);
  const lowStockCount = items.filter(item => item.quantidade <= item.stock_minimo).length;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
            <Input
              placeholder="Pesquisar material..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-64 h-9 text-xs bg-muted/20 border-border"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RefreshButton onClick={fetchInventory} loading={loading} />
          <Button variant="outline" size="sm" className="h-9 gap-2 text-xs" onClick={handleExport}>
            <Download size={14} />
            Exportar CSV
          </Button>
          <Button size="sm" className="h-9 gap-2 text-xs font-bold" onClick={() => { setSelectedItem(null); setFormData(defaultFormData); setIsModalOpen(true); }}>
            <Plus size={16} />
            Registar Material
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total de Itens', value: items.length, icon: Package, color: 'text-foreground' },
          { label: 'Stock Baixo', value: lowStockCount, icon: AlertTriangle, color: lowStockCount > 0 ? 'text-destructive' : 'text-muted-foreground' },
          { label: 'Valor em Stock', value: `${totalValue.toLocaleString()} MT`, icon: DollarSign, color: 'text-success' },
          { label: 'Categorias', value: INVENTORY_CATEGORIES.length, icon: Layers, color: 'text-foreground' },
        ].map((s, i) => (
          <Card key={i} className="shadow-none border-border">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{s.label}</p>
                <p className={`text-sm font-bold mt-1 ${s.color}`}>{s.value}</p>
              </div>
              <s.icon size={18} className="text-muted-foreground/30" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card className="shadow-none border-border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[10px] uppercase font-bold h-10">Material</TableHead>
              <TableHead className="text-[10px] uppercase font-bold h-10">Categoria</TableHead>
              <TableHead className="text-[10px] uppercase font-bold h-10">Stock / Mínimo</TableHead>
              <TableHead className="text-[10px] uppercase font-bold h-10">Localização</TableHead>
              <TableHead className="text-[10px] uppercase font-bold h-10 text-right">Preço Compra</TableHead>
              <TableHead className="w-12 h-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic text-xs">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sincronizando stock...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedItems.length > 0 ? (
              paginatedItems.map((item) => (
                <TableRow key={item.id} className="group h-14">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-muted border border-border flex items-center justify-center text-muted-foreground">
                        <Package size={14} />
                      </div>
                      <span className="text-xs font-semibold">{item.nome}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[9px] h-4 uppercase font-bold bg-muted/20">
                      {item.categoria}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${item.quantidade <= item.stock_minimo ? 'text-destructive' : 'text-foreground'}`}>
                        {item.quantidade}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium">/ {item.stock_minimo}</span>
                      {item.quantidade <= item.stock_minimo && <AlertTriangle size={12} className="text-destructive animate-pulse" />}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase truncate max-w-[150px]">{item.property_name || 'Geral'}</span>
                      <span className="text-[9px] text-muted-foreground truncate max-w-[150px]">{item.asset_name || 'Sem ativo fixo'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-bold">
                    {(parseFloat(item.preco_compra) || 0).toLocaleString()} MT
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/30 group-hover:text-foreground">
                          <MoreVertical size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 text-xs">
                        <DropdownMenuLabel>Gestão de Stock</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { setStockAction({ id: item.id, type: 'add', quantity: 1 }); setIsStockModalOpen(true); }}>
                          <Plus size={14} className="mr-2" /> Adicionar Entrada
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setStockAction({ id: item.id, type: 'remove', quantity: 1 }); setIsStockModalOpen(true); }}>
                          <ArrowDownRight size={14} className="mr-2" /> Registar Saída
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleEdit(item)}>
                          <Edit3 size={14} className="mr-2" /> Editar Item
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 size={14} className="mr-2" /> Eliminar Registo
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic text-xs">
                  Nenhum material encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Pagination
        currentPage={currentPage}
        totalItems={filteredItems.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />

      {/* Main Item Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl">
           <DialogHeader>
            <DialogTitle>{selectedItem ? 'Editar Material' : 'Registo de Material'}</DialogTitle>
            <DialogDescription>Configure os detalhes técnicos e financeiros do material de inventário.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Propriedade / Unidade *</Label>
                <Select value={formData.property_id} onValueChange={val => setFormData({...formData, property_id: val, asset_id: ''})}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {properties.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.endereco}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Ativo Vinculado (Opcional)</Label>
                <Select value={formData.asset_id} onValueChange={val => setFormData({...formData, asset_id: val})} disabled={!formData.property_id}>
                  <SelectTrigger><SelectValue placeholder="Sem ativo fixo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {assets.filter(a => a.property_id.toString() === formData.property_id).map(a => (
                      <SelectItem key={a.id} value={a.id.toString()}>{a.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Nome do Material</Label>
                <Input required value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} placeholder="ex: Lâmpada LED 12W" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Categoria</Label>
                <Select value={formData.categoria} onValueChange={val => setFormData({...formData, categoria: val})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INVENTORY_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Preço de Compra (MZN)</Label>
                <Input type="number" step="0.01" value={formData.preco_compra} onChange={e => setFormData({...formData, preco_compra: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Stock Atual</Label>
                <Input type="number" value={formData.quantidade} onChange={e => setFormData({...formData, quantidade: e.target.value})} disabled={!!selectedItem} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Stock Mínimo (Alerta)</Label>
                <Input type="number" value={formData.stock_minimo} onChange={e => setFormData({...formData, stock_minimo: e.target.value})} />
              </div>
            </div>
            <DialogFooter className="gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={submitting} className="flex-1 font-bold">
                {submitting ? 'A processar...' : 'Guardar Material'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stock Adjust Modal */}
      <Dialog open={isStockModalOpen} onOpenChange={setIsStockModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Movimentação de Stock</DialogTitle>
            <DialogDescription>Registe a entrada ou saída manual de material.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="flex bg-muted p-1 rounded-md border border-border">
               <Button variant={stockAction.type === 'add' ? 'secondary' : 'ghost'} size="sm" className="flex-1 text-[10px] uppercase font-bold h-7" onClick={() => setStockAction({...stockAction, type: 'add'})}>Entrada</Button>
               <Button variant={stockAction.type === 'remove' ? 'secondary' : 'ghost'} size="sm" className="flex-1 text-[10px] uppercase font-bold h-7" onClick={() => setStockAction({...stockAction, type: 'remove'})}>Saída</Button>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Quantidade</Label>
              <Input type="number" min="1" value={stockAction.quantity} onChange={e => setStockAction({...stockAction, quantity: parseInt(e.target.value) || 1})} />
            </div>
            <Button onClick={handleStockAdjust} disabled={submitting} variant={stockAction.type === 'add' ? 'default' : 'destructive'} className="w-full font-bold uppercase tracking-widest text-xs h-10">
              {submitting ? 'A processar...' : 'Confirmar Movimentação'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
