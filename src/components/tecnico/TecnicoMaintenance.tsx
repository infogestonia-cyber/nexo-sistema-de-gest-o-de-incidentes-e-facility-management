import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Wrench,
    Search,
    Calendar,
    Clock,
    ArrowRight,
    ShieldCheck,
    Building2,
    ChevronRight,
    X,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { api } from '../../services/api';
import { Badge } from '../ui/badge';

export default function TecnicoMaintenance() {
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [completing, setCompleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        setLoading(true);
        setError(null);
        try {
            // Use maintenance/executions instead of pm/schedules to get actual assigned tasks
            const data = await api.get('/api/maintenance/executions');
            setTasks(Array.isArray(data) ? data : []);
        } catch (err: any) {
            console.error(err);
            setError("Não foi possível carregar as tarefas de manutenção.");
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = async (task: any) => {
        setCompleting(true);
        setError(null);
        try {
            // Use the unified execution completion endpoint
            await api.patch(`/api/maintenance/executions/${task.id}/complete`, { 
                observations: 'Concluído pelo técnico via app móvel',
                actual_cost: task.custo_estimado || 0 
            });
            
            setSelectedTask(null);
            fetchTasks(); // Refresh list after completion
        } catch (err: any) {
            console.error(err);
            setError("Erro ao concluir manutenção. Por favor tente novamente.");
        } finally {
            setCompleting(false);
        }
    };

    // Helper to get nested property name
    const getPropertyName = (t: any) => {
        if (t.property_name) return t.property_name;
        const asset = Array.isArray(t.assets) ? t.assets[0] : t.assets;
        return asset?.properties?.endereco || 'Propriedade Não Definida';
    };

    // Helper to get nested asset name
    const getAssetName = (t: any) => {
        const asset = Array.isArray(t.assets) ? t.assets[0] : t.assets;
        return asset?.nome || 'Ativo Desconhecido';
    };

    return (
        <div className="space-y-6 pb-32">
            <div className="flex items-center justify-between px-1">
                <div className="flex flex-col gap-0.5">
                    <h2 className="text-xl font-bold text-white tracking-tight">Manutenção</h2>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold italic flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Tarefas Atribuídas
                    </p>
                </div>
                <div className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-lg text-[10px] font-bold text-primary uppercase tracking-widest shadow-sm">
                    {tasks.length} Ativas
                </div>
            </div>

            {error && (
                <div className="mx-1 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center gap-3 text-rose-500 text-[10px] font-bold uppercase tracking-tight">
                    <AlertCircle size={14} />
                    {error}
                </div>
            )}

            <div className="p-5 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between card-shine relative overflow-hidden group">
                <div className="flex items-center gap-4 relative z-10">
                    <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20">
                        <Wrench size={20} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-foreground uppercase tracking-tight">Agenda Técnica</p>
                        <p className="text-[9px] text-primary/70 font-bold uppercase tracking-widest">Sincronizado</p>
                    </div>
                </div>
                <div className="text-right relative z-10">
                    <p className="text-2xl font-bold text-primary tracking-tight">{tasks.length}</p>
                    <p className="text-[9px] text-muted-foreground/50 font-bold uppercase tracking-widest">Protocolos</p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Próximas Intervenções</p>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                        <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest italic animate-pulse">A carregar tarefas...</p>
                    </div>
                ) : (
                    tasks.map((task, idx) => (
                        <motion.div
                            key={task.id}
                            onClick={() => setSelectedTask(task)}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.04 }}
                            className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-5 space-y-4 card-shine relative overflow-hidden group shadow-sm transition-all hover:bg-muted/30 active:scale-[0.98]"
                        >
                            <div className="flex items-start justify-between relative z-10">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2.5">
                                        <Badge variant="outline" className="text-[9px] h-4 uppercase font-bold px-2 border-none bg-emerald-500/15 text-emerald-500">
                                            {task.prioridade || 'Normal'}
                                        </Badge>
                                        <Badge variant="outline" className="text-[9px] h-4 uppercase font-bold px-2 border-none bg-blue-500/15 text-blue-500">
                                            {task.periodicidade || 'Manual'}
                                        </Badge>
                                    </div>
                                    <h3 className="text-base font-bold text-foreground leading-tight group-hover:text-primary transition-colors uppercase tracking-tight">
                                        {getAssetName(task)}
                                    </h3>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-primary uppercase tracking-tight">
                                        {task.proxima_data ? new Date(task.proxima_data).toLocaleDateString('pt-PT') : 'Hoje'}
                                    </p>
                                    <p className="text-[8px] text-muted-foreground/30 font-bold uppercase tracking-widest mt-1">Data Agendada</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-border/50 relative z-10">
                                <div className="flex items-center gap-3 text-muted-foreground/60 min-w-0">
                                    <Building2 size={12} className="text-primary/50" />
                                    <span className="text-[10px] font-bold uppercase tracking-wide truncate max-w-[220px]">
                                        {getPropertyName(task)}
                                    </span>
                                </div>
                                <button className="w-8 h-8 rounded-lg bg-muted/20 border border-border flex items-center justify-center text-muted-foreground/40 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all shadow-sm">
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </motion.div>
                    ))
                )}

                {tasks.length === 0 && !loading && (
                    <div className="text-center py-24 space-y-4 bg-card/20 border border-dashed border-border rounded-xl flex flex-col items-center">
                        <div className="w-12 h-12 bg-muted/10 rounded-xl flex items-center justify-center opacity-30">
                            <Calendar size={24} className="text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-muted-foreground/60 text-[10px] font-bold uppercase tracking-widest">Sem Tarefas Pendentes</p>
                            <p className="text-muted-foreground/30 text-[9px] font-medium uppercase tracking-widest italic">Bom trabalho!</p>
                        </div>
                        <button 
                            onClick={fetchTasks}
                            className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline pt-4"
                        >
                            Atualizar Lista
                        </button>
                    </div>
                )}
            </div>

            {/* Task Details Modal - Slide up from bottom */}
            <AnimatePresence>
                {selectedTask && (
                    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4">
                        <motion.div 
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="bg-card w-full max-w-lg rounded-t-[2.5rem] border-t border-x border-border pb-safe-bottom overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
                        >
                            <div className="w-12 h-1.5 bg-muted/30 rounded-full mx-auto mt-4 mb-2 flex-shrink-0" />
                            
                            <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/10">
                                <h3 className="font-bold text-sm uppercase tracking-widest">Protocolo Técnico</h3>
                                <button onClick={() => setSelectedTask(null)} className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center text-white active:scale-90 transition-transform">
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                                        <Building2 size={12} />
                                        {getPropertyName(selectedTask)}
                                    </p>
                                    <h4 className="text-2xl font-black text-white leading-tight uppercase tracking-tight">
                                        {getAssetName(selectedTask)}
                                    </h4>
                                    <div className="flex items-center gap-3 pt-2">
                                        <Badge className="bg-primary/20 text-primary border-none text-[9px] px-3 py-1 uppercase font-black">
                                            #{selectedTask.id?.toString().slice(-6).toUpperCase()}
                                        </Badge>
                                        <Badge className="bg-muted/30 text-muted-foreground border-none text-[9px] px-3 py-1 uppercase font-black">
                                            {selectedTask.tipo || 'Manutenção'}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-2xl bg-muted/20 border border-border/50">
                                        <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Periodicidade</p>
                                        <p className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-tight">
                                            <Calendar size={12} className="text-primary/50" />
                                            {selectedTask.periodicidade || 'Manual'}
                                        </p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-muted/20 border border-border/50">
                                        <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Previsão</p>
                                        <p className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-tight">
                                            <Clock size={12} className="text-primary/50" />
                                            {selectedTask.proxima_data ? new Date(selectedTask.proxima_data).toLocaleDateString('pt-PT') : 'Hoje'}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Instruções Técnicas</p>
                                    <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 text-xs text-muted-foreground leading-relaxed italic relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-primary/20" />
                                        {selectedTask.descricao || "Proceder à inspeção geral do equipamento, verificar anomalias e assegurar o bom funcionamento de todos os componentes críticos."}
                                    </div>
                                </div>

                                <div className="pb-12">
                                    <button 
                                        disabled={completing}
                                        onClick={() => handleComplete(selectedTask)}
                                        className="w-full py-5 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[0.98] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                    >
                                        {completing ? (
                                            <div className="w-5 h-5 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <CheckCircle2 size={24} />
                                                Concluir Intervenção
                                            </>
                                        )}
                                    </button>
                                    <p className="text-center mt-4 text-[9px] text-muted-foreground/40 font-bold uppercase tracking-[0.2em]">
                                        O histórico será atualizado automaticamente
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
