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

export default function Analytics() {
  const [data, setData] = useState<any>({
    incidents: [],
    assets: [],
    inventory: [],
    plans: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const h = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const [incRes, assRes, invRes, plansRes] = await Promise.all([
        fetch('/api/incidents', { headers: h }),
        fetch('/api/assets', { headers: h }),
        fetch('/api/inventory', { headers: h }),
        fetch('/api/maintenance-plans', { headers: h })
      ]);
      
      const [inc, ass, inv, plans] = await Promise.all([
        incRes.ok ? incRes.json() : [],
        assRes.ok ? assRes.json() : [],
        invRes.ok ? invRes.json() : [],
        plansRes.ok ? plansRes.json() : []
      ]);
      
      setData({ 
        incidents: Array.isArray(inc) ? inc : [], 
        assets: Array.isArray(ass) ? ass : [], 
        inventory: Array.isArray(inv) ? inv : [], 
        plans: Array.isArray(plans) ? plans : []
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

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Processando Inteligência de Dados...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 border-b border-border pb-6">
        <h2 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
          <Activity className="text-primary w-4 h-4" />
          Analytics & Financeiro
        </h2>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 italic">Relatórios de performance operacional e fluxo de tesouraria em tempo real</p>
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
            {[65, 82, 45, 90, 75, 60, 40].map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                <div className="w-full relative flex items-end justify-center">
                   <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${val}%` }}
                    className="w-full max-w-[48px] bg-primary/10 border-t-2 border-primary group-hover:bg-primary/20 transition-all"
                  />
                  <span className="absolute -top-6 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{val}% CapEx</span>
                </div>
                <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">W{i+1}</span>
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
             <AllocationRow label="Mão-de-Obra Técnica" value={42} color="bg-blue-500" price="84.000 MT" />
             <AllocationRow label="Peças & Sobressalentes" value={38} color="bg-primary" price="76.000 MT" />
             <AllocationRow label="Deslocação & Logística" value={15} color="bg-amber-500" price="30.000 MT" />
             <AllocationRow label="Consumíveis Gerais" value={5} color="bg-muted-foreground" price="10.000 MT" />
             
             <Separator className="my-6 opacity-30" />
             
             <div className="p-4 bg-muted/20 border border-border/50 rounded-sm">
                <div className="flex items-center gap-2 mb-2">
                  <PieChart size={14} className="text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Insight de Auditoria</span>
                </div>
                <p className="text-[9px] text-muted-foreground leading-relaxed italic">
                  O consumo de materiais está <span className="text-primary font-bold">12% acima da média</span> este mês devido a intervenções corretivas em ativos críticos na Propriedade "Maputo Central".
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
