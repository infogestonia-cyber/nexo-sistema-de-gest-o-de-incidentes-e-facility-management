import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
    Wrench,
    Search,
    Calendar,
    Clock,
    ArrowRight,
    ShieldCheck,
    Building2,
    ChevronRight
} from 'lucide-react';
import { api } from '../../services/api';

export default function TecnicoMaintenance() {
    const [schedules, setSchedules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSchedules();
    }, []);

    const fetchSchedules = async () => {
        try {
            const data = await api.get('/api/pm/schedules');
            setSchedules(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-white">Manutenção</h2>
                <div className="px-2 py-1 bg-white/5 border border-white/5 rounded-none text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                    Preventiva
                </div>
            </div>

            <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-none flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-none bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <ShieldCheck size={20} />
                    </div>
                    <div>
                        <p className="text-xs font-black text-white">Plano Preventivo</p>
                        <p className="text-[9px] text-emerald-400/60 font-bold uppercase tracking-widest">Agendamentos Ativos</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-lg font-black text-emerald-500">{schedules.length}</p>
                </div>
            </div>

            <div className="space-y-3">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-none animate-spin" />
                    </div>
                ) : (
                    schedules.map((s, idx) => (
                        <motion.div
                            key={s.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="bg-white/[0.03] border border-white/6 rounded-none p-4 space-y-3"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-1.5 h-1.5 rounded-none bg-blue-500" />
                                        <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">{s.frequencia}</p>
                                    </div>
                                    <h3 className="text-sm font-bold text-white leading-tight">{s.asset_name}</h3>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-white uppercase">{s.proxima_data || 'Agendado'}</p>
                                    <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">Próxima Visita</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pt-3 border-t border-white/4">
                                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                    <Building2 size={12} className="text-gray-600" />
                                    <span className="text-[9px] text-gray-500 font-bold uppercase truncate">{s.property_name}</span>
                                </div>
                                <button className="flex items-center gap-1 text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                                    Detalhes <ChevronRight size={12} />
                                </button>
                            </div>
                        </motion.div>
                    ))
                )}

                {schedules.length === 0 && !loading && (
                    <div className="text-center py-20 opacity-20">
                        <Calendar size={40} className="mx-auto mb-4 text-gray-600" />
                        <p className="text-xs font-black uppercase tracking-widest">Sem manutenções agendadas</p>
                    </div>
                )}
            </div>
        </div>
    );
}

