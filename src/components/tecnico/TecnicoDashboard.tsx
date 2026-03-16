import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
    Clock,
    AlertCircle,
    Wrench,
    CheckCircle2,
    TrendingUp,
    ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { api } from '../../services/api';

export default function TecnicoDashboard({ user, onNavigate, onSelectIncident }: any) {
    const [stats, setStats] = useState<any>(null);
    const [recentIncidents, setRecentIncidents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const allIncidents = await api.get('/api/incidents');
            const myIncidents = allIncidents.filter((i: any) => i.responsavel_id === user.id);

            setRecentIncidents(myIncidents.slice(0, 5));
            setStats({
                atribuidos: myIncidents.filter((i: any) => i.estado === 'Atribuído' || i.estado === 'Aberto').length,
                emProgresso: myIncidents.filter((i: any) => i.estado === 'Em progresso').length,
                concluidos: myIncidents.filter((i: any) => i.estado === 'Resolvido' || i.estado === 'Fechado').length,
            });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-none animate-spin" />
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Welcome */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-black text-white">Painel Operacional</h2>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">Visão Geral de Tarefas</p>
                </div>
                <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-none flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-none bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Online</span>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-none">
                    <div className="flex items-center justify-between mb-2">
                        <Clock size={18} className="text-blue-400" />
                        <span className="text-lg font-black text-white">{stats?.atribuidos || 0}</span>
                    </div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Atribuídos</p>
                </div>
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-none">
                    <div className="flex items-center justify-between mb-2">
                        <TrendingUp size={18} className="text-amber-400" />
                        <span className="text-lg font-black text-white">{stats?.emProgresso || 0}</span>
                    </div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Em Curso</p>
                </div>
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-none col-span-2">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={18} className="text-emerald-400" />
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tarefa de Hoje Concluídas</p>
                        </div>
                        <span className="text-xl font-black text-white">{stats?.concluidos || 0}</span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-none mt-3 overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-none" style={{ width: '65%' }} />
                    </div>
                </div>
            </div>

            {/* Recent Tasks */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Minhas Tarefas Recentes</p>
                    <button onClick={() => onNavigate('incidents')} className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider flex items-center gap-1">Ver todas <ArrowRight size={10} /></button>
                </div>
                <div className="space-y-2">
                    {recentIncidents.map((inc) => (
                        <motion.div
                            key={inc.id}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onSelectIncident(inc.id)}
                            className="p-3 bg-white/[0.03] border border-white/8 rounded-none flex items-center gap-3 cursor-pointer"
                        >
                            <div className={`w-10 h-10 rounded-none flex items-center justify-center border shrink-0 ${inc.severidade === 'Crítico' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                    inc.severidade === 'Alto' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' :
                                        'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                }`}>
                                <AlertCircle size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-white truncate">{inc.categoria}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[9px] text-gray-500 font-mono">#{inc.id?.toString().slice(-4).toUpperCase()}</span>
                                    <span className="text-[8px] text-gray-600">·</span>
                                    <span className="text-[9px] text-gray-600 truncate">{inc.property_name}</span>
                                </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <span className={`text-[8px] font-bold px-2 py-0.5 rounded-none uppercase border ${inc.estado === 'Em progresso' ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' :
                                        inc.estado === 'Resolvido' ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' :
                                            'bg-white/5 text-gray-500 border-white/10'
                                    }`}>
                                    {inc.estado}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                    {recentIncidents.length === 0 && (
                        <div className="text-center py-8 opacity-20 bg-white/5 border border-dashed border-white/10 rounded-none">
                            <Wrench size={24} className="mx-auto mb-2" />
                            <p className="text-[10px] font-bold uppercase tracking-widest">Sem tarefas atribuídas</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                    onClick={() => onNavigate('scanner')}
                    className="p-4 bg-emerald-500 text-black rounded-none flex flex-col items-center gap-2 font-black text-xs uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
                >
                    <Scan size={24} />
                    Scan QR
                </button>
                <button
                    onClick={() => onNavigate('maintenance')}
                    className="p-4 bg-white/5 border border-white/10 text-white rounded-none flex flex-col items-center gap-2 font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                    <Wrench size={24} />
                    Manutenção
                </button>
            </div>
        </div>
    );
}

function Scan({ size }: { size: number }) {
    return (
        <div className="relative" style={{ width: size, height: size }}>
            <div className="absolute inset-0 border-2 border-current opacity-30 rounded-none"></div>
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-current rounded-tl-sm"></div>
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-current rounded-tr-sm"></div>
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-current rounded-bl-sm"></div>
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-current rounded-br-sm"></div>
            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-current animate-pulse"></div>
        </div>
    );
}

