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
import { Button } from '../ui/button';

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
                atribuidos: myIncidents.filter((i: any) => i.estado === 'Aberto' || i.estado === 'Atribuído' || i.estado === 'Novo').length,
                emProgresso: myIncidents.filter((i: any) => i.estado === 'Em progresso' || i.estado === 'Em Progresso').length,
                concluidos: myIncidents.filter((i: any) => i.estado === 'Resolvido' || i.estado === 'Fechado' || i.estado === 'Concluido').length,
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

    const criticalTasks = recentIncidents.filter(inc => inc.severidade === 'Crítico');

    return (
        <div className="space-y-8 pb-32">
            {/* Header com Alertas */}
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between px-1">
                    <div className="flex flex-col gap-0.5">
                        <h2 className="text-xl font-bold text-white tracking-tight">Painel de Comando</h2>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold italic flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Telemetria Operacional Live
                        </p>
                    </div>
                </div>

                {criticalTasks.length > 0 && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-4 card-shine"
                    >
                        <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
                            <AlertCircle size={24} className="animate-bounce" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-bold text-rose-500 uppercase tracking-widest mb-1">Prioridade Crítica</p>
                            <p className="text-sm font-bold text-foreground truncate uppercase tracking-tight">
                                {criticalTasks.length} {criticalTasks.length === 1 ? 'Incidente Crítico' : 'Incidentes Críticos'}
                            </p>
                        </div>
                        <button onClick={() => onNavigate('incidents')} className="px-3 py-1.5 bg-rose-500 text-black text-[9px] font-bold uppercase tracking-widest rounded-md active:scale-95 transition-transform">
                            Ver
                        </button>
                    </motion.div>
                )}
            </div>

            {/* KPI Grid - Submettle Zinc Style */}
            <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-card/50 backdrop-blur-sm border border-border rounded-xl shadow-sm group hover:border-primary/20 transition-all duration-300 card-shine relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-500 transition-transform group-hover:scale-110">
                            <Clock size={16} />
                        </div>
                        <span className="text-2xl font-bold tracking-tight">{stats?.atribuidos || 0}</span>
                    </div>
                    <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider relative z-10">Pendentes</p>
                </div>

                <div className="p-5 bg-card/50 backdrop-blur-sm border border-border rounded-xl shadow-sm group hover:border-primary/20 transition-all duration-300 card-shine relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-500 transition-transform group-hover:scale-110">
                            <TrendingUp size={16} />
                        </div>
                        <span className="text-2xl font-bold tracking-tight">{stats?.emProgresso || 0}</span>
                    </div>
                    <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider relative z-10">Em Curso</p>
                </div>

                <div className="p-6 bg-card/50 backdrop-blur-sm border border-border rounded-xl col-span-2 shadow-sm card-shine relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500">
                                <CheckCircle2 size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-0.5">Performance</p>
                                <p className="text-sm font-bold text-foreground uppercase tracking-tight">Concluídas Hoje</p>
                            </div>
                        </div>
                        <span className="text-3xl font-bold tracking-tight">{stats?.concluidos || 0}</span>
                    </div>

                    <div className="space-y-2 relative z-10">
                        <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
                            <span>SLA Global: 85%</span>
                            <span>{Math.min(100, (stats?.concluidos || 0) * 10)}%</span>
                        </div>
                        <div className="w-full bg-muted/20 border border-border h-2 rounded-full overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, (stats?.concluidos || 0) * 10)}%` }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                className="bg-emerald-500 h-full rounded-full" 
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Tasks - Balanced List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <div>
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-tight">Intervenções Recentes</h3>
                        <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Últimas 24 horas</p>
                    </div>
                    <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => onNavigate('incidents')} 
                        className="h-8 text-[9px] font-bold uppercase tracking-tight gap-2"
                    >
                        Ver Tudo <ArrowRight size={12} />
                    </Button>
                </div>

                <div className="space-y-2">
                    {recentIncidents.map((inc, idx) => (
                        <motion.div
                            key={inc.id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.04 }}
                            onClick={() => onSelectIncident(inc.id)}
                            className="p-3.5 bg-card/50 backdrop-blur-sm border border-border rounded-xl flex items-center gap-4 cursor-pointer hover:bg-muted/30 transition-all group relative overflow-hidden"
                        >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105 ${
                                inc.severidade === 'Crítico' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' :
                                inc.severidade === 'Alto' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' :
                                'bg-blue-500/10 border-blue-500/20 text-blue-400'
                            }`}>
                                <AlertCircle size={18} className={inc.severidade === 'Crítico' ? 'animate-pulse' : ''} />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-[9px] font-bold text-muted-foreground/30 font-mono tracking-widest bg-muted/20 px-1 rounded">
                                        #{inc.id?.toString().slice(-4).toUpperCase()}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-wide truncate">
                                        {inc.property_name}
                                    </span>
                                </div>
                                <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors uppercase tracking-tight">
                                    {inc.categoria}
                                </p>
                            </div>

                            <div className="text-right shrink-0">
                                <Badge 
                                    variant="outline"
                                    className={`text-[9px] h-4 uppercase font-bold px-2 border-none ${
                                        inc.estado === 'Aberto' || inc.estado === 'Novo' || inc.estado === 'Atribuído' ? 'bg-rose-500/15 text-rose-500' :
                                        inc.estado === 'Em progresso' || inc.estado === 'Em Progresso' ? 'bg-amber-500/15 text-amber-500' :
                                        inc.estado === 'Resolvido' || inc.estado === 'Fechado' || inc.estado === 'Concluido' ? 'bg-emerald-500/15 text-emerald-500' :
                                        'bg-zinc-500/15 text-zinc-500'
                                    }`}
                                >
                                    {inc.estado}
                                </Badge>
                                <p className="text-[8px] font-bold text-muted-foreground/20 uppercase tracking-widest mt-1">
                                    Detalhes
                                </p>
                            </div>
                        </motion.div>
                    ))}

                    {recentIncidents.length === 0 && (
                        <div className="text-center py-12 bg-muted/5 border border-dashed border-border rounded-xl flex flex-col items-center gap-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30 italic">Sem conexões ativas</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions - System Style */}
            <div className="grid grid-cols-2 gap-4 pb-12">
                <button
                    onClick={() => onNavigate('scanner')}
                    className="p-5 bg-primary text-primary-foreground rounded-xl flex flex-col items-center gap-3 font-bold text-[10px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20 group"
                >
                    <div className="h-10 w-10 bg-white/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Scan size={20} />
                    </div>
                    <span>Scanner QR</span>
                </button>
                <button
                    onClick={() => onNavigate('maintenance')}
                    className="p-5 bg-card/50 backdrop-blur-sm border border-border text-foreground rounded-xl flex flex-col items-center gap-3 font-bold text-[10px] uppercase tracking-widest hover:bg-muted/30 transition-all group active:scale-95"
                >
                    <div className="h-10 w-10 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <Wrench size={20} />
                    </div>
                    <span>Agendamentos</span>
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

