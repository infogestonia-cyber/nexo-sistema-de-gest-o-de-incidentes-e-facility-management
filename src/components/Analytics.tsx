import React, { useState, useEffect } from 'react';
import { ensureArray } from '../utils/safeArray';
import { 
  BarChart3, TrendingUp, DollarSign, Clock, 
  ShieldCheck, AlertTriangle, ArrowUpRight, 
  ArrowDownRight, PieChart, Activity, Wallet
} from 'lucide-react';
import { motion } from 'motion/react';

// --- shadcn UI imports ---
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { RefreshButton } from './ui/RefreshButton';

import { 
  format, subWeeks, startOfWeek, endOfWeek, isWithinInterval, parseISO 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Analytics() {
  const [data, setData] = useState<any>({
    incidents: [],
    assets: [],
    inventory: [],
    plans: [],
    allocation: { percentages: { labor: 40, parts: 35, logistics: 15, consumables: 10 }, labor: 0, parts: 0, logistics: 0, consumables: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const h = { Authorization: `Bearer ${(sessionStorage.getItem('token') || localStorage.getItem('token'))}` };
      const [incRes, assRes, invRes, plansRes, allocRes] = await Promise.all([
        fetch('/api/incidents', { headers: h }),
        fetch('/api/assets', { headers: h }),
        fetch('/api/inventory', { headers: h }),
        fetch('/api/maintenance-plans', { headers: h }),
        fetch('/api/analytics/resource-allocation', { headers: h })
      ]);
      
      const [inc, ass, inv, plans, allocation] = await Promise.all([
        incRes.ok ? incRes.json() : [],
        assRes.ok ? assRes.json() : [],
        invRes.ok ? invRes.json() : [],
        plansRes.ok ? plansRes.json() : [],
        allocRes.ok ? allocRes.json() : null
      ]);
      
      setData({ 
        incidents: Array.isArray(inc) ? inc : [], 
        assets: Array.isArray(ass) ? ass : [], 
        inventory: Array.isArray(inv) ? inv : [], 
        plans: Array.isArray(plans) ? plans : [],
        allocation: allocation || { percentages: { labor: 40, parts: 35, logistics: 15, consumables: 10 }, labor: 0, parts: 0, logistics: 0, consumables: 0 }
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const incidents = ensureArray<any>(data.incidents);
  const resolved = incidents.filter((i: any) => i.estado === 'Resolvido');
  const mttr = resolved.length > 0 
    ? (resolved.reduce((acc: number, i: any) => {
        const start = new Date(i.created_at).getTime();
        const end = new Date(i.updated_at || i.created_at).getTime();
        return acc + (end - start);
      }, 0) / resolved.length / 3600000).toFixed(1)
    : '0';

  const inventory = ensureArray<any>(data.inventory);
  const totalInvValue = inventory.reduce((acc: number, i: any) => acc + ((parseFloat(i.preco_compra) || 0) * (i.quantidade || 0)), 0);
  
  const assets = ensureArray<any>(data.assets);
  const criticalAssets = assets.filter((a: any) => a.critico === 1).length;
  
  const plans = ensureArray<any>(data.plans);
  const totalBudgeted = plans.reduce((acc: number, p: any) => acc + (p.custo_estimado || 0), 0);

  const totalIncidentsCost = incidents.reduce((acc: number, i: any) => acc + (i.custo_estimado || 0), 0);
  const totalOperationalSpending = totalBudgeted + totalIncidentsCost;

  // Efficiency Chart Dynamic Data (Last 7 Weeks)
  const last7Weeks = Array.from({ length: 7 }, (_, i) => {
    const date = subWeeks(new Date(), 6 - i);
    const start = startOfWeek(date);
    const end = endOfWeek(date);
    
    const weeklyIncidentsCost = incidents.reduce((acc, inc) => {
      const incDate = parseISO(inc.created_at || inc.data_abertura);
      if (isWithinInterval(incDate, { start, end })) {
        return acc + (inc.custo_estimado || 0);
      }
      return acc;
    }, 0);

    const weeklyPlansCost = plans.reduce((acc, plan) => {
      const planDate = parseISO(plan.proxima_data);
      if (isWithinInterval(planDate, { start, end })) {
        return acc + (plan.custo_estimado || 0);
      }
      return acc;
    }, 0);

    return {
      label: `W${format(date, 'w')}`,
      value: weeklyIncidentsCost + weeklyPlansCost,
      total: weeklyIncidentsCost + weeklyPlansCost
    };
  });

  const maxWeeklyCost = Math.max(...last7Weeks.map(w => w.value), 1);
  const chartData = last7Weeks.map(w => ({
    ...w,
    percentage: Math.round((w.value / maxWeeklyCost) * 100)
  }));

  // Resource Allocation Dynamic Calculations
  const alloc = data.allocation;
  const laborAlloc = alloc.labor;
  const partsAlloc = alloc.parts;
  const logisticsAlloc = alloc.logistics;
  const consumablesAlloc = alloc.consumables;
  const percs = alloc.percentages;

  // Audit Insight Logic
  const propertyCosts: Record<string, number> = {};
  incidents.forEach(inc => {
    if (inc.property_id) {
      propertyCosts[inc.property_id] = (propertyCosts[inc.property_id] || 0) + (inc.custo_estimado || 0);
    }
  });

  const topPropertyId = Object.entries(propertyCosts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topPropertyCost = propertyCosts[topPropertyId] || 0;
  const topPropertyPercent = totalOperationalSpending > 0 ? Math.round((topPropertyCost / totalOperationalSpending) * 100) : 0;
  const topPropertyName = assets.find(a => String(a.property_id) === String(topPropertyId))?.property_name || 'Propriedade Principal';

  if (loading && incidents.length === 0) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Processando Inteligência de Dados...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
            <Activity className="text-primary w-4 h-4" />
            Analytics & Financeiro
          </h2>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 italic">Relatórios de performance operacional e fluxo de tesouraria em tempo real</p>
        </div>
        <RefreshButton onClick={fetchAnalytics} loading={loading} />
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="MTTR Operacional" value={`${mttr}h`} icon={Clock} trend="-14%" positive={true} description="Tempo Médio de Reparação" />
        <MetricCard label="Liquidez em Stock" value={`${totalInvValue.toLocaleString()} MT`} icon={Wallet} trend="+2.4%" positive={false} description="Capital de Giro Imobilizado" />
        <MetricCard label="Capex Projetado" value={`${totalBudgeted.toLocaleString()} MT`} icon={DollarSign} trend="Alinhado" positive={true} description="Orçamento Manutenção Prevista" />
        <MetricCard label="Exposição de Risco" value={criticalAssets} icon={ShieldCheck} trend="Estável" positive={true} description="Ativos de Alta Criticidade" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cost Efficiency Chart */}
        <Card className="lg:col-span-2 shadow-none border-border">
          <CardHeader>
            <CardTitle className="text-xs uppercase font-bold tracking-widest">Eficiência Orçamentária</CardTitle>
            <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground/40 mt-1">Comparação entre custo previsto e execução real de manutenção</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] flex items-end justify-between gap-4 px-8 pb-10">
            {chartData.map((week, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                <div className="w-full relative flex items-end justify-center">
                   <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${week.percentage}%` }}
                    className="w-full max-w-[48px] bg-primary/10 border-t-2 border-primary group-hover:bg-primary/20 transition-all"
                  />
                  <span className="absolute -top-6 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{week.total.toLocaleString()} MT</span>
                </div>
                <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">{week.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Resource Allocation */}
        <Card className="shadow-none border-border">
          <CardHeader>
            <CardTitle className="text-xs uppercase font-bold tracking-widest">Alocação de Recursos</CardTitle>
            <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground/40 mt-1">Distribuição percentual de custos operacionais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
             <AllocationRow label="Mão-de-Obra Técnica" value={percs.labor} color="bg-blue-500" price={`${laborAlloc.toLocaleString()} MT`} />
             <AllocationRow label="Peças & Sobressalentes" value={percs.parts} color="bg-primary" price={`${partsAlloc.toLocaleString()} MT`} />
             <AllocationRow label="Deslocação & Logística" value={percs.logistics} color="bg-amber-500" price={`${logisticsAlloc.toLocaleString()} MT`} />
             <AllocationRow label="Consumíveis Gerais" value={percs.consumables} color="bg-muted-foreground" price={`${consumablesAlloc.toLocaleString()} MT`} />
             
             <Separator className="my-6 opacity-30" />
             
             <div className="p-4 bg-muted/20 border border-border/50 rounded-sm">
                <div className="flex items-center gap-2 mb-2">
                  <PieChart size={14} className="text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Insight de Auditoria</span>
                </div>
                <p className="text-[9px] text-muted-foreground leading-relaxed italic">
                  {topPropertyId ? (
                    <>O custo operacional está concentrado em <span className="text-primary font-bold">{topPropertyName}</span>, representando <span className="text-primary font-bold">{topPropertyPercent}% do total</span> este mês devido a intervenções corretivas e preventivas.</>
                  ) : (
                    <>Não foram registados custos operacionais significativos no período atual. A operação mantém-se estável.</>
                  )}
                </p>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, trend, positive, description }: any) {
  return (
    <Card className="shadow-none border-border group hover:border-primary/40 transition-all">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="h-9 w-9 bg-muted/30 border border-border flex items-center justify-center rounded-md text-primary group-hover:scale-110 transition-transform">
            <Icon size={18} />
          </div>
          <Badge variant={positive ? 'success' : 'danger'} className="text-[9px] font-bold px-1.5 h-4 uppercase">
            {trend}
          </Badge>
        </div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">{label}</p>
        <p className="text-xl font-bold mt-1 tracking-tight">{value}</p>
        <p className="text-[8px] font-bold text-muted-foreground/40 uppercase mt-1 tracking-wider">{description}</p>
      </CardContent>
    </Card>
  );
}

function AllocationRow({ label, value, color, price }: any) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
        <span className="text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
           <span className="text-muted-foreground/40 font-mono">{price}</span>
           <span className="text-foreground">{value}%</span>
        </div>
      </div>
      <div className="h-1 bg-muted/40 overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          className={`h-full ${color} opacity-80`} 
        />
      </div>
    </div>
  );
}
