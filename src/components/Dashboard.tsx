import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, CheckCircle2, Clock, TrendingUp, TrendingDown,
  Users, Zap, Shield, ArrowUpRight, ArrowRight, MoreVertical, Cpu,
  Calendar, AlertCircle, AlertTriangle
} from 'lucide-react';
import { motion } from 'motion/react';
import socket from '../services/socketService';

// --- shadcn UI imports ---
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Progress } from './ui/progress';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { ensureArray } from '../utils/safeArray';
import { RefreshButton } from './ui/RefreshButton';

import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

// High-Fidelity Area Chart using Recharts
function CommandCenterChart({ data }: { data: any[] }) {
  const chartData = useMemo(() => Array.isArray(data) ? data : [], [data]);
  
  if (chartData.length === 0) return (
    <div className="h-full flex items-center justify-center border border-dashed border-border rounded-xl bg-muted/5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Sincronizando telemetria...</p>
    </div>
  );

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis 
            dataKey="estado" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 9, fontWeight: 700, fill: 'hsl(var(--muted-foreground))', opacity: 0.5 }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 9, fontWeight: 700, fill: 'hsl(var(--muted-foreground))', opacity: 0.5 }}
          />
          <Tooltip 
            cursor={{ stroke: 'hsl(var(--primary) / 0.1)', strokeWidth: 2 }}
            contentStyle={{ 
              backgroundColor: 'hsl(var(--background))', 
              border: '1px solid hsl(var(--border))',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: '600',
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
            }}
          />
          <Area 
            type="monotone" 
            dataKey="count" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2.5}
            fillOpacity={1} 
            fill="url(#colorCount)" 
            animationDuration={1500}
            activeDot={{ r: 4, strokeWidth: 0, fill: 'hsl(var(--primary))' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// High-Fidelity Pie Chart for Severity
function SeverityDistribution({ data }: { data: any[] }) {
  const chartData = useMemo(() => Array.isArray(data) ? data : [], [data]);
  const total = chartData.reduce((acc, d) => acc + d.count, 0);
  
  const COLORS: Record<string, string> = {
    'Crítico': 'hsl(var(--destructive))',
    'Alto': '#f97316',
    'Médio': '#eab308',
    'Baixa': '#3b82f6'
  };

  if (total === 0) return null;

  return (
    <div className="h-full w-full flex items-center justify-center relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="count"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.severidade] || 'hsl(var(--muted))'} stroke="none" />
            ))}
          </Pie>
          <Tooltip 
             contentStyle={{ 
              backgroundColor: 'hsl(var(--background))', 
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '10px'
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-bold tracking-tighter">{total}</span>
        <span className="text-[10px] font-semibold text-muted-foreground uppercase opacity-50">Total</span>
      </div>
    </div>
  );
}

export default function Dashboard({ onSelectIncident }: { onSelectIncident?: (id: string) => void }) {
  const [stats, setStats] = useState<any>(null);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
    let parsedUser = {};
    try {
      const rawUser = (sessionStorage.getItem('user') || localStorage.getItem('user'));
      parsedUser = rawUser && rawUser !== 'undefined' ? JSON.parse(rawUser) : {};
    } catch (e) { console.error(e); }

    socket.emit("join-room", { roomId: "dashboard", user: parsedUser });
    socket.on("presence-update", (users) => setActiveUsers(Array.isArray(users) ? users : []));
    socket.on("incident-update", () => fetchStats());

    return () => {
      socket.off("presence-update");
      socket.off("incident-update");
    };
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard', {
        headers: { 'Authorization': `Bearer ${(sessionStorage.getItem('token') || localStorage.getItem('token'))}` }
      });
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const [loading, setLoading] = useState(false);

  if (!stats && loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-semibold italic">Telemetria em tempo real...</p>
    </div>
  );

  if (!stats) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <AlertTriangle size={32} className="text-muted-foreground opacity-20" />
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-semibold italic">Dados indisponíveis</p>
    </div>
  );

  const kpis = [
    { label: 'Incidentes Ativos', value: stats.totalIncidents?.count || 0, icon: Activity, trend: '+12%', color: 'text-rose-500', bgColor: 'bg-rose-500/10' },
    { label: 'SLA Global', value: `${stats.slaCompliance || 0}%`, icon: Shield, trend: 'Estável', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    { label: 'Zonas Críticas', value: (stats.criticalAssets?.count || 0), icon: AlertTriangle, trend: 'Ativo', color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
    { label: 'Ativos Totais', value: (stats.totalAssets?.count || 0), icon: Zap, trend: 'Monitorizado', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xl font-bold text-white tracking-tight">Painel de Comando</h2>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold italic flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Interface de Telemetria Operacional
          </p>
        </div>
        <RefreshButton onClick={fetchStats} loading={loading} />
      </div>

      {/* High-Fidelity KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <Card key={i} className="shadow-sm border-border bg-card/50 backdrop-blur-sm group hover:border-primary/20 transition-all duration-300 card-shine">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
               <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">{kpi.label}</CardTitle>
               <div className={`p-2 rounded-lg ${kpi.bgColor} ${kpi.color} transition-transform group-hover:scale-110 duration-300`}>
                  <kpi.icon size={16} />
               </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight mb-1">{kpi.value}</div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-bold h-4 border-emerald-500/20 bg-emerald-500/5 text-emerald-500 px-1">
                   <TrendingUp size={10} className="mr-1" />
                   {kpi.trend}
                </Badge>
                <span className="text-[10px] text-muted-foreground/50 font-medium">vs mês anterior</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Graph */}
        <Card className="lg:col-span-2 shadow-sm border-border bg-card/50 backdrop-blur-sm card-shine">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-sm font-bold tracking-tight">Desempenho da Rede</CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/50">Tempo de Resposta (ms)</CardDescription>
            </div>
            <div className="flex gap-1">
               <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[9px] font-bold text-emerald-500/80 uppercase">Live</span>
            </div>
          </CardHeader>
          <CardContent className="h-[300px] pl-2">
            <CommandCenterChart data={stats.incidentsByStatus || []} />
          </CardContent>
        </Card>

        {/* Severity Distribution */}
        <Card className="shadow-sm border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold tracking-tight">Matriz de Severidade</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Impacto nos ativos monitorizados.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] mt-4">
              <SeverityDistribution data={stats.incidentsBySeverity || []} />
            </div>
            <div className="space-y-2 mt-6">
              {ensureArray(stats.incidentsBySeverity).map((d: any, i: number) => (
                <div key={i} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: d.severidade === 'Crítico' ? 'hsl(var(--destructive))' : (d.severidade === 'Alto' ? '#f97316' : '#3b82f6') }}></div>
                    <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors">{d.severidade}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono font-bold h-4">{d.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity Table */}
        <Card className="lg:col-span-2 shadow-sm border-border bg-card/50 backdrop-blur-sm card-shine overflow-hidden">
          <CardHeader className="border-b border-border/50 bg-muted/20">
             <div className="flex items-center justify-between">
                <div>
                   <CardTitle className="text-sm font-bold tracking-tight">Incidentes Recentes</CardTitle>
                   <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/50 mt-0.5">Últimas 24 horas</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-tight gap-2">
                   Ver Tudo <ArrowRight size={10} />
                </Button>
             </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/10">
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest h-10 px-4">Incidente</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest h-10">Estado</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest h-10">Data</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest h-10 text-right pr-4">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ensureArray(stats.recentIncidents).length > 0 ? (
                  ensureArray(stats.recentIncidents).map((inc: any, i: number) => (
                    <TableRow key={i} className="group hover:bg-muted/30 transition-colors border-border/50">
                      <TableCell className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">{inc.titulo}</span>
                          <span className="text-[10px] text-muted-foreground font-medium">{inc.propriedade}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={`text-[9px] h-4 uppercase font-bold px-2 border-none ${
                            inc.estado === 'Aberto' || inc.estado === 'Novo' || inc.estado === 'Atribuído'
                              ? 'bg-rose-500/15 text-rose-500' 
                              : (inc.estado === 'Em progresso' || inc.estado === 'Em Progresso' ? 'bg-amber-500/15 text-amber-500' : 'bg-emerald-500/15 text-emerald-500')
                          }`}
                        >
                          {inc.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground font-medium">
                        {new Date().toLocaleDateString('pt-PT')}
                      </TableCell>
                      <TableCell className="text-right pr-4">
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                           onClick={() => onSelectIncident?.(inc.id)}
                         >
                           <ArrowUpRight size={14} className="text-muted-foreground" />
                         </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                     <TableCell colSpan={4} className="h-24 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30">
                        Nenhum incidente registado
                     </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Live Presence Monitor */}
        <Card className="shadow-sm border-border bg-card/50 backdrop-blur-sm card-shine overflow-hidden">
          <CardHeader className="border-b border-border/50 bg-muted/20">
            <div className="flex items-center justify-between">
               <CardTitle className="text-sm font-bold tracking-tight">Equipa Online</CardTitle>
               <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Live</span>
               </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            {activeUsers.length === 0 ? (
               <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted/20 flex items-center justify-center">
                     <Users size={18} className="opacity-20" />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-30 italic">Sem conexões ativas</p>
               </div>
            ) : (
              activeUsers.map((u, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-all group cursor-default">
                  <div className="relative">
                    <Avatar className="h-9 w-9 border border-border ring-2 ring-emerald-500/10 shadow-sm transition-transform group-hover:scale-105">
                      <AvatarFallback className="text-[10px] font-bold bg-zinc-100 text-[#09090b] uppercase">{(u.nome || 'U').slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#09090b] rounded-full shadow-lg"></span>
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs font-bold truncate text-zinc-100 group-hover:text-white transition-colors">{u.nome}</span>
                    <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{u.perfil || 'Acesso Direto'}</span>
                  </div>
                  <Badge variant="outline" className="text-[8px] font-black h-4 px-1.5 border-none bg-zinc-800 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
                     {new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                  </Badge>
                </div>
              ))
            )}
            
            <div className="mt-4 pt-4 border-t border-border/50">
               <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-2 mb-2">
                     <Shield size={12} className="text-primary" />
                     <span className="text-[10px] font-bold uppercase tracking-widest">Rede Segura</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                     Todos os terminais estão autenticados e sob monitorização do SOC.
                  </p>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
