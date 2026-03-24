import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Search,
    Filter,
    AlertCircle,
    Clock,
    ChevronRight,
    MapPin,
    Calendar,
    X as XIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import IncidentDetail from '../IncidentDetail';
import { api } from '../../services/api';
import { Badge } from '../ui/badge';

export default function TecnicoIncidents({ onSelectIncident }: any) {
    const [incidents, setIncidents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        fetchIncidents();
    }, []);

    const fetchIncidents = async () => {
        try {
            const data = await api.get('/api/incidents');
            setIncidents(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filtered = incidents.filter(i => {
        const matchesSearch = !search || i.categoria?.toLowerCase().includes(search.toLowerCase()) || i.property_name?.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === 'all' || i.estado === filter;
        return matchesSearch && matchesFilter;
    });

    return (
        <>
        <div style={{ display: selectedId ? 'none' : 'block' }} className="space-y-6 pb-32">
            <div className="flex items-center justify-between px-1">
                <div className="flex flex-col gap-0.5">
                    <h2 className="text-xl font-bold text-white tracking-tight">Intervenções</h2>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold italic flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live Queue Operacional
                    </p>
                </div>
                <div className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-lg text-[10px] font-bold text-primary uppercase tracking-widest shadow-sm">
                    {filtered.length} Ativos
                </div>
            </div>

            {/* Search & Filter - System Interface */}
            <div className="space-y-4">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 w-4 h-4 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Pesquisar local, categoria ou ID..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-card/50 backdrop-blur-sm border border-border rounded-xl pl-11 pr-4 py-3 text-xs text-foreground focus:outline-none focus:border-primary/30 transition-all font-bold placeholder:text-muted-foreground/30 relative z-10 shadow-sm"
                    />
                </div>

                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    {[
                        { id: 'all', label: 'Todos' },
                        { id: 'Aberto', label: 'Pendentes' },
                        { id: 'Em progresso', label: 'Em Curso' },
                        { id: 'Resolvido', label: 'Concluídos' },
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            className={`flex-shrink-0 px-5 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all border ${filter === f.id 
                                ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20' 
                                : 'bg-card/50 text-muted-foreground border-border hover:bg-muted/30 hover:text-foreground'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* List - Balanced Interaction */}
            <div className="space-y-3">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                        <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest italic animate-pulse">Sincronizando Sistema</p>
                    </div>
                ) : filtered.map((i, idx) => (
                    <motion.div
                        key={i.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        onClick={() => setSelectedId(i.id)}
                        className="group bg-card/50 backdrop-blur-sm border border-border rounded-xl p-5 space-y-4 hover:bg-muted/30 transition-all card-shine relative overflow-hidden cursor-pointer shadow-sm"
                    >
                        <div className="flex items-start justify-between gap-4 relative z-10">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-3">
                                    <Badge 
                                        variant="outline" 
                                        className={`text-[9px] h-4 uppercase font-bold px-2 border-none ${
                                            i.estado === 'Resolvido' ? 'bg-emerald-500/15 text-emerald-500' :
                                            i.estado === 'Em progresso' ? 'bg-amber-500/15 text-amber-500' :
                                            'bg-blue-500/15 text-blue-500'
                                        }`}
                                    >
                                        {i.estado}
                                    </Badge>
                                    <span className="text-[9px] font-mono text-muted-foreground/30 font-bold tracking-widest bg-muted/20 px-1.5 rounded">
                                        #{i.id?.toString().slice(-4).toUpperCase()}
                                    </span>
                                </div>
                                <h3 className="text-base font-bold text-foreground tracking-tight mb-1.5 group-hover:text-primary transition-colors uppercase leading-tight">
                                    {i.categoria}
                                </h3>
                                <p className="text-xs text-muted-foreground/60 line-clamp-2 leading-relaxed font-medium">
                                    {i.descricao}
                                </p>
                            </div>
                            <div className="shrink-0">
                                <Badge 
                                    variant="outline" 
                                    className={`text-[9px] h-5 uppercase font-bold px-2.5 border-none shadow-sm ${
                                        i.severidade === 'Crítico' ? 'bg-rose-500 text-black animate-pulse' :
                                        i.severidade === 'Alto' ? 'bg-orange-500/15 text-orange-500' :
                                        'bg-blue-500/15 text-blue-500'
                                    } tracking-widest`}
                                >
                                    {i.severidade}
                                </Badge>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-border/50 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 text-muted-foreground/60">
                                    <MapPin size={12} className="text-primary/70" />
                                    <span className="text-[10px] font-bold uppercase tracking-wide truncate max-w-[120px]">
                                        {i.property_name}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground/60">
                                    <Calendar size={12} className="text-muted-foreground/40" />
                                    <span className="text-[10px] font-bold uppercase tracking-wide">
                                        {i.created_at ? format(new Date(i.created_at), 'dd MMM', { locale: ptBR }) : '—'}
                                    </span>
                                </div>
                            </div>
                            <div className="w-8 h-8 rounded-lg bg-muted/20 border border-border flex items-center justify-center text-muted-foreground/40 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all shadow-sm">
                                <ChevronRight size={18} />
                            </div>
                        </div>
                    </motion.div>
                ))}

                {filtered.length === 0 && !loading && (
                    <div className="text-center py-24 space-y-4 bg-card/20 border border-dashed border-border rounded-xl flex flex-col items-center">
                        <div className="w-12 h-12 bg-muted/10 rounded-xl flex items-center justify-center opacity-30">
                            <AlertCircle size={24} className="text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-muted-foreground/60 text-[10px] font-bold uppercase tracking-widest">Fila Desimpedida</p>
                            <p className="text-muted-foreground/30 text-[9px] font-medium uppercase tracking-widest italic">Nenhum incidente localizado</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
        
        {selectedId && (
            <div className="-m-4">
                <IncidentDetail id={selectedId} onBack={() => { setSelectedId(null); fetchIncidents(); }} />
            </div>
        )}
        </>
    );
}

