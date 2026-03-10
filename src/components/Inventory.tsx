import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Package, 
  Search, 
  Filter, 
  LayoutGrid, 
  List as ListIcon, 
  X, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight,
  ShoppingCart,
  DollarSign,
  Layers,
  MoreVertical,
  Trash2,
  Download,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { INVENTORY_CATEGORIES } from '../constants';

export default function Inventory() {
  const [items, setItems] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockAction, setStockAction] = useState<{id: string, type: 'add' | 'remove', quantity: number}>({id: '', type: 'add', quantity: 1});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: INVENTORY_CATEGORIES[0],
    unit_cost: '0',
    quantity_on_hand: '0',
    min_quantity: '0',
    image_url: ''
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await fetch('/api/inventory', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error('Erro ao procurar inventário:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchInventory();
        setFormData({
          name: '',
          sku: '',
          category: INVENTORY_CATEGORIES[0],
          unit_cost: '0',
          quantity_on_hand: '0',
          min_quantity: '0',
          image_url: ''
        });
      }
    } catch (err) {
      console.error(err);
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
          'Authorization': `Bearer ${localStorage.getItem('token')}`
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
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    if (items.length === 0) return;
    const headers = ['Nome', 'SKU', 'Categoria', 'Custo Unitario', 'Quantidade', 'Minimo'];
    const rows = items.map(i => [i.name, i.sku, i.category, i.unit_cost, i.quantity_on_hand, i.min_quantity]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `inventario_nexo.csv`;
    link.click();
    showToast('✅ Exportação concluída!');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const rows = text.split('\n').filter(r => r.trim()).slice(1);
      const newItems = rows.map(r => {
        const [name, sku, cat, cost, qty, min] = r.split(',');
        if (!name) return null;
        return { name: name.trim(), sku: sku?.trim() || 'N/A', category: cat?.trim() || INVENTORY_CATEGORIES[0], unit_cost: parseFloat(cost) || 0, quantity_on_hand: parseInt(qty) || 0, min_quantity: parseInt(min) || 0 };
      }).filter(Boolean);

      if (newItems.length === 0) return showToast('Nenhum dado válido.', 'error');
      
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        for (const item of newItems) {
          await fetch('/api/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(item)
          });
        }
        showToast(`✅ ${newItems.length} itens importados!`);
        fetchInventory();
      } catch { showToast('Erro na importação.', 'error'); }
      finally { setLoading(false); }
    };
    reader.readAsText(file);
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalValue = items.reduce((acc, item) => acc + (item.unit_cost * item.quantity_on_hand), 0);
  const lowStockItems = items.filter(item => item.quantity_on_hand <= item.min_quantity).length;
  const totalStock = items.reduce((acc, item) => acc + item.quantity_on_hand, 0);

  return (
    <div className="space-y-6 page-enter">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className={`fixed top-4 right-4 z-[200] px-5 py-3 text-sm font-bold text-white shadow-2xl border ${toast.type === 'error' ? 'bg-red-900 border-red-500/30' : 'bg-brand-surface border-brand-border'}`}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-brand-surface border border-brand-border p-5 group hover:border-emerald-500/30 transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
              <Package size={20} />
            </div>
          </div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total de Itens</p>
          <h3 className="text-2xl font-bold text-white mt-1">{items.length}</h3>
        </div>

        <div className="bg-brand-surface border border-brand-border p-5 group hover:border-emerald-500/30 transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
              <Layers size={20} />
            </div>
          </div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Stock Total</p>
          <h3 className="text-2xl font-bold text-white mt-1">{totalStock}</h3>
        </div>

        <div className="bg-brand-surface border border-brand-border p-5 group hover:border-red-500/30 transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-red-500/10 text-red-500 rounded-lg">
              <AlertTriangle size={20} />
            </div>
            {lowStockItems > 0 && <span className="bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded font-bold">ALERTA</span>}
          </div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Stock Baixo</p>
          <h3 className="text-2xl font-bold text-white mt-1">{lowStockItems}</h3>
        </div>

        <div className="bg-brand-surface border border-brand-border p-5 group hover:border-amber-500/30 transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
              <DollarSign size={20} />
            </div>
          </div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Valor em Stock</p>
          <h3 className="text-2xl font-bold text-white mt-1">{totalValue.toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}</h3>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Pesquisar peças, SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-brand-surface border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-64 text-xs"
            />
          </div>
          <div className="flex bg-brand-surface border border-brand-border p-1 rounded-xl">
             <button onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.csv';
                input.onchange = (e: any) => handleImport(e);
                input.click();
             }} className="p-1.5 text-gray-500 hover:text-emerald-500 transition-all border-r border-brand-border" title="Importar CSV">
                <Upload size={14} />
             </button>
             <button onClick={handleExport} className="p-1.5 text-gray-500 hover:text-emerald-500 transition-all border-r border-brand-border" title="Exportar CSV">
                <Download size={14} />
             </button>
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-gray-500 hover:text-gray-300'}`}>
              <LayoutGrid size={14} />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-gray-500 hover:text-gray-300'}`}>
              <ListIcon size={14} />
            </button>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 text-xs text-white"
        >
          <Plus size={16} />
          Adicionar Peça
        </button>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-brand-surface border border-brand-border group hover:border-emerald-500/30 transition-all overflow-hidden p-5 flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 bg-white/5 rounded-xl text-emerald-500">
                  <Package size={18} />
                </div>
                <div className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${item.quantity_on_hand <= item.min_quantity ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                  {item.quantity_on_hand} em stock
                </div>
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="font-bold text-white text-sm tracking-tight group-hover:text-emerald-500 transition-colors truncate">{item.name}</h3>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{item.category}</p>
                    <p className="text-[9px] font-mono text-gray-600">{item.sku}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-brand-border flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-gray-500 uppercase font-bold tracking-widest">Custo Unid.</span>
                    <span className="text-xs font-bold text-emerald-500">{item.unit_cost.toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}</span>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => {
                        setStockAction({id: item.id, type: 'add', quantity: 1});
                        setIsStockModalOpen(true);
                      }}
                      className="p-1.5 hover:bg-emerald-500/10 text-gray-500 hover:text-emerald-500 rounded-lg transition-all"
                    >
                      <Plus size={14} />
                    </button>
                    <button className="p-1.5 hover:bg-white/5 rounded-lg text-gray-500 transition-colors">
                      <MoreVertical size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-brand-surface border border-brand-border overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="col-header">Peça</th>
                <th className="col-header">SKU</th>
                <th className="col-header">Categoria</th>
                <th className="col-header text-right">Custo Unid.</th>
                <th className="col-header text-right">Stock</th>
                <th className="col-header text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filteredItems.map((item) => (
                <tr key={item.id} className="data-row">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-emerald-500 border border-white/5">
                        <Package size={14} />
                      </div>
                      <span className="font-bold text-white text-xs">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-mono text-gray-500">{item.sku}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.category}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs font-bold text-emerald-500">{item.unit_cost.toLocaleString('pt-MZ')} MT</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <span className={`text-xs font-bold ${item.quantity_on_hand <= item.min_quantity ? 'text-red-500' : 'text-gray-300'}`}>
                        {item.quantity_on_hand}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button 
                       onClick={() => {
                        setStockAction({id: item.id, type: 'add', quantity: 1});
                        setIsStockModalOpen(true);
                      }}
                       className="p-1.5 hover:bg-white/5 rounded-lg text-gray-500 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Nova Peça */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="bg-brand-surface w-full max-w-2xl shadow-2xl border border-brand-border relative z-10 flex flex-col max-h-[90vh]">
              <div className="p-6 bg-emerald-500 text-white flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-lg font-bold tracking-tight">Adicionar ao Inventário</h2>
                  <p className="text-emerald-100 text-[10px] font-medium uppercase tracking-widest mt-0.5">Registar Nova Peça ou Consumível</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form id="inventory-form" onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 text-white">Nome do Item</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="ex: Filtro de Óleo Gerador 500kVA" className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 text-white">SKU / Código</label>
                  <input type="text" required value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} placeholder="ex: PRT-9922" className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 text-white">Categoria</label>
                  <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white" >
                    {INVENTORY_CATEGORIES.map(c => <option key={c} value={c} className="bg-brand-surface">{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 text-white">Custo Unitário (MZN)</label>
                  <input type="number" step="0.01" required value={formData.unit_cost} onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 text-white">Quantidade Inicial</label>
                  <input type="number" required value={formData.quantity_on_hand} onChange={(e) => setFormData({ ...formData, quantity_on_hand: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 text-white">Ponto de Reencomenda (Mínimo)</label>
                  <input type="number" required value={formData.min_quantity} onChange={(e) => setFormData({ ...formData, min_quantity: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white" />
                </div>
              </form>
              <div className="p-6 border-t border-brand-border bg-brand-surface shrink-0">
                <button type="submit" form="inventory-form" disabled={submitting} className="w-full py-3 bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 uppercase tracking-widest text-xs disabled:opacity-50 flex items-center justify-center gap-2" >
                  {submitting ? 'A processar...' : 'Registar no Inventário'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Ajuste de Stock */}
      <AnimatePresence>
        {isStockModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsStockModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-brand-surface w-full max-w-sm shadow-2xl border border-brand-border relative z-10 flex flex-col">
              <div className="p-4 border-b border-brand-border flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Ajuste de Movimentação</span>
                <button onClick={() => setIsStockModalOpen(false)} className="text-gray-500 hover:text-white"><X size={16} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex bg-white/5 p-1 rounded-lg border border-brand-border">
                   <button onClick={() => setStockAction({...stockAction, type: 'add'})} className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${stockAction.type === 'add' ? 'bg-emerald-500 text-white' : 'text-gray-500'}`}>Entrada</button>
                   <button onClick={() => setStockAction({...stockAction, type: 'remove'})} className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${stockAction.type === 'remove' ? 'bg-red-500 text-white' : 'text-gray-500'}`}>Saída</button>
                </div>
                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 text-white">Quantidade</label>
                   <input type="number" min="1" value={stockAction.quantity} onChange={(e) => setStockAction({...stockAction, quantity: parseInt(e.target.value) || 0})} className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none text-xs text-white" />
                </div>
                <button onClick={handleStockAdjust} disabled={submitting} className={`w-full py-3 font-bold uppercase tracking-widest text-xs transition-all ${stockAction.type === 'add' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                  {submitting ? 'A processar...' : 'Confirmar Movimento'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
