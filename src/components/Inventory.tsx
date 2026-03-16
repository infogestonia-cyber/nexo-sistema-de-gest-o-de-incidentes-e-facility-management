import React, { useState, useEffect } from 'react';
import { ensureArray } from '../utils/safeArray';
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
  Edit3,
  Trash2,
  Download,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { INVENTORY_CATEGORIES } from '../constants';
import { Toast, ToastType } from './ui/Toast';
import socket from '../services/socketService';

export default function Inventory() {
  const [items, setItems] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockAction, setStockAction] = useState<{ id: string, type: 'add' | 'remove', quantity: number }>({ id: '', type: 'add', quantity: 1 });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);

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

  const showToast = (msg: string, type: ToastType = 'success') => {
    setToast({ msg, type });
  };

  const resetForm = () => {
    setSelectedItem(null);
    setFormData(defaultFormData);
  };

  const openNewItemModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditItemModal = (item: any) => {
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

  useEffect(() => {
    fetchInventory();
    fetchSupportData();
    socket.on("inventory-update", () => {
      fetchInventory();
    });
    return () => {
      socket.off("inventory-update");
    };
  }, []);

  const fetchSupportData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
      const [pRes, aRes] = await Promise.all([
        fetch('/api/properties', { headers }),
        fetch('/api/assets', { headers })
      ]);
      const pData = pRes.ok ? await pRes.json() : [];
      const aData = aRes.ok ? await aRes.json() : [];
      setProperties(Array.isArray(pData) ? pData : []);
      setAssets(Array.isArray(aData) ? aData : []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchInventory = async () => {
    try {
      const res = await fetch('/api/inventory', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = res.ok ? await res.json() : [];
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao procurar inventário:', err);
      setItems([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.property_id) {
      showToast('Associação a uma Propriedade é obrigatória.', 'error');
      return;
    }

    const isEditing = !!selectedItem;
    const endpoint = isEditing ? `/api/inventory/${selectedItem.id}` : '/api/inventory';
    const successMessage = isEditing ? 'Item atualizado com sucesso!' : 'Item adicionado com sucesso!';

    setSubmitting(true);
    try {
      const res = await fetch(endpoint, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchInventory();
        resetForm();
        showToast(successMessage);
      } else {
        const errorData = await res.json();
        showToast(errorData.error || (isEditing ? 'Erro ao atualizar item.' : 'Erro ao adicionar item.'), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(isEditing ? 'Erro de rede ao atualizar item.' : 'Erro de rede ao adicionar item.', 'error');
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
        showToast('Stock atualizado com sucesso!');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro ao atualizar stock.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    if (items.length === 0) return;
    const headers = ['Nome', 'Categoria', 'Quantidade', 'Stock Minimo', 'Propriedade', 'Ativo'];
    const rows = items.map(i => [i.nome, i.categoria, i.quantidade, i.stock_minimo, i.property_name, i.asset_name]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `inventario_nexo.csv`;
    link.click();
    showToast('Exportação concluída!', 'success');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    showToast('A importação está desativada temporariamente para ajuste de permissões.', 'error');
  };

  const filteredItems = ensureArray<any>(items).filter(item =>
    item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalValue = ensureArray<any>(items).reduce((acc, item) => acc + (parseFloat(item.preco_compra || 0) * item.quantidade), 0);
  const lowStockItems = ensureArray<any>(items).filter(item => item.quantidade <= item.stock_minimo).length;
  const totalStock = ensureArray<any>(items).reduce((acc, item) => acc + item.quantidade, 0);

  // Filter assets based on selected property
  const availableAssets = assets.filter(a => a.property_id === formData.property_id);

  return (
    <div className="space-y-6 page-enter">
      {/* Modern Premium Toast */}
      <Toast
        message={toast?.msg || null}
        type={toast?.type}
        onClose={() => setToast(null)}
      />
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-brand-surface border border-brand-border p-5 group hover:border-emerald-500/30 transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-none">
              <Package size={20} />
            </div>
          </div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total de Itens</p>
          <h3 className="text-2xl font-bold text-white mt-1">{items.length}</h3>
        </div>

        <div className="bg-brand-surface border border-brand-border p-5 group hover:border-blue-500/30 transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-none">
              <Layers size={20} />
            </div>
          </div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Stock Total</p>
          <h3 className="text-2xl font-bold text-white mt-1">{totalStock}</h3>
        </div>

        <div className="bg-brand-surface border border-brand-border p-5 group hover:border-red-500/30 transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-red-500/10 text-red-500 rounded-none">
              <AlertTriangle size={20} />
            </div>
            {lowStockItems > 0 && <span className="bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded font-bold">ALERTA</span>}
          </div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Stock Baixo</p>
          <h3 className="text-2xl font-bold text-white mt-1">{lowStockItems}</h3>
        </div>

        <div className="bg-brand-surface border border-brand-border p-5 group hover:border-amber-500/30 transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-none">
              <DollarSign size={20} />
            </div>
          </div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Valor em Stock</p>
          <h3 className="text-2xl font-bold text-white mt-1">{totalValue.toLocaleString('pt-MZ')} MT</h3>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Pesquisar peças..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-brand-surface border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-64 text-xs"
            />
          </div>
          <div className="flex bg-brand-surface border border-brand-border p-1 rounded-none">
            <button onClick={handleExport} className="p-1.5 text-gray-500 hover:text-emerald-500 transition-all" title="Exportar CSV">
              <Download size={14} />
            </button>
            <div className="w-px h-4 bg-brand-border mx-1 self-center" />
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-none transition-all ${viewMode === 'grid' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-gray-500 hover:text-gray-300'}`}>
              <LayoutGrid size={14} />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-none transition-all ${viewMode === 'list' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-gray-500 hover:text-gray-300'}`}>
              <ListIcon size={14} />
            </button>
          </div>
        </div>
        <button
          onClick={openNewItemModal}
          className="bg-emerald-500 text-white px-6 py-2 rounded-none font-bold hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 text-xs text-white"
        >
          <Plus size={16} />
          Registar Material
        </button>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-brand-surface border border-brand-border group hover:border-emerald-500/30 transition-all overflow-hidden p-5 flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 bg-white/5 rounded-none text-emerald-500">
                  <Package size={18} />
                </div>
                <div className={`px-2 py-0.5 rounded-none text-[9px] font-bold uppercase tracking-wider ${item.quantidade <= item.stock_minimo ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                  {item.quantidade} em stock
                </div>
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="font-bold text-white text-sm tracking-tight group-hover:text-emerald-500 transition-colors truncate">{item.nome}</h3>
                  <div className="mt-1 space-y-1">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{item.categoria}</p>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-[9px] text-gray-400 font-medium">Prop: <span className="text-white">{item.property_name}</span></p>
                      <p className="text-[9px] text-gray-500">Ativo: {item.asset_name}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-brand-border flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-gray-500 uppercase font-bold tracking-widest">Preço Compra</span>
                    <span className="text-xs font-bold text-emerald-500">{(parseFloat(item.preco_compra) || 0).toLocaleString('pt-MZ')} MT</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setStockAction({ id: item.id, type: 'add', quantity: 1 });
                        setIsStockModalOpen(true);
                      }}
                      className="p-1.5 hover:bg-emerald-500/10 text-gray-500 hover:text-emerald-500 rounded-none transition-all"
                    >
                      <Plus size={14} />
                    </button>
                    <button onClick={() => openEditItemModal(item)} className="p-1.5 hover:bg-white/5 rounded-none text-gray-500 transition-colors" title="Editar item">
                      <Edit3 size={14} />
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
                <th className="col-header">Propriedade / Ativo</th>
                <th className="col-header">Categoria</th>
                <th className="col-header text-right">Compra</th>
                <th className="col-header text-right">Stock</th>
                <th className="col-header text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filteredItems.map((item) => (
                <tr key={item.id} className="data-row">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-none bg-white/5 flex items-center justify-center text-emerald-500 border border-white/5">
                        <Package size={14} />
                      </div>
                      <span className="font-bold text-white text-xs">{item.nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-300 font-bold uppercase">{item.property_name}</span>
                      <span className="text-[9px] text-gray-500">{item.asset_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.categoria}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs font-bold text-emerald-500">{(parseFloat(item.preco_compra) || 0).toLocaleString('pt-MZ')} MT</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <span className={`text-xs font-bold ${item.quantidade <= item.stock_minimo ? 'text-red-500' : 'text-gray-300'}`}>
                        {item.quantidade}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => {
                          setStockAction({ id: item.id, type: 'add', quantity: 1 });
                          setIsStockModalOpen(true);
                        }}
                        className="p-1.5 hover:bg-white/5 rounded-none text-gray-500 transition-colors"
                        title="Ajustar stock"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        onClick={() => openEditItemModal(item)}
                        className="p-1.5 hover:bg-white/5 rounded-none text-gray-500 transition-colors"
                        title="Editar item"
                      >
                        <Edit3 size={14} />
                      </button>
                    </div>
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsModalOpen(false); resetForm(); }} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="bg-brand-surface w-full max-w-2xl shadow-2xl border border-brand-border relative z-10 flex flex-col max-h-[90vh]">
              <div className="p-6 bg-emerald-500 text-white flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-lg font-bold tracking-tight">{selectedItem ? 'Editar Material' : 'Registo de Material'}</h2>
                  <p className="text-emerald-100 text-[10px] font-medium uppercase tracking-widest mt-0.5">
                    {selectedItem ? 'Atualizar item de inventário' : 'Novo Item de Inventário'}
                  </p>
                </div>
                <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="p-2 hover:bg-white/20 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form id="inventory-form" onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Associação de Propriedade *</label>
                  <select 
                    required 
                    value={formData.property_id} 
                    onChange={(e) => setFormData({ ...formData, property_id: e.target.value, asset_id: '' })} 
                    className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
                  >
                    <option value="" className="bg-brand-surface">Selecionar Propriedade...</option>
                    {properties.map(p => <option key={p.id} value={p.id} className="bg-brand-surface">{p.endereco}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Associação de Ativo (Opcional)</label>
                  <select 
                    value={formData.asset_id} 
                    onChange={(e) => setFormData({ ...formData, asset_id: e.target.value })} 
                    className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
                    disabled={!formData.property_id}
                  >
                    <option value="" className="bg-brand-surface">Nenhum Ativo Específico</option>
                    {availableAssets.map(a => <option key={a.id} value={a.id} className="bg-brand-surface">{a.nome} ({a.categoria})</option>)}
                  </select>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Nome do Item</label>
                  <input type="text" required value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} placeholder="ex: Disjuntor 20A" className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Categoria</label>
                  <select value={formData.categoria} onChange={(e) => setFormData({ ...formData, categoria: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white" >
                    {INVENTORY_CATEGORIES.map(c => <option key={c} value={c} className="bg-brand-surface">{c}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Stock Inicial</label>
                  <input type="number" required value={formData.quantidade} onChange={(e) => setFormData({ ...formData, quantidade: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Preço Compra (MZN)</label>
                  <input type="number" step="0.01" required value={formData.preco_compra} onChange={(e) => setFormData({ ...formData, preco_compra: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Stock Mínimo</label>
                  <input type="number" required value={formData.stock_minimo} onChange={(e) => setFormData({ ...formData, stock_minimo: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white" />
                </div>
              </form>
              <div className="p-6 border-t border-brand-border bg-brand-surface shrink-0">
                <button type="submit" form="inventory-form" disabled={submitting} className="w-full py-3 bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 uppercase tracking-widest text-xs disabled:opacity-50 flex items-center justify-center gap-2" >
                  {submitting ? 'A processar...' : selectedItem ? 'Salvar alterações' : 'Registar Material'}
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
                <div className="flex bg-white/5 p-1 rounded-none border border-brand-border">
                  <button onClick={() => setStockAction({ ...stockAction, type: 'add' })} className={`flex-1 py-1.5 rounded-none text-[10px] font-bold uppercase transition-all ${stockAction.type === 'add' ? 'bg-emerald-500 text-white' : 'text-gray-500'}`}>Entrada</button>
                  <button onClick={() => setStockAction({ ...stockAction, type: 'remove' })} className={`flex-1 py-1.5 rounded-none text-[10px] font-bold uppercase transition-all ${stockAction.type === 'remove' ? 'bg-red-500 text-white' : 'text-gray-500'}`}>Saída</button>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 text-white">Quantidade</label>
                  <input type="number" min="1" value={stockAction.quantity} onChange={(e) => setStockAction({ ...stockAction, quantity: parseInt(e.target.value) || 0 })} className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-none focus:outline-none text-xs text-white" />
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


