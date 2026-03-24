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
        <div className="space-y-6 pb-32">
            <div className="flex items-center justify-between px-1">
                <div className="flex flex-col gap-0.5">
                    <h2 className="text-xl font-bold text-white tracking-tight">Inventário</h2>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold italic flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Logística de Peças & Stock
                    </p>
                </div>
                <div className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-lg text-[10px] font-bold text-primary uppercase tracking-widest shadow-sm">
                    {items.length} SKUs
                </div>
            </div>

            {/* System Search */}
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 w-4 h-4 group-focus-within:text-primary transition-colors" />
                <input
                    type="text"
                    placeholder="Pesquisar ferramentas ou peças..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-card/50 backdrop-blur-sm border border-border rounded-xl pl-11 pr-4 py-3 text-xs text-foreground focus:outline-none focus:border-primary/30 transition-all font-bold placeholder:text-muted-foreground/30 relative z-10 shadow-sm"
                />
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest italic animate-pulse">Sincronizando Stock</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {filtered.map((item, idx) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.04 }}
                            className="group bg-card/50 backdrop-blur-sm border border-border rounded-xl p-5 flex items-center gap-5 hover:bg-muted/30 transition-all card-shine relative overflow-hidden shadow-sm"
                        >
                            <div className="w-12 h-12 bg-muted/20 border border-border rounded-lg flex items-center justify-center text-primary shrink-0 transition-all group-hover:scale-105">
                                <Package size={22} />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-3 mb-1.5">
                                    <h3 className="text-sm font-bold text-foreground truncate uppercase tracking-tight group-hover:text-primary transition-colors">
                                        {item.nome}
                                    </h3>
                                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border-none shadow-sm ${
                                        (item.quantidade || 0) <= (item.stock_minimo || 0)
                                            ? 'bg-rose-500 text-black animate-pulse'
                                            : 'bg-primary/10 text-primary'
                                    } tracking-widest`}>
                                        {item.quantidade || 0} UN
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <p className="text-[9px] text-muted-foreground/40 font-bold uppercase tracking-widest leading-none">
                                        {item.categoria}
                                    </p>
                                    {(item.quantidade || 0) <= (item.stock_minimo || 0) && (
                                        <div className="flex items-center gap-1 text-rose-500">
                                            <AlertTriangle size={10} />
                                            <span className="text-[8px] font-bold uppercase tracking-widest">Abaixo do Mínimo</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="shrink-0 text-right">
                                <p className="text-sm font-bold text-foreground tabular-nums tracking-tight">
                                    {item.unit_cost?.toLocaleString('pt-MZ')}
                                </p>
                                <p className="text-[8px] text-muted-foreground/30 font-bold uppercase tracking-widest mt-0.5">MT / UN</p>
                            </div>
                        </motion.div>
                    ))}

                    {filtered.length === 0 && (
                        <div className="text-center py-24 space-y-4 bg-card/20 border border-dashed border-border rounded-xl flex flex-col items-center">
                            <div className="w-12 h-12 bg-muted/10 rounded-xl flex items-center justify-center opacity-30">
                                <Package size={24} className="text-muted-foreground" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-muted-foreground/60 text-[10px] font-bold uppercase tracking-widest">Stock Vazio</p>
                                <p className="text-muted-foreground/30 text-[9px] font-medium uppercase tracking-widest italic">Nenhum item localizado</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Info Card - System Design */}
            <div className="p-5 bg-muted/10 border border-border rounded-xl flex items-start gap-3 relative overflow-hidden group shadow-sm transition-all hover:bg-muted/20">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shrink-0">
                    <RefreshCcw size={16} />
                </div>
                <div className="relative z-10">
                    <p className="text-[10px] text-muted-foreground font-bold leading-relaxed uppercase tracking-wide">
                        Para solicitar reposição de stock ou reportar danos em ferramentas, utilize o sistema de requisição digital no painel de intervenções.
                    </p>
                </div>
            </div>
        </div>
    );
}

