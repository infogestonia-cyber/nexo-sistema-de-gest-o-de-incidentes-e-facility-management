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

    if (selectedId) {
        return <div className="-m-4"><IncidentDetail id={selectedId} onBack={() => { setSelectedId(null); fetchIncidents(); }} /></div>;
    }

    return (
        <div className="space-y-6 pb-32">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-black text-emerald-500/50 uppercase tracking-[0.2em] mb-1">Centro de Operações</p>
                    <h2 className="text-2xl font-black text-white tracking-tight">Incidentes</h2>
                </div>
                <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-emerald-500 uppercase tracking-widest shadow-lg shadow-emerald-500/5">
                    {filtered.length} Ativos
                </div>
            </div>

            {/* Search & Filter */}
            <div className="space-y-4">
                <div className="relative group">
                    <div className="absolute inset-0 bg-emerald-500/5 rounded-2xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity" />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 w-4 h-4 group-focus-within:text-emerald-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Pesquisar local ou categoria..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-xs text-white focus:outline-none focus:border-emerald-500/50 transition-all font-bold placeholder:text-gray-700 relative z-10"
                    />
                </div>

                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    {[
                        { id: 'all', label: 'Todos' },
                        { id: 'Atribuído', label: 'Atribuídos' },
                        { id: 'Em progresso', label: 'Em Curso' },
                        { id: 'Resolvido', label: 'Concluídos' },
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            className={`flex-shrink-0 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${filter === f.id 
                                ? 'bg-emerald-500 text-black border-emerald-500 shadow-lg shadow-emerald-500/20' 
                                : 'bg-white/5 text-gray-500 border-white/5 hover:bg-white/10 hover:text-gray-300'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <div className="w-10 h-10 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest animate-pulse">Sincronizando Dados</p>
                    </div>
                ) : filtered.map((i, idx) => (
                    <motion.div
                        key={i.id}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setSelectedId(i.id)}
                        className="group bg-white/[0.03] border border-white/5 rounded-3xl p-6 space-y-5 hover:bg-white/[0.05] transition-all card-shine relative overflow-hidden cursor-pointer"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                             <AlertCircle size={48} className="text-white" />
                        </div>

                        <div className="flex items-start justify-between gap-4 relative z-10">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`w-2 h-2 rounded-full shadow-[0_0_8px] ${i.estado === 'Resolvido' ? 'bg-emerald-500 shadow-emerald-500/50' :
                                            i.estado === 'Em progresso' ? 'bg-amber-500 shadow-amber-500/50' :
                                                'bg-blue-500 shadow-blue-500/50'
                                        }`} />
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{i.estado}</p>
                                    <span className="text-gray-800 text-[10px]">/</span>
                                    <span className="text-[10px] font-mono text-gray-600 font-bold">#{i.id?.toString().slice(-4).toUpperCase()}</span>
                                </div>
                                <h3 className="text-base font-black text-white tracking-tight mb-1.5 group-hover:text-emerald-400 transition-colors uppercase">{i.categoria}</h3>
                                <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed font-bold">{i.descricao}</p>
                            </div>
                            <div className="shrink-0 pt-1">
                                <Badge variant="outline" className={`text-[8px] font-black px-2 py-0.5 rounded border-none shadow-sm ${i.severidade === 'Crítico' ? 'bg-red-500/20 text-red-400' :
                                        i.severidade === 'Alto' ? 'bg-orange-500/20 text-orange-400' :
                                            'bg-blue-500/20 text-blue-400'
                                    } uppercase tracking-tighter`}>
                                    {i.severidade}
                                </Badge>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-white/5 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 text-gray-600">
                                    <div className="p-1.5 bg-white/5 rounded-lg">
                                        <MapPin size={12} className="text-emerald-500/50" />
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-widest truncate max-w-[120px]">{i.property_name}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                    <div className="p-1.5 bg-white/5 rounded-lg">
                                        <Calendar size={12} className="text-blue-500/50" />
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-widest">{i.created_at ? format(new Date(i.created_at), 'dd/MM') : '—'}</span>
                                </div>
                            </div>
                            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-black transition-all">
                                <ChevronRight size={16} />
                            </div>
                        </div>
                    </motion.div>
                ))}

                {filtered.length === 0 && !loading && (
                    <div className="text-center py-24 space-y-4">
                        <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-6 opacity-20">
                            <AlertCircle size={40} className="text-gray-400" />
                        </div>
                        <p className="text-gray-600 text-xs font-black uppercase tracking-[0.2em]">Nenhum incidente encontrado</p>
                    </div>
                )}
            </div>
        </div>
    );
}

