import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, CheckCircle2, Clock, TrendingUp, TrendingDown,
  Users, Zap, Shield, ArrowUpRight, MoreVertical, Cpu,
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
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
          <XAxis 
            dataKey="estado" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fontWeight: 600, fill: 'hsl(var(--muted-foreground))' }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fontWeight: 600, fill: 'hsl(var(--muted-foreground))' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--background))', 
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px'
            }}
          />
          <Area 
            type="monotone" 
            dataKey="count" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorCount)" 
            animationDuration={1500}
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
      const rawUser = localStorage.getItem('user');
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
    try {
      const res = await fetch('/api/dashboard', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error(e);
    }
  };

  if (!stats) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-semibold italic">Telemetria em tempo real...</p>
    </div>
  );

  const kpis = [
    { label: 'Incidentes Ativos', value: stats.totalIncidents?.count || 0, icon: Activity, trend: '+12%', color: 'text-primary' },
    { label: 'SLA Global', value: `${stats.slaCompliance || 0}%`, icon: Shield, trend: 'Estável', color: 'text-foreground' },
    { label: 'Zonas Críticas', value: (stats.criticalAssets?.count || 0), icon: AlertTriangle, trend: 'Ativo', color: 'text-destructive' },
    { label: 'Ativos Totais', value: (stats.totalAssets?.count || 0), icon: Zap, trend: 'Monitorizado', color: 'text-foreground' },
  ];

  return (
    <div className="space-y-6">
      {/* High-Fidelity KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <Card key={i} className="shadow-sm border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
               <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{kpi.label}</CardTitle>
               <kpi.icon size={14} className="text-muted-foreground/50" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">{kpi.value}</div>
              <p className="text-[10px] font-semibold text-emerald-500 mt-1 flex items-center gap-1">
                 <TrendingUp size={10} />
                 {kpi.trend} 
                 <span className="text-muted-foreground/40 font-medium ml-1">desde o último mês</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Graph */}
        <Card className="lg:col-span-2 shadow-sm border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-6">
            <div className="space-y-1">
              <CardTitle className="text-sm font-bold tracking-tight">Performance Operacional</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Telemetria de incidentes processados em tempo real.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
               <Badge variant="secondary" className="text-[10px] font-bold h-5 uppercase">Live</Badge>
               <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical size={14} /></Button>
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
        <Card className="lg:col-span-2 shadow-sm border-border overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
               <div>
                  <CardTitle className="text-sm font-bold tracking-tight">Incidentes Recentes</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">Últimas ocorrências registadas no sistema.</CardDescription>
               </div>
               <Button variant="outline" size="sm" className="h-8 text-xs font-bold">Ver Todos</Button>
            </div>
          </CardHeader>
          <div className="border-t border-border">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="text-[10px] uppercase font-bold h-10 px-6">ID Incidente</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold h-10">Descrição</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold h-10">Estado</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold h-10 text-right pr-6">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ensureArray<any>(stats.recentIncidents).slice(0, 6).map((inc) => (
                  <TableRow key={inc.id} className="group h-14 border-border/50">
                    <TableCell className="px-6 font-mono text-[10px] text-muted-foreground">
                       <span className="bg-muted px-2 py-1 rounded-md">ID-{inc.id?.toString().slice(-4).toUpperCase()}</span>
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-col">
                          <span className="text-xs font-bold text-foreground truncate max-w-[300px]">{inc.descricao}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date().toLocaleDateString()}</span>
                       </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={inc.estado === 'Novo' ? 'destructive' : (inc.estado === 'Em Progresso' ? 'default' : 'secondary')} 
                        className="text-[9px] h-4 uppercase font-bold px-2"
                      >
                        {inc.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => onSelectIncident?.(inc.id)}>
                        <ArrowUpRight size={14} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Live Presence Monitor */}
        <Card className="shadow-sm border-border bg-card">
          <CardHeader>
            <div className="flex items-center justify-between">
               <CardTitle className="text-sm font-bold tracking-tight">Monitor de Acessos</CardTitle>
               <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Live</span>
               </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeUsers.length === 0 ? (
               <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-3">
                  <Activity size={24} className="opacity-10" />
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-30 italic">Sem conexões ativas</p>
               </div>
            ) : (
              activeUsers.map((u, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-default">
                  <Avatar className="h-8 w-8 border border-border shadow-sm">
                    <AvatarFallback className="text-[10px] font-bold bg-muted uppercase text-muted-foreground">{(u.nome || 'U').slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs font-bold truncate text-foreground">{u.nome}</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-medium">{u.perfil || 'Acesso Remoto'}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-full">
                     <Clock size={10} className="text-muted-foreground" />
                     <span className="text-[9px] font-bold text-muted-foreground uppercase">Ativo</span>
                  </div>
                </div>
              ))
            )}
            {activeUsers.length > 0 && (
               <Button variant="ghost" className="w-full text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground h-8 mt-4">
                  Gerenciar Sessões
               </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
