import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
    Package,
    Search,
    AlertTriangle,
    ArrowUpRight,
    Minus,
    Plus,
    RefreshCcw,
    CheckCircle2
} from 'lucide-react';
import { api } from '../../services/api';

export default function TecnicoInventory() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        try {
            const data = await api.get('/api/inventory');
            setItems(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filtered = items.filter(i =>
        !search || i.name?.toLowerCase().includes(search.toLowerCase()) || i.category?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-white">Inventário</h2>
                <div className="px-2 py-1 bg-white/5 border border-white/5 rounded-none text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                    {items.length} Itens
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 w-4 h-4" />
                <input
                    type="text"
                    placeholder="Pesquisar ferramentas ou peças..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-white/5 border border-white/8 rounded-none pl-10 pr-4 py-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
                />
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-none animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {filtered.map((item) => (
                        <div
                            key={item.id}
                            className="bg-white/[0.03] border border-white/6 rounded-none p-4 flex items-center gap-4"
                        >
                            <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-none flex items-center justify-center text-emerald-500 shrink-0">
                                <Package size={24} />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <h3 className="text-sm font-bold text-white truncate">{item.nome}</h3>
                                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-none border ${(item.quantidade || 0) <= (item.stock_minimo || 0)
                                            ? 'bg-red-500/10 border-red-500/20 text-red-500'
                                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                        }`}>
                                        {item.quantidade || 0} un
                                    </span>
                                </div>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">{item.categoria}</p>

                                {(item.quantidade || 0) <= (item.stock_minimo || 0) && (
                                    <div className="flex items-center gap-1.5 mt-2 text-red-500/70">
                                        <AlertTriangle size={10} />
                                        <span className="text-[8px] font-bold uppercase">Stock Crítico</span>
                                    </div>
                                )}
                            </div>

                            <div className="shrink-0 flex flex-col items-center">
                                <p className="text-[10px] font-black text-white">{item.unit_cost?.toLocaleString('pt-MZ')} MT</p>
                                <p className="text-[7px] text-gray-600 font-bold uppercase">Preço Unit.</p>
                            </div>
                        </div>
                    ))}

                    {filtered.length === 0 && (
                        <div className="text-center py-20 opacity-30">
                            <Package size={40} className="mx-auto mb-4 text-gray-600" />
                            <p className="text-xs font-black uppercase tracking-widest">Stock não encontrado</p>
                        </div>
                    )}
                </div>
            )}

            {/* Info Card */}
            <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-none flex items-start gap-3">
                <RefreshCcw size={14} className="text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-blue-300 leading-relaxed">
                    Para solicitar reposição de stock ou reportar danos em ferramentas, utilize o sistema de requisição no menu de Incidentes.
                </p>
            </div>
        </div>
    );
}

