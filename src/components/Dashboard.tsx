import React, { useState, useEffect, useMemo } from 'react';
import { ensureArray } from '../utils/safeArray';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  Users,
  Zap,
  Shield,
  ArrowUpRight,
  MoreVertical,
  Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import socket from '../services/socketService';

// --- Custom Chart Components to replace Recharts (Fixes _.some error) ---

function CustomAreaChart({ data }: { data: any[] }) {
  const chartData = useMemo(() => Array.isArray(data) ? data : [], [data]);
  if (chartData.length === 0) return (
    <div className="h-full flex items-center justify-center border border-dashed border-white/10 opacity-30">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Sem dados de performance</p>
    </div>
  );

  const maxVal = Math.max(...chartData.map(d => d.count), 1);
  const width = 1000;
  const height = 200;
  const padding = 20;
  
  const points = chartData.map((d, i) => {
    const x = (i / (chartData.length - 1 || 1)) * (width - padding * 2) + padding;
    const y = height - ((d.count / maxVal) * (height - padding * 2) + padding);
    return { x, y, label: d.estado, val: d.count };
  });

  const pathD = points.length > 0 
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
    : '';

  const areaD = points.length > 0 
    ? `${pathD} L ${points[points.length-1].x} ${height} L ${points[0].x} ${height} Z`
    : '';

  return (
    <div className="h-full w-full relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(p => (
          <line 
            key={p} 
            x1={padding} y1={height - (p * (height - padding * 2) + padding)} 
            x2={width - padding} y2={height - (p * (height - padding * 2) + padding)} 
            stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" 
          />
        ))}
        {/* Area */}
        <motion.path 
          initial={{ opacity: 0, pathLength: 0 }}
          animate={{ opacity: 1, pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          d={areaD} fill="url(#areaGradient)" 
        />
        {/* Line */}
        <motion.path 
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          d={pathD} fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" 
        />
        {/* Points */}
        {points.map((p, i) => (
          <motion.g key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + (i * 0.1) }}>
            <circle cx={p.x} cy={p.y} r="4" fill="#10B981" />
            <circle cx={p.x} cy={p.y} r="8" fill="#10B981" fillOpacity="0.2" className="animate-pulse" />
            <text x={p.x} y={height - 2} textAnchor="middle" fill="#6B7280" fontSize="12" fontWeight="600" className="uppercase tracking-tighter">
              {p.label}
            </text>
          </motion.g>
        ))}
      </svg>
    </div>
  );
}

