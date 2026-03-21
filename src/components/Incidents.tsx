import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, AlertCircle, Clock, CheckCircle2, 
  X as XIcon, Activity, ChevronDown, Trash2, Download, 
  Calendar as CalendarIcon, User as UserIcon, AlertTriangle, 
  MoreVertical, FileSpreadsheet, ArrowUpRight, ArrowDown,
  RefreshCw, ChevronLeft, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CATEGORIES, SEVERITIES } from '../constants';
import { canReportIncidents } from '../utils/permissions';
import socket from '../services/socketService';

// --- shadcn UI imports ---
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from './ui/dropdown-menu';
import { Separator } from './ui/separator';
import { Pagination } from './ui/Pagination';
import { RefreshButton } from './ui/RefreshButton';

const safeFormat = (dateStr: string | null | undefined, fmt: string) => {
  if (!dateStr) return '—';
  try {
    const d = parseISO(dateStr);
    if (!isValid(d)) return '—';
    return format(d, fmt, { locale: ptBR });
  } catch { return '—'; }
};

const getStatusVariant = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'novo': return 'destructive';
    case 'em progresso': return 'warning';
    case 'concluido': return 'success';
    case 'pendente': return 'secondary';
    default: return 'outline';
  }
};

const getSeverityVariant = (severity: string) => {
  switch (severity?.toLowerCase()) {
    case 'crítico': return 'destructive';
    case 'alto': return 'destructive';
    case 'médio': return 'warning';
    case 'baixo': return 'outline';
    default: return 'outline';
  }
};

