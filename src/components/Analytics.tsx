import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  ShieldCheck, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { motion } from 'motion/react';

export default function Analytics() {
  const [data, setData] = useState<any>({
    incidents: [],
    assets: [],
    inventory: [],
    labor: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const h = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const [inc, ass, inv] = await Promise.all([
        fetch('/api/incidents', { headers: h }).then(r => r.json()),
        fetch('/api/assets', { headers: h }).then(r => r.json()),
        fetch('/api/inventory', { headers: h }).then(r => r.json())
      ]);
      setData({ incidents: inc, assets: ass, inventory: inv });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Calculations
  const resolved = data.incidents.filter((i: any) => i.estado === 'Resolvido');
  const mttr = resolved.length > 0 
    ? (resolved.reduce((acc: number, i: any) => {
        const start = new Date(i.created_at).getTime();
        const end = new Date(i.updated_at || i.created_at).getTime();
        return acc + (end - start);
      }, 0) / resolved.length / 3600000).toFixed(1)
    : '0';

  const totalInvValue = data.inventory.reduce((acc: number, i: any) => acc + (i.unit_cost * i.quantity_on_hand), 0);
  const criticalAssets = data.assets.filter((a: any) => a.critico === 1).length;
  
  const weeklyIncidents = [4, 7, 5, 9, 12, 8, 6]; // Mock for trend

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="text-emerald-500" />
            Painel de Inteligência
          </h2>
          <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mt-1">Análise de Performance e Custos Operacionais</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
          title="MTTR Médio" 
          value={`${mttr}h`} 
          change="-12%" 
          positive={true} 
          icon={<Clock size={20} />} 
          subtitle="Tempo Médio de Reparação"
        />
        <KpiCard 
          title="Valor de Inventário" 
          value={`${totalInvValue.toLocaleString()}€`} 
          change="+5%" 
          positive={false} 
          icon={<DollarSign size={20} />} 
          subtitle="Peças em Stock"
        />
        <KpiCard 
          title="Saúde de Ativos" 
          value="94%" 
          change="+2%" 
          positive={true} 
          icon={<ShieldCheck size={20} />} 
          subtitle="Disponibilidade Global"
        />
        <KpiCard 
          title="Ativos Críticos" 
          value={criticalAssets.toString()} 
          change="0%" 
          positive={true} 
          icon={<AlertTriangle size={20} />} 
          subtitle="Manutenção Prioritária"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incident Trend Chart */}
        <div className="lg:col-span-2 bg-brand-surface border border-brand-border p-6 rounded-none relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <TrendingUp size={14} className="text-emerald-500" />
              Tendência de Incidentes (7 Dias)
            </h3>
          </div>
          <div className="h-64 flex items-end justify-between gap-2 px-4">
            {weeklyIncidents.map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: `${(val / 15) * 100}%` }}
                  className="w-full max-w-[40px] bg-emerald-500/20 border-t-2 border-emerald-500 relative group-hover:bg-emerald-500/40 transition-all rounded-t-sm"
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    {val}
                  </div>
                </motion.div>
                <span className="text-[8px] text-gray-600 font-bold uppercase tracking-wider">Dia {i+1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Categories Distribution */}
        <div className="bg-brand-surface border border-brand-border p-6">
           <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-6">Distribuição por Categoria</h3>
           <div className="space-y-4">
              <CategoryRow label="Corretiva" value={58} color="bg-red-500" />
              <CategoryRow label="Preventiva" value={32} color="bg-emerald-500" />
              <CategoryRow label="Melhoria" value={10} color="bg-blue-500" />
           </div>
           <div className="mt-12 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
              <p className="text-[9px] text-gray-500 italic leading-relaxed">
                <span className="text-emerald-500 font-bold">Dica:</span> O aumento da manutenção preventiva em 15% pode reduzir os custos totais em até 25% no próximo trimestre.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value, change, positive, icon, subtitle }: any) {
  return (
    <div className="bg-brand-surface border border-brand-border p-5 group hover:border-emerald-500/30 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg border border-emerald-500/20 group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-bold ${positive ? 'text-emerald-500' : 'text-red-500'}`}>
          {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {change}
        </div>
      </div>
      <div>
        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{title}</h4>
        <div className="text-2xl font-bold text-white mt-1">{value}</div>
        <p className="text-[8px] text-gray-600 uppercase tracking-wider mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

function CategoryRow({ label, value, color }: any) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
        <span className="text-gray-400">{label}</span>
        <span className="text-white">{value}%</span>
      </div>
      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          className={`h-full ${color}`} 
        />
      </div>
    </div>
  );
}