function CustomPieChart({ data }: { data: any[] }) {
  const chartData = useMemo(() => Array.isArray(data) ? data : [], [data]);
  if (chartData.length === 0) return null;

  const total = ensureArray<any>(chartData).reduce((acc, d) => acc + d.count, 0);
  let currentAngle = 0;
  
  const colors: Record<string, string> = {
    'Crítico': '#EF4444',
    'Alto': '#F59E0B',
    'Médio': '#3B82F6',
    'Baixa': '#10B981'
  };

  return (
    <div className="h-full w-full flex items-center justify-center relative">
      <svg viewBox="0 0 100 100" className="w-48 h-48 -rotate-90">
        {chartData.map((d, i) => {
          const sliceAngle = (d.count / total) * 360;
          const x1 = 50 + 40 * Math.cos((Math.PI * currentAngle) / 180);
          const y1 = 50 + 40 * Math.sin((Math.PI * currentAngle) / 180);
          const x2 = 50 + 40 * Math.cos((Math.PI * (currentAngle + sliceAngle)) / 180);
          const y2 = 50 + 40 * Math.sin((Math.PI * (currentAngle + sliceAngle)) / 180);
          const largeArcFlag = sliceAngle > 180 ? 1 : 0;
          const path = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
          const start = currentAngle;
          currentAngle += sliceAngle;

          return (
            <motion.path 
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              d={path} 
              fill={colors[d.severidade] || '#10B981'} 
              stroke="#151619" 
              strokeWidth="2"
              className="hover:opacity-80 transition-opacity cursor-pointer text-[#10B981]" // generic fallback color just in case
            />
          );
        })}
        <circle cx="50" cy="50" r="28" fill="#151619" />
      </svg>
      {/* Total Center Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total</span>
        <span className="text-xl font-black text-white">{total}</span>
      </div>
    </div>
  );
}

// --- End of Custom Chart Components ---

export default function Dashboard({ onSelectIncident }: { onSelectIncident?: (id: string) => void }) {
  const [stats, setStats] = useState<any>(null);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();

    let parsedUser = {};
    try {
      const rawUser = localStorage.getItem('user');
      parsedUser = rawUser && rawUser !== 'undefined' ? JSON.parse(rawUser) : {};
    } catch (e) { console.error('Error parsing user', e); }

    socket.emit("join-room", {
      roomId: "dashboard",
      user: parsedUser
    });

    socket.on("presence-update", (users) => {
      setActiveUsers(Array.isArray(users) ? users : []);
    });

    socket.on("incident-update", () => {
      fetchStats();
    });

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
      if (!res.ok) throw new Error('Falha ao carregar dashboard');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStats(data);
    } catch (e) {
      console.error(e);
    }
  };

  if (!stats) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-none animate-spin"></div>
      <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">A inicializar Centro de Comando...</p>
    </div>
  );

  const kpis = [
    { label: 'Protocolos Ativos', value: stats.totalIncidents?.count || 0, icon: Activity, color: 'text-emerald-500', trend: 'Total', up: true },
    { label: 'Conformidade SLA', value: `${stats.slaCompliance || 0}%`, icon: Shield, color: 'text-blue-500', trend: 'Real', up: true },
    { label: 'Ativos Críticos', value: (stats.criticalAssets?.count || 0).toString().padStart(2, '0'), icon: Cpu, color: 'text-amber-500', trend: 'Crítico', up: false },
    { label: 'Total de Ativos', value: (stats.totalAssets?.count || 0).toString().padStart(2, '0'), icon: Zap, color: 'text-purple-500', trend: 'Ativo', up: true },
  ];

  return (
    <div className="space-y-6 page-enter">
      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-brand-surface p-5 rounded-none border border-brand-border relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <kpi.icon size={64} />
            </div>
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-none bg-white/5 ${kpi.color}`}>
                <kpi.icon size={18} />
              </div>
              <div className={`flex items-center gap-1 text-[10px] font-bold ${kpi.up ? 'text-emerald-500' : 'text-red-500'}`}>
                {kpi.up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {kpi.trend}
              </div>
            </div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{kpi.label}</p>
            <p className="text-xl font-bold text-white tracking-tight mt-1">{kpi.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-brand-surface p-6 rounded-none border border-brand-border">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Desempenho Operacional</h3>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Volume de incidentes vs estado de resolução</p>
            </div>
          </div>
          <div className="h-64">
             <CustomAreaChart data={stats.byStatus} />
          </div>
        </div>

        {/* Severity Distribution */}
        <div className="bg-brand-surface p-6 rounded-none border border-brand-border">
          <h3 className="text-base font-bold text-white tracking-tight mb-6">Matriz de Severidade</h3>
          <div className="h-56">
             <CustomPieChart data={stats.bySeverity} />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {ensureArray<any>(stats.bySeverity).map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-2 bg-white/5 p-2 rounded-none border border-white/5">
                <div className={`w-1.5 h-1.5 rounded-none ${s.severidade === 'Crítico' ? 'bg-red-500' :
                  s.severidade === 'Alto' ? 'bg-amber-500' :
                    s.severidade === 'Médio' ? 'bg-blue-500' : 'bg-emerald-500'
                  }`}></div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">{s.severidade}</span>
                <span className="text-[10px] font-mono font-bold text-white ml-auto">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Protocols */}
        <div className="lg:col-span-2 bg-brand-surface rounded-none border border-brand-border overflow-hidden">
          <div className="p-6 border-b border-brand-border flex items-center justify-between">
            <h3 className="text-base font-bold text-white tracking-tight">Protocolos Ativos</h3>
            <button className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest hover:underline">Consola Total</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th className="col-header">Protocolo</th>
                  <th className="col-header">Ativo / Propriedade</th>
                  <th className="col-header">Severidade</th>
                  <th className="col-header">Estado</th>
                  <th className="col-header">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {ensureArray<any>(stats.recentIncidents).map((incident: any) => (
                  <tr
                    key={incident.id}
                    className="data-row"
                    onClick={() => onSelectIncident?.(incident.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-none bg-white/5 flex items-center justify-center text-[10px] font-bold text-emerald-500 border border-white/5">
                          #{incident.id.toString().slice(-4).toUpperCase()}
                        </div>
                        <span className="font-bold text-white text-xs">{incident.categoria}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-300 font-medium truncate max-w-[150px]">{incident.property_name || 'Protocolo Direto'}</span>
                        <span className="text-[9px] text-gray-500 uppercase tracking-widest">Ativo da Infraestrutura</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-none text-[9px] font-bold uppercase tracking-wider ${incident.severidade === 'Crítico' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                        incident.severidade === 'Alto' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                          'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                        }`}>
                        {incident.severidade}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-none ${incident.estado === 'Resolvido' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{incident.estado}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button className="p-1.5 hover:bg-white/5 rounded-none text-gray-500 transition-colors">
                        <ArrowUpRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {ensureArray<any>(stats.recentIncidents).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[10px] font-bold text-gray-600 uppercase tracking-widest">Sem protocolos ativos</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Real-time Presence */}
        <div className="bg-brand-surface p-6 rounded-none border border-brand-border">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-white tracking-tight">Pessoal Ativo</h3>
            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[9px] font-bold rounded-none uppercase tracking-widest border border-emerald-500/20">Direto</span>
          </div>
          <div className="space-y-4">
            {activeUsers.map((u, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-none border border-white/5 group hover:border-emerald-500/30 transition-all">
                <div className="relative">
                  <div className="w-8 h-8 rounded-none bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                    {u.user?.nome?.charAt(0) || '?'}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-none border-2 border-brand-surface"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{u.user?.nome || 'Utilizador Nexo'}</p>
                  <p className="text-[9px] text-gray-500 uppercase tracking-widest truncate">{u.roomId}</p>
                </div>
                <MoreVertical size={14} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
              </div>
            ))}
            {activeUsers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 opacity-20">
                <Users size={32} className="text-gray-500 mb-2" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Sem Sessões Ativas</span>
              </div>
            )}
          </div>
        </div>

        {/* Budget Consumption */}
        <div className="lg:col-span-3 bg-brand-surface p-6 rounded-none border border-brand-border">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Consumo Orçamental por Cliente</h3>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Comparação entre gasto projetado e orçamento mensal</p>
            </div>
            <div className="p-2 bg-emerald-500/10 rounded-none text-emerald-500">
              <Zap size={18} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ensureArray<any>(stats.budgetSummary).map((client: any, i: number) => {
              const consumption = Math.random() * 80; // Placeholder until we have real totals per client
              return (
                <div key={i} className="space-y-3 p-4 bg-white/5 rounded-none border border-white/5 relative group transition-all hover:border-emerald-500/30">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none mb-1">Cliente</p>
                      <h4 className="text-sm font-bold text-white">{client.nome}</h4>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-mono font-bold text-white">{consumption.toFixed(1)}%</p>
                      <p className="text-[9px] text-gray-500 uppercase tracking-widest">Consumido</p>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-none overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${consumption}%` }}
                      transition={{ duration: 1.5, delay: i * 0.1 }}
                      className={`h-full ${consumption > 90 ? 'bg-red-500' : consumption > 60 ? 'bg-orange-500' : 'bg-emerald-500'}`}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] font-mono text-gray-500">
                    <span>Gasto: {(client.orcamento_mensal * (consumption/100)).toLocaleString('pt-MZ')} MT</span>
                    <span>Budget: {client.orcamento_mensal?.toLocaleString('pt-MZ')} MT</span>
                  </div>
                </div>
              );
            })}
            {ensureArray<any>(stats.budgetSummary).length === 0 && (
              <p className="col-span-full text-center py-10 text-[10px] font-bold text-gray-600 uppercase tracking-widest italic">Nenhum cliente com orçamento configurado</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

