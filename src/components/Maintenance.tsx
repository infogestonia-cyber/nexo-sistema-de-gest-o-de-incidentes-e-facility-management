import React, { useState, useEffect } from 'react';
import { ensureArray } from '../utils/safeArray';
import {
  Plus, Calendar as CalendarIcon, Settings, User, Clock, CheckCircle2, AlertCircle,
  Search, X, MoreVertical, DollarSign, Activity, Shield,
  Zap, Eye, Edit2, Trash2, Check, AlertTriangle,
  ChevronDown, FileText, Wrench, ListChecks, History as HistoryIcon,
  ArrowUpRight
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { canManageMaintenance } from '../utils/permissions';

// --- shadcn UI imports ---
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from './ui/dropdown-menu';

type MaintenanceTab = 'executions' | 'automation' | 'history';

export default function Maintenance() {
  const [plans, setPlans] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<MaintenanceTab>('executions');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAutomationModalOpen, setIsAutomationModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  const [currentUser] = useState<any>(() => {
    try {
      const u = localStorage.getItem('user');
      return u && u !== 'undefined' ? JSON.parse(u) : {};
    } catch { return {}; }
  });

  const [formData, setFormData] = useState({
    asset_id: '',
    tipo: 'Preventiva',
    periodicidade: 'Mensal',
    proxima_data: format(new Date(), 'yyyy-MM-dd'),
    responsavel_id: '',
    custo_estimado: '',
    descricao: '',
  });

  const [automationFormData, setAutomationFormData] = useState({
    asset_id: '',
    task_description: '',
    frequency_days: '',
    threshold_value: '',
    categoria: 'Preventiva'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const h = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
      const [execRes, schedRes, histRes, assetsRes, usersRes] = await Promise.all([
        fetch('/api/maintenance/executions', { headers: h }),
        fetch('/api/maintenance/schedules', { headers: h }),
        fetch('/api/maintenance/history', { headers: h }),
        fetch('/api/assets', { headers: h }),
        fetch('/api/users', { headers: h })
      ]);

      const execData = execRes.ok ? await execRes.json() : [];
      const schedData = schedRes.ok ? await schedRes.json() : [];
      const histData = histRes.ok ? await histRes.json() : [];
      const assetsData = assetsRes.ok ? await assetsRes.json() : [];
      const usersData = usersRes.ok ? await usersRes.json() : [];

      setPlans(Array.isArray(execData) ? execData : []);
      setSchedules(Array.isArray(schedData) ? schedData : []);
      setHistory(Array.isArray(histData) ? histData : []);
      setAssets(Array.isArray(assetsData) ? assetsData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (err) {
      console.error('Erro ao carregar dados de manutenção:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.asset_id || !formData.responsavel_id) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/maintenance-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
        setFormData({ asset_id: '', tipo: 'Preventiva', periodicidade: 'Mensal', proxima_data: format(new Date(), 'yyyy-MM-dd'), responsavel_id: '', custo_estimado: '', descricao: '' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutomationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!automationFormData.asset_id || !automationFormData.task_description) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/maintenance/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...automationFormData,
          frequency_days: automationFormData.frequency_days ? parseInt(automationFormData.frequency_days) : null,
          threshold_value: automationFormData.threshold_value ? parseInt(automationFormData.threshold_value) : null
        })
      });
      if (res.ok) {
        setIsAutomationModalOpen(false);
        setAutomationFormData({ asset_id: '', task_description: '', frequency_days: '', threshold_value: '', categoria: 'Preventiva' });
        fetchData();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkComplete = async (plan: any) => {
    try {
      const res = await fetch(`/api/maintenance/executions/${plan.id}/complete`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ observations: 'Concluído via interface de manutenção' })
      });
      if (res.ok) {
        fetchData();
        setSelectedPlan(null);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem a certeza que deseja eliminar este plano?')) return;
    try {
      const res = await fetch(`/api/maintenance-plans/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredPlans = ensureArray<any>(plans).filter(p => {
    const matchesSearch = !searchQuery ||
      p.asset_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tipo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.periodicidade?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const planDate = new Date(p.proxima_data);
    const matchesMonth = planDate.getMonth() === selectedMonth && planDate.getFullYear() === selectedYear;
    
    return matchesSearch && matchesMonth;
  });

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">A carregar manutenção...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Tab Navigation - Industrial Minimalism */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="flex bg-muted/20 p-1 border border-border rounded-md">
          {[
            { id: 'executions', label: 'Protocolos', icon: Activity },
            { id: 'automation', label: 'Automação', icon: Zap },
            { id: 'history', label: 'Histórico', icon: HistoryIcon },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(tab.id as MaintenanceTab)}
              className="h-8 gap-2 text-[10px] font-bold uppercase tracking-widest rounded-sm px-4"
            >
              <tab.icon size={13} />
              {tab.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
           {activeTab === 'executions' && canManageMaintenance(currentUser.perfil) && (
            <Button size="sm" className="h-9 gap-2 text-xs font-bold" onClick={() => setIsModalOpen(true)}>
              <Plus size={16} /> Novo Plano
            </Button>
          )}
          {activeTab === 'automation' && canManageMaintenance(currentUser.perfil) && (
            <Button size="sm" variant="outline" className="h-9 gap-2 text-xs font-bold border-amber-500/30 text-amber-500 hover:bg-amber-500/10" onClick={() => setIsAutomationModalOpen(true)}>
              <Zap size={16} /> Agendar Trigger
            </Button>
          )}
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Protocolos Ativos', value: plans.length, icon: Activity, color: 'text-foreground' },
          { label: 'Preventiva', value: plans.filter(p => p.tipo === 'Preventiva').length, icon: Shield, color: 'text-primary' },
          { label: 'Correctiva', value: plans.filter(p => p.tipo === 'Correctiva').length, icon: Wrench, color: 'text-warning' },
          { label: 'Budget Mensal', value: `MT ${plans.reduce((acc, p) => acc + (p.custo_estimado || 0), 0).toLocaleString()}`, icon: DollarSign, color: 'text-success' },
        ].map((s, i) => (
          <Card key={i} className="shadow-none border-border">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{s.label}</p>
                <p className={`text-sm font-bold mt-1 ${s.color}`}>{s.value}</p>
              </div>
              <s.icon size={18} className="text-muted-foreground/30" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Content */}
      <div className="space-y-6">
        {activeTab === 'executions' && (
          <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                  <Input
                    placeholder="Pesquisar..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 w-64 h-9 text-xs bg-muted/20 border-border"
                  />
                </div>
                <Select value={selectedMonth.toString()} onValueChange={val => setSelectedMonth(parseInt(val))}>
                  <SelectTrigger className="w-32 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m, i) => <SelectItem key={i} value={i.toString()}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={selectedYear.toString()} onValueChange={val => setSelectedYear(parseInt(val))}>
                  <SelectTrigger className="w-24 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026].map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex bg-muted/20 p-1 border border-border rounded-md">
                <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('list')} className="h-7 w-7"><ListChecks size={13} /></Button>
                <Button variant={viewMode === 'calendar' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('calendar')} className="h-7 w-7"><CalendarIcon size={13} /></Button>
              </div>
            </div>

            {viewMode === 'list' ? (
              <Card className="shadow-none border-border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[10px] uppercase font-bold h-10">Ativo</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold h-10">Tipo</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold h-10">Periodicidade</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold h-10">Responsável</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold h-10">Vencimento</TableHead>
                      <TableHead className="w-12 h-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPlans.map(plan => {
                      const daysLeft = Math.ceil((new Date(plan.proxima_data).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                      return (
                        <TableRow key={plan.id} className="cursor-pointer group h-14" onClick={() => setSelectedPlan(plan)}>
                          <TableCell className="text-xs font-semibold">{plan.asset_name}</TableCell>
                          <TableCell>
                            <Badge variant={plan.tipo === 'Preventiva' ? 'outline' : 'destructive'} className="text-[9px] h-4 uppercase font-bold">
                              {plan.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                            {plan.periodicidade}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden shrink-0">
                                <User size={10} className="text-muted-foreground" />
                              </div>
                              <span className="text-xs text-muted-foreground">{plan.responsavel_nome}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-xs font-mono">{plan.proxima_data}</span>
                              <span className={`text-[9px] font-bold uppercase ${daysLeft <= 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                {daysLeft <= 0 ? 'Vencido' : `${daysLeft} dias restantes`}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                             <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/30 group-hover:text-foreground">
                                  <MoreVertical size={14} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 text-xs">
                                <DropdownMenuLabel>Gestão de Plano</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleMarkComplete(plan)}>
                                  <Check size={14} className="mr-2" /> Concluir Trabalho
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Edit2 size={14} className="mr-2" /> Editar Plano
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(plan.id)}>
                                  <Trash2 size={14} className="mr-2" /> Eliminar Plano
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredPlans.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic text-xs">
                          Nenhum plano pendente neste período.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            ) : (
              <Card className="shadow-none border-border overflow-hidden p-4">
                <div className="grid grid-cols-7 gap-px bg-border rounded-lg border border-border overflow-hidden">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                    <div key={d} className="bg-muted/50 p-2 text-center text-[10px] font-bold text-muted-foreground uppercase">{d}</div>
                  ))}
                  {(() => {
                    const monthStart = startOfMonth(new Date(selectedYear, selectedMonth));
                    const monthEnd = endOfMonth(monthStart);
                    const startDate = startOfWeek(monthStart);
                    const endDate = endOfWeek(monthEnd);
                    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

                    return calendarDays.map((day, i) => {
                      const dayStr = format(day, 'yyyy-MM-dd');
                      const dayPlans = filteredPlans.filter(p => p.proxima_data === dayStr);
                      const isCurrentMonth = isSameMonth(day, monthStart);

                      return (
                        <div key={i} className={`bg-card h-24 p-2 relative group hover:bg-muted/10 transition-colors flex flex-col ${!isCurrentMonth ? 'opacity-20' : ''}`}>
                          <span className={`text-[10px] font-bold ${isSameDay(day, new Date()) ? 'text-primary' : 'text-muted-foreground'}`}>{format(day, 'd')}</span>
                          <div className="mt-1 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
                            {dayPlans.map(p => (
                              <div key={p.id} onClick={() => setSelectedPlan(p)} className={`px-1.5 py-0.5 text-[8px] font-bold truncate rounded-sm border cursor-pointer hover:brightness-90 ${p.tipo === 'Preventiva' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-destructive/10 border-destructive/20 text-destructive'}`}>
                                {p.asset_name}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </Card>
            )}
          </>
        )}

        {activeTab === 'automation' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <Card className="shadow-none border-border overflow-hidden">
                <Table>
                   <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[10px] uppercase font-bold h-10">Tarefa Agendada</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold h-10">Recorrência</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold h-10">Status</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold h-10 text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules.map(s => (
                      <TableRow key={s.id} className="h-14">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold">{s.task_description}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">{s.assets?.nome}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
                            <Clock size={12} />
                            {s.frequency_days ? `Cada ${s.frequency_days} dias` : `Limite ${s.threshold_value}`}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[9px] h-4 bg-primary/10 text-primary border-primary/20">ATIVO</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/30 hover:text-foreground">
                            <MoreHorizontal size={14}/>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {schedules.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic text-xs">Sem automações configuradas.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
            
            <div className="space-y-6">
              <Card className="shadow-none border-border bg-zinc-950 text-white">
                <CardHeader className="p-4 border-b border-white/10">
                  <CardTitle className="text-[10px] uppercase font-bold flex items-center gap-2">
                    <Zap size={14} className="text-amber-500" />
                    Motor de Automação
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    O sistema verifica diariamente gatilhos baseados em tempo e registros de medidores para gerar novos protocolos.
                  </p>
                  <div className="p-3 bg-white/5 border border-white/10 rounded flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-success animate-pulse"></div>
                    <span className="text-[10px] font-bold uppercase text-zinc-300">Sincronizado & Ativo</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <Card className="shadow-none border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase font-bold h-10">Ativo</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold h-10">Tipo</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold h-10">Conclusão</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold h-10">Técnico Responsável</TableHead>
                  <TableHead className="w-12 h-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map(h => (
                  <TableRow key={h.id} className="h-14">
                    <TableCell className="text-xs font-semibold">{h.assets?.nome}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[8px] h-3.5 bg-muted/20 text-muted-foreground">{h.tipo}</Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {h.data_conclusao ? format(new Date(h.data_conclusao), 'dd/MM/yyyy HH:mm') : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{h.profiles?.nome}</TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/30"><Eye size={14} /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* New Plan Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Plano de Manutenção</DialogTitle>
            <DialogDescription>Registe um protocolo preventivo ou correctivo para um ativo.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
             <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Equipamento / Ativo</Label>
              <Select value={formData.asset_id} onValueChange={val => setFormData({...formData, asset_id: val})}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {assets.map(a => <SelectItem key={a.id} value={a.id.toString()}>{a.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Tipo de Plano</Label>
                <Select value={formData.tipo} onValueChange={val => setFormData({...formData, tipo: val})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Preventiva">Preventiva</SelectItem>
                    <SelectItem value="Correctiva">Correctiva</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Frequência</Label>
                <Select value={formData.periodicidade} onValueChange={val => setFormData({...formData, periodicidade: val})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Única">Única</SelectItem>
                    <SelectItem value="Semanal">Semanal</SelectItem>
                    <SelectItem value="Mensal">Mensal</SelectItem>
                    <SelectItem value="Trimestral">Trimestral</SelectItem>
                    <SelectItem value="Anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Próxima Data</Label>
                <Input type="date" value={formData.proxima_data} onChange={e => setFormData({...formData, proxima_data: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Budget Estimado (MT)</Label>
                <Input type="number" placeholder="0.00" value={formData.custo_estimado} onChange={e => setFormData({...formData, custo_estimado: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Técnico Responsável</Label>
              <Select value={formData.responsavel_id} onValueChange={val => setFormData({...formData, responsavel_id: val})}>
                <SelectTrigger><SelectValue placeholder="Selecione técnico..." /></SelectTrigger>
                <SelectContent>
                  {users.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Instruções Técnicas</Label>
              <Textarea placeholder="Descreva as tarefas a realizar..." rows={3} value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})} />
            </div>
            <DialogFooter className="gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={submitting} className="flex-1 font-bold">
                {submitting ? 'A criar...' : 'Confirmar Protocolo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Automation Modal */}
      <Dialog open={isAutomationModalOpen} onOpenChange={setIsAutomationModalOpen}>
        <DialogContent className="max-w-md">
           <DialogHeader>
            <DialogTitle>Novo Agendamento Inteligente</DialogTitle>
            <DialogDescription>Crie gatilhos automáticos baseados em tempo ou uso.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAutomationSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Ativo Alvo</Label>
              <Select value={automationFormData.asset_id} onValueChange={val => setAutomationFormData({...automationFormData, asset_id: val})}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {assets.map(a => <SelectItem key={a.id} value={a.id.toString()}>{a.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Descrição da Tarefa Automática</Label>
              <Input required value={automationFormData.task_description} onChange={e => setAutomationFormData({...automationFormData, task_description: e.target.value})} placeholder="ex: Troca de Filtros" />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Freq. Duração (Dias)</Label>
                <Input type="number" placeholder="ex: 180" value={automationFormData.frequency_days} onChange={e => setAutomationFormData({...automationFormData, frequency_days: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Threshold de Uso</Label>
                <Input type="number" placeholder="ex: 5000" value={automationFormData.threshold_value} onChange={e => setAutomationFormData({...automationFormData, threshold_value: e.target.value})} />
              </div>
            </div>
            <DialogFooter className="gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsAutomationModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={submitting} className="flex-1 bg-amber-500 hover:bg-amber-600 font-bold border-none text-white">
                {submitting ? 'Ativando...' : 'Ativar Automação'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Plan Details Modal */}
      <Dialog open={!!selectedPlan} onOpenChange={() => setSelectedPlan(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resumo do Protocolo</DialogTitle>
            <DialogDescription>Informação detalhada da manutenção preventiva/correctiva.</DialogDescription>
          </DialogHeader>
          {selectedPlan && (
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Ativo</Label>
                  <p className="font-semibold">{selectedPlan.asset_name}</p>
                </div>
                <div>
                   <Label className="text-[10px] uppercase font-bold text-muted-foreground">Vencimento</Label>
                   <p className="font-semibold">{selectedPlan.proxima_data}</p>
                </div>
                <div>
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Tipo</Label>
                  <p className="font-semibold">{selectedPlan.tipo}</p>
                </div>
                <div>
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Responsável</Label>
                  <p className="font-semibold text-primary">{selectedPlan.responsavel_nome}</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Instruções / Notas</Label>
                <p className="text-xs text-muted-foreground leading-relaxed bg-muted/20 p-4 border border-border rounded-md italic">
                  "{selectedPlan.descricao || 'Sem instruções específicas registradas.'}"
                </p>
              </div>
              <DialogFooter className="gap-3">
                 <Button variant="outline" className="flex-1" onClick={() => setSelectedPlan(null)}>Fechar</Button>
                 <Button className="flex-1" onClick={() => handleMarkComplete(selectedPlan)}>
                    Concluir Agora
                 </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Utilities mapped for local scope safety
import { MoreHorizontal } from 'lucide-react';
