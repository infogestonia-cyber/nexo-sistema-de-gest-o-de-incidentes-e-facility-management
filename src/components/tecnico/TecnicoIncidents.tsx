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
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-white">Incidentes</h2>
                <div className="px-2 py-1 bg-white/5 border border-white/5 rounded-none text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                    {filtered.length} Ativos
                </div>
            </div>

            {/* Search & Filter */}
            <div className="space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Pesquisar local ou categoria..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/8 rounded-none pl-10 pr-4 py-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
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
                            className={`flex-shrink-0 px-4 py-2 rounded-none text-[10px] font-black uppercase tracking-widest transition-all border ${filter === f.id ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-white/5 text-gray-500 border-white/10'
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="space-y-3">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-none animate-spin" />
                    </div>
                ) : filtered.map((i, idx) => (
                    <motion.div
                        key={i.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedId(i.id)}
                        className="bg-white/[0.03] border border-white/6 rounded-none p-4 shadow-sm active:bg-white/[0.06] transition-all"
                    >
                        <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`w-2 h-2 rounded-none ${i.estado === 'Resolvido' ? 'bg-emerald-500' :
                                            i.estado === 'Em progresso' ? 'bg-amber-500' :
                                                'bg-blue-500'
                                        }`} />
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.1em]">{i.estado}</p>
                                </div>
                                <h3 className="text-sm font-bold text-white leading-tight mb-1">{i.categoria}</h3>
                                <p className="text-[11px] text-gray-400 line-clamp-1">{i.descricao}</p>
                            </div>
                            <div className={`px-2 py-0.5 rounded-none text-[8px] font-black uppercase tracking-widest border ${i.severidade === 'Crítico' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                                    i.severidade === 'Alto' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' :
                                        'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                }`}>
                                {i.severidade}
                            </div>
                        </div>

                        <div className="flex items-center gap-4 pt-3 border-t border-white/4">
                            <div className="flex items-center gap-1.5 text-gray-500">
                                <MapPin size={12} className="text-emerald-500/50" />
                                <span className="text-[9px] font-bold uppercase tracking-wider truncate max-w-[120px]">{i.property_name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-500">
                                <Calendar size={12} className="text-blue-500/50" />
                                <span className="text-[9px] font-bold uppercase tracking-wider">{i.created_at ? format(new Date(i.created_at), 'dd/MM') : '—'}</span>
                            </div>
                            <div className="ml-auto">
                                <ChevronRight size={14} className="text-gray-700" />
                            </div>
                        </div>
                    </motion.div>
                ))}

                {filtered.length === 0 && !loading && (
                    <div className="text-center py-20 opacity-30">
                        <AlertCircle size={40} className="mx-auto mb-4 text-gray-600" />
                        <p className="text-xs font-black uppercase tracking-widest">Nenhum incidente encontrado</p>
                    </div>
                )}
            </div>
        </div>
    );
}

