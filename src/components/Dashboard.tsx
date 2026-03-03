import React, { useState, useEffect } from 'react';
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { motion } from 'motion/react';
import socket from '../services/socketService';

export default function Dashboard({ onSelectIncident }: { onSelectIncident?: (id: string) => void }) {
  const [stats, setStats] = useState<any>(null);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();

    socket.emit("join-room", {
      roomId: "dashboard",
      user: JSON.parse(localStorage.getItem('user') || '{}')
    });

    socket.on("presence-update", (users) => {
      setActiveUsers(users);
    });

    return () => {
      socket.off("presence-update");
    };
  }, []);

  const fetchStats = async () => {
    const res = await fetch('/api/dashboard', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json();
    setStats(data);
  };

  if (!stats) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">A inicializar Centro de Comando...</p>
    </div>
  );

  const kpis = [
    { label: 'Protocolos Ativos', value: stats.totalIncidents.count, icon: Activity, color: 'text-emerald-500', trend: 'Total', up: true },
    { label: 'Conformidade SLA', value: `${stats.slaCompliance}%`, icon: Shield, color: 'text-blue-500', trend: 'Real', up: true },
    { label: 'Ativos Críticos', value: stats.criticalAssets.count.toString().padStart(2, '0'), icon: Cpu, color: 'text-amber-500', trend: 'Crítico', up: false },
    { label: 'Total de Ativos', value: stats.totalAssets.count.toString().padStart(2, '0'), icon: Zap, color: 'text-purple-500', trend: 'Ativo', up: true },
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
              <div className={`p-2 rounded-xl bg-white/5 ${kpi.color}`}>
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
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Volume de incidentes vs velocidade de resolução</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-lg border border-white/5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Ativo</span>
              </div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.byStatus}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="estado"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 9, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 9, fontWeight: 600 }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#151619', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff', fontSize: '11px', fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="count" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Distribution */}
        <div className="bg-brand-surface p-6 rounded-none border border-brand-border">
          <h3 className="text-base font-bold text-white tracking-tight mb-6">Matriz de Severidade</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.bySeverity}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="count"
                >
                  {stats.bySeverity.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={
                      entry.severidade === 'Crítico' ? '#EF4444' :
                        entry.severidade === 'Alto' ? '#F59E0B' :
                          entry.severidade === 'Médio' ? '#3B82F6' : '#10B981'
                    } />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#151619', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff', fontSize: '11px', fontWeight: 600 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {stats.bySeverity.map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-2 bg-white/5 p-2 rounded-xl border border-white/5">
                <div className={`w-1.5 h-1.5 rounded-full ${s.severidade === 'Crítico' ? 'bg-red-500' :
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
            <button className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest hover:underline">Ver Matriz Completa</button>
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
                {stats.recentIncidents.map((incident: any) => (
                  <tr
                    key={incident.id}
                    className="data-row"
                    onClick={() => onSelectIncident?.(incident.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-[10px] font-bold text-emerald-500 border border-white/5">
                          #{incident.id.toString().padStart(3, '0')}
                        </div>
                        <span className="font-bold text-white text-xs">{incident.categoria}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-300 font-medium">{incident.property_name}</span>
                        <span className="text-[9px] text-gray-500 uppercase tracking-widest">Ativo da Infraestrutura</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${incident.severidade === 'Crítico' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                        incident.severidade === 'Alto' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                          'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                        }`}>
                        {incident.severidade}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${incident.estado === 'Resolvido' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{incident.estado}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button className="p-1.5 hover:bg-white/5 rounded-lg text-gray-500 transition-colors">
                        <ArrowUpRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Real-time Presence */}
        <div className="bg-brand-surface p-6 rounded-none border border-brand-border">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-white tracking-tight">Pessoal Ativo</h3>
            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[9px] font-bold rounded-lg uppercase tracking-widest border border-emerald-500/20">Direto</span>
          </div>
          <div className="space-y-4">
            {activeUsers.map((u, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5 group hover:border-emerald-500/30 transition-all">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white">
                    {u.user.nome.charAt(0)}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-brand-surface"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{u.user.nome}</p>
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
      </div>
    </div>
  );
}