export default function Incidents({ onSelectIncident }: { onSelectIncident: (id: string) => void }) {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  
  const [currentUser] = useState<any>(() => {
    try {
      const u = (sessionStorage.getItem('user') || localStorage.getItem('user'));
      return u && u !== 'undefined' ? JSON.parse(u) : {};
    } catch { return {}; }
  });
  const [incidentCategories, setIncidentCategories] = useState<string[]>(CATEGORIES);

  const [formData, setFormData] = useState({
    property_id: '',
    asset_id: 'none',
    categoria: CATEGORIES[0],
    descricao: '',
    severidade: 'Médio',
    responsavel_id: 'none'
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = (sessionStorage.getItem('token') || localStorage.getItem('token'));
      const h = { Authorization: `Bearer ${token}` };
      const [incRes, propRes, assetRes, userRes, settingsRes, companyRes] = await Promise.all([
        fetch('/api/incidents', { headers: h }),
        fetch('/api/properties', { headers: h }),
        fetch('/api/assets', { headers: h }),
        fetch('/api/users', { headers: h }),
        fetch('/api/settings', { headers: h }),
        fetch('/api/company-info', { headers: h })
      ]);

      const incData = incRes.ok ? await incRes.json() : [];
      const propData = propRes.ok ? await propRes.json() : [];
      const assetData = assetRes.ok ? await assetRes.json() : [];
      const userData = userRes.ok ? await userRes.json() : [];
      const settingsData = settingsRes.ok ? await settingsRes.json() : [];
      const companyData = companyRes.ok ? await companyRes.json() : null;

      setIncidents(Array.isArray(incData) ? incData : []);
      setProperties(Array.isArray(propData) ? propData : []);
      setAssets(Array.isArray(assetData) ? assetData : []);
      setUsers(Array.isArray(userData) ? userData : []);
      setCompanyInfo(companyData);

      const incidentSetting = Array.isArray(settingsData) ? settingsData.find((s: any) => s.setting_key === 'incident_categories') : null;
      if (incidentSetting && Array.isArray(incidentSetting.setting_value) && incidentSetting.setting_value.length > 0) {
        setIncidentCategories(incidentSetting.setting_value);
        setFormData(prev => ({ ...prev, categoria: incidentSetting.setting_value[0] }));
      }
    } catch (err) {
      console.error(err);
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    socket.on("incident-update", () => { fetchData(); });
    return () => { socket.off("incident-update"); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.property_id || formData.property_id === 'none') return;
    setSubmitting(true);
    try {
      const submitData = {
        ...formData,
        asset_id: formData.asset_id === 'none' ? null : formData.asset_id,
        responsavel_id: formData.responsavel_id === 'none' ? null : formData.responsavel_id
      };
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(sessionStorage.getItem('token') || localStorage.getItem('token'))}`
        },
        body: JSON.stringify(submitData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
        setFormData({ property_id: '', asset_id: 'none', categoria: incidentCategories[0] || CATEGORIES[0], descricao: '', severidade: 'Médio', responsavel_id: 'none' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = incidents.filter(i => {
    const matchesSearch = !search || 
      i.descricao?.toLowerCase().includes(search.toLowerCase()) || 
      i.id?.toString().includes(search) ||
      i.property_name?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || i.estado?.toLowerCase() === filterStatus.toLowerCase();
    const matchesSeverity = filterSeverity === 'all' || i.severidade?.toLowerCase() === filterSeverity.toLowerCase();
    
    return matchesSearch && matchesStatus && matchesSeverity;
  });

  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExport = () => {
    const csvHeaders = ['Protocolo', 'Data Abertura', 'Status', 'Severidade', 'Categoria', 'Unidade', 'Equipamento', 'Criado Por', 'Responsavel', 'Valor Mao de Obra', 'Descricao'];
    
    // Add Company Info as header lines
    const companyHeader = companyInfo ? [
      [companyInfo.nome || 'Nexo SGFM'],
      [companyInfo.endereco || ''],
      [companyInfo.telefone || ''],
      ['Relatório de Incidentes'],
      [`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`],
      ['']
    ].map(row => row.join(',')).join('\n') : '';

    const csvRows = filtered.map(i => [
      `#${i.id}`,
      safeFormat(i.created_at, 'yyyy-MM-dd HH:mm'),
      i.estado,
      i.severidade,
      i.categoria,
      i.property_name || 'N/A',
      i.asset_name || 'Geral',
      i.criado_por_nome || 'N/A',
      i.responsavel_nome || 'Livre',
      i.custo_estimado ? `${i.custo_estimado} MT` : '0 MT',
      `"${(i.descricao || '').replace(/"/g, '""')}"`
    ].join(','));
    
    const csvContent = companyHeader + csvHeaders.join(',') + '\n' + csvRows.join('\n');
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `incidentes_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    link.click();
  };


  return (
    <div className="space-y-6">
      {/* Search and Filters Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-border/50 pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 w-3.5 h-3.5 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Pesquisar protocolo ou local..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 w-64 h-9 text-xs bg-muted/10 border-border/50 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all shadow-none"
            />
          </div>
          
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36 h-9 text-xs bg-muted/10 border-border/50 shadow-none">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="Novo">Novo</SelectItem>
              <SelectItem value="Em Progresso">Em Progresso</SelectItem>
              <SelectItem value="Pendente">Pendente</SelectItem>
              <SelectItem value="Concluido">Concluido</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="w-36 h-9 text-xs bg-muted/10 border-border/50 shadow-none">
              <SelectValue placeholder="Severidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Severidade</SelectItem>
              <SelectItem value="Crítico">Crítico</SelectItem>
              <SelectItem value="Alto">Alto</SelectItem>
              <SelectItem value="Médio">Médio</SelectItem>
              <SelectItem value="Baixo">Baixo</SelectItem>
            </SelectContent>
          </Select>

          {(search || filterStatus !== 'all' || filterSeverity !== 'all') && (
            <Button variant="ghost" size="sm" className="h-9 px-2 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 gap-2" onClick={() => { setSearch(''); setFilterStatus('all'); setFilterSeverity('all'); }}>
               <XIcon size={14} />
               <span className="text-[10px] font-bold uppercase tracking-tight">Limpar</span>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <RefreshButton onClick={fetchData} loading={loading} />
          <Button variant="outline" size="sm" className="h-9 gap-2 text-xs font-semibold bg-muted/5 border-border/50 hover:bg-muted/20" onClick={handleExport}>
            <Download size={14} className="text-muted-foreground" />
            Exportar dados
          </Button>
          {canReportIncidents(currentUser.perfil) && (
            <Button size="sm" className="h-9 gap-2 text-xs font-bold shadow-lg shadow-primary/10 bg-primary/90 hover:bg-primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={16} />
              Criar Ocorrência
            </Button>
          )}
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Registos', value: incidents.length, icon: Activity, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
          { label: 'Em Aberto', value: incidents.filter(i => i.estado === 'Aberto' || i.estado === 'Novo').length, icon: AlertCircle, color: 'text-rose-500', bgColor: 'bg-rose-500/10' },
          { label: 'Em Resolução', value: incidents.filter(i => i.estado === 'Em Progresso' || i.estado === 'Atribuído').length, icon: Clock, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
          { label: 'Concluídos', value: incidents.filter(i => i.estado === 'Concluido' || i.estado === 'Resolvido').length, icon: CheckCircle2, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
        ].map((s, i) => (
          <Card key={i} className="shadow-sm border-border bg-card/50 backdrop-blur-sm card-shine group hover:border-primary/20 transition-all duration-300">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">{s.label}</p>
                <p className={`text-xl font-bold mt-1 tracking-tighter`}>{s.value}</p>
              </div>
              <div className={`p-2 rounded-lg ${s.bgColor} ${s.color} transition-transform group-hover:scale-110 duration-300`}>
                 <s.icon size={16} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Table */}
      <Card className="shadow-sm border-border bg-card/50 backdrop-blur-sm card-shine overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/20">
            <TableRow className="hover:bg-transparent border-border/50 border-b">
              <TableHead className="w-24 text-[10px] uppercase font-bold h-10 tracking-widest px-4">Protocolo</TableHead>
              <TableHead className="text-[10px] uppercase font-bold h-10 tracking-widest">Abertura</TableHead>
              <TableHead className="text-[10px] uppercase font-bold h-10 tracking-widest">Estado</TableHead>
              <TableHead className="text-[10px] uppercase font-bold h-10 tracking-widest">Severidade</TableHead>
              <TableHead className="text-[10px] uppercase font-bold h-10 tracking-widest">Descrição & Unidade</TableHead>
              <TableHead className="text-[10px] uppercase font-bold h-10 tracking-widest">Responsável</TableHead>
              <TableHead className="w-12 text-right h-10 pr-4"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && incidents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-64 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-xs">Sincronizando incidentes...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length > 0 ? (
              filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((incident) => (
                <TableRow 
                  key={incident.id} 
                  className="cursor-pointer group h-14"
                  onClick={() => onSelectIncident(incident.id)}
                >
                  <TableCell className="font-mono text-[10px] text-muted-foreground/80">
                    <span className="bg-muted px-2 py-0.5 rounded-sm">
                      #{incident.id?.toString().slice(-6).toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell className="text-[10px] font-semibold text-muted-foreground/60 whitespace-nowrap">
                    {safeFormat(incident.created_at, 'dd MMM, HH:mm')}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={`text-[9px] h-4 uppercase font-bold border-none ${
                         incident.estado === 'Aberto' || incident.estado === 'Novo' ? 'bg-rose-500/15 text-rose-500' :
                         incident.estado === 'Em Progresso' || incident.estado === 'Atribuído' ? 'bg-blue-500/15 text-blue-500' :
                         incident.estado === 'Concluido' || incident.estado === 'Resolvido' ? 'bg-emerald-500/15 text-emerald-500' :
                         'bg-zinc-500/15 text-zinc-500'
                      }`}
                    >
                      {incident.estado}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={`text-[9px] h-4 uppercase font-bold border-none ${
                         incident.severidade === 'Crítico' || incident.severidade === 'Alto' ? 'bg-rose-500/10 text-rose-500' :
                         incident.severidade === 'Médio' ? 'bg-amber-500/10 text-amber-500' :
                         'bg-emerald-500/10 text-emerald-500'
                      }`}
                    >
                      {incident.severidade}
                    </Badge>
                  </TableCell>
                  <TableCell className="min-w-[250px]">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold truncate group-hover:text-primary transition-colors tracking-tight">
                        {incident.descricao}
                      </span>
                      <span className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                        <div className="h-1 w-1 rounded-full bg-border" /> {incident.property_name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-zinc-800 border border-border/50 flex items-center justify-center overflow-hidden shrink-0">
                        {incident.responsavel_nome ? <UserIcon size={10} className="text-zinc-400" /> : <Clock size={10} className="text-zinc-600" />}
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground/70 truncate max-w-[120px] uppercase tracking-tight">
                        {incident.responsavel_nome || 'Aguardando'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                     <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/30 group-hover:text-foreground">
                          <MoreVertical size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 text-xs">
                        <DropdownMenuLabel>Ações Rápidas</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onSelectIncident(incident.id)}>
                          <ArrowUpRight size={14} className="mr-2" /> Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <UserIcon size={14} className="mr-2" /> Atribuir Técnico
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 size={14} className="mr-2" /> Eliminar Registo
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <Activity size={32} className="opacity-10" />
                    <p className="text-xs font-medium uppercase tracking-widest">Nenhum incidente encontrado</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Pagination
        currentPage={currentPage}
        totalItems={filtered.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />

      {/* New Incident Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-3">
               <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <AlertCircle size={20} />
               </div>
               <div>
                  <DialogTitle className="text-lg font-bold tracking-tight">Reportar Ocorrência</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground/60">Registar uma nova falha técnica ou pedido de assistência.</DialogDescription>
               </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2.5">
                <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/50 ml-1">Localização</Label>
                <Select 
                  value={formData.property_id} 
                  onValueChange={(val) => setFormData({ ...formData, property_id: val })}
                  required
                >
                  <SelectTrigger className="h-10 bg-muted/10 border-border/50 transition-all focus:ring-1 focus:ring-primary/20">
                    <SelectValue placeholder="Selecione a unidade..." />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.endereco}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2.5">
                <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/50 ml-1">Ativo Relacionado</Label>
                <Select 
                  value={formData.asset_id} 
                  onValueChange={(val) => setFormData({ ...formData, asset_id: val })}
                >
                  <SelectTrigger className="h-10 bg-muted/10 border-border/50 transition-all focus:ring-1 focus:ring-primary/20">
                    <SelectValue placeholder="Vincular equipamento..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Geral (Sem Ativo)</SelectItem>
                    {assets.filter(a => String(a.property_id) === String(formData.property_id)).map(a => (
                      <SelectItem key={a.id} value={a.id.toString()}>{a.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2.5">
                <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/50 ml-1">Categoria</Label>
                <Select 
                  value={formData.categoria} 
                  onValueChange={(val) => setFormData({ ...formData, categoria: val })}
                >
                  <SelectTrigger className="h-10 bg-muted/10 border-border/50 transition-all focus:ring-1 focus:ring-primary/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {incidentCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2.5">
                <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/50 ml-1">Severidade</Label>
                <Select 
                  value={formData.severidade} 
                  onValueChange={(val) => setFormData({ ...formData, severidade: val })}
                >
                  <SelectTrigger className="h-10 bg-muted/10 border-border/50 transition-all focus:ring-1 focus:ring-primary/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Crítico">Crítico</SelectItem>
                    <SelectItem value="Alto">Alto</SelectItem>
                    <SelectItem value="Médio">Médio</SelectItem>
                    <SelectItem value="Baixo">Baixo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2.5">
              <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/50 ml-1">Descrição</Label>
              <Textarea 
                placeholder="Descreva o problema de forma clara e objetiva para o técnico..." 
                className="min-h-[100px] bg-muted/10 border-border/50 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all resize-none" 
                required
                value={formData.descricao}
                onChange={e => setFormData({ ...formData, descricao: e.target.value })}
              />
            </div>

            <DialogFooter className="gap-3 pt-4 border-t border-border/30">
              <Button type="button" variant="ghost" className="flex-1 text-xs font-semibold h-10" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={submitting} className="flex-1 font-bold h-10 shadow-lg shadow-primary/20">
                {submitting ? 'A registar...' : 'Enviar Reporte'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
