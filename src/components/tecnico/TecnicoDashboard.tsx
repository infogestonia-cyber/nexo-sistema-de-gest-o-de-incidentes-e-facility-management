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
import { Badge } from '../ui/badge';

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
        <div className="space-y-8 pb-32">
            {/* Welcome */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">Painel Operacional</h2>
                    <p className="text-[10px] font-black text-emerald-500/50 uppercase tracking-[0.2em] mt-1">Status de Disponibilidade</p>
                </div>
                <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-none flex items-center gap-2.5 shadow-lg shadow-emerald-500/5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Ativo</span>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-blue-500/10 border border-blue-500/20 rounded-3xl card-shine group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2.5 bg-blue-500/20 rounded-xl">
                            <Clock size={20} className="text-blue-400" />
                        </div>
                        <span className="text-2xl font-black text-white tracking-tighter">{stats?.atribuidos || 0}</span>
                    </div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Tarefas Pendentes</p>
                </div>
                <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-3xl card-shine group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2.5 bg-amber-500/20 rounded-xl">
                            <TrendingUp size={20} className="text-amber-400" />
                        </div>
                        <span className="text-2xl font-black text-white tracking-tighter">{stats?.emProgresso || 0}</span>
                    </div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Em Execução</p>
                </div>
                <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl col-span-2 card-shine relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                        <CheckCircle2 size={48} className="text-emerald-500" />
                    </div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-500/20 rounded-xl">
                                <CheckCircle2 size={20} className="text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-emerald-500/50 uppercase tracking-widest leading-none mb-1">Performance Diária</p>
                                <p className="text-sm font-bold text-white uppercase tracking-tighter">Tarefas Concluídas</p>
                            </div>
                        </div>
                        <span className="text-3xl font-black text-white tracking-tighter">{stats?.concluidos || 0}</span>
                    </div>
                    <div className="w-full bg-white/5 h-2 rounded-full mt-4 overflow-hidden relative z-10">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: '65%' }}
                          transition={{ duration: 1, delay: 0.5 }}
                          className="bg-emerald-500 h-full rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)]" 
                        />
                    </div>
                </div>
            </div>

            {/* Recent Tasks */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Fluxo de Trabalho</p>
                        <h3 className="text-sm font-bold text-white mt-1">Intervenções Recentes</h3>
                    </div>
                    <button onClick={() => onNavigate('incidents')} className="h-8 px-3 rounded-full bg-white/5 border border-white/10 text-[9px] text-emerald-500 font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-500 hover:text-black transition-all">
                        Ver Lista <ArrowRight size={12} />
                    </button>
                </div>
                <div className="space-y-3">
                    {recentIncidents.map((inc, idx) => (
                        <motion.div
                            key={inc.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onSelectIncident(inc.id)}
                            className="p-4 bg-white/[0.02] border border-white/5 rounded-3xl flex items-center gap-4 cursor-pointer hover:bg-white/[0.05] transition-all group"
                        >
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105 ${inc.severidade === 'Crítico' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                    inc.severidade === 'Alto' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' :
                                        'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                }`}>
                                <AlertCircle size={22} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[9px] font-mono text-gray-500 font-bold">#{inc.id?.toString().slice(-4).toUpperCase()}</span>
                                    <div className="w-1 h-1 rounded-full bg-gray-700" />
                                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider truncate">{inc.property_name}</span>
                                </div>
                                <p className="text-sm font-bold text-white truncate group-hover:text-emerald-400 transition-colors uppercase tracking-tight">{inc.categoria}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <Badge variant="outline" className={`text-[8px] font-black px-2 py-0.5 rounded border-none uppercase tracking-tighter ${inc.estado === 'Em progresso' ? 'bg-amber-500/20 text-amber-500' :
                                        inc.estado === 'Resolvido' ? 'bg-emerald-500/20 text-emerald-500' :
                                            'bg-white/5 text-gray-500'
                                    }`}>
                                    {inc.estado}
                                </Badge>
                            </div>
                        </motion.div>
                    ))}
                    {recentIncidents.length === 0 && (
                        <div className="text-center py-12 opacity-30 bg-white/[0.01] border border-dashed border-white/10 rounded-3xl">
                            <Wrench size={32} className="mx-auto mb-3 text-gray-600" />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Sem tarefas ativas no momento</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4 pt-4">
                <button
                    onClick={() => onNavigate('scanner')}
                    className="p-6 bg-emerald-500 text-black rounded-3xl flex flex-col items-center gap-3 font-black text-xs uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20 group active:scale-95"
                >
                    <div className="p-2 bg-black/10 rounded-xl group-hover:scale-110 transition-transform">
                        <Scan size={24} />
                    </div>
                    Scan QR
                </button>
                <button
                    onClick={() => onNavigate('maintenance')}
                    className="p-6 bg-white/5 border border-white/10 text-white rounded-3xl flex flex-col items-center gap-3 font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all group active:scale-95"
                >
                    <div className="p-2 bg-emerald-500/10 rounded-xl group-hover:scale-110 transition-transform">
                        <Wrench size={24} className="text-emerald-500" />
                    </div>
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

