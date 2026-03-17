import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, AlertCircle, Clock, CheckCircle2, 
  X as XIcon, Activity, ChevronDown, Trash2, Download, 
  Calendar as CalendarIcon, User as UserIcon, AlertTriangle, 
  MoreVertical, FileSpreadsheet, ArrowUpRight, ArrowDown
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
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  
  const [currentUser] = useState<any>(() => {
    try {
      const u = localStorage.getItem('user');
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
    try {
      const token = localStorage.getItem('token');
      const h = { Authorization: `Bearer ${token}` };
      const [incRes, propRes, assetRes, userRes, settingsRes] = await Promise.all([
        fetch('/api/incidents', { headers: h }),
        fetch('/api/properties', { headers: h }),
        fetch('/api/assets', { headers: h }),
        fetch('/api/users', { headers: h }),
        fetch('/api/settings', { headers: h })
      ]);

      const incData = incRes.ok ? await incRes.json() : [];
      const propData = propRes.ok ? await propRes.json() : [];
      const assetData = assetRes.ok ? await assetRes.json() : [];
      const userData = userRes.ok ? await userRes.json() : [];
      const settingsData = settingsRes.ok ? await settingsRes.json() : [];

      setIncidents(Array.isArray(incData) ? incData : []);
      setProperties(Array.isArray(propData) ? propData : []);
      setAssets(Array.isArray(assetData) ? assetData : []);
      setUsers(Array.isArray(userData) ? userData : []);

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
          Authorization: `Bearer ${localStorage.getItem('token')}`
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

  const handleExport = () => {
    const csvHeaders = ['Protocolo', 'Data', 'Status', 'Severidade', 'Categoria', 'Unidade', 'Responsavel'];
    const csvRows = filtered.map(i => [
      `#${i.id}`,
      safeFormat(i.created_at, 'yyyy-MM-dd'),
      i.estado,
      i.severidade,
      i.categoria,
      i.property_name,
      i.responsavel_nome || 'Livre'
    ].join(','));
    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `incidentes_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.click();
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">A carregar registos...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Search and Filters Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
            <Input
              placeholder="Pesquisar incidentes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 w-64 h-9 text-xs bg-muted/20 border-border"
            />
          </div>
          
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40 h-9 text-xs">
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
            <SelectTrigger className="w-40 h-9 text-xs">
              <SelectValue placeholder="Severidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Severidades</SelectItem>
              <SelectItem value="Crítico">Crítico</SelectItem>
              <SelectItem value="Alto">Alto</SelectItem>
              <SelectItem value="Médio">Médio</SelectItem>
              <SelectItem value="Baixo">Baixo</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => { setSearch(''); setFilterStatus('all'); setFilterSeverity('all'); }}>
             <XIcon size={14} className="text-muted-foreground" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-2 text-xs" onClick={handleExport}>
            <Download size={14} />
            Exportar CSV
          </Button>
          {canReportIncidents(currentUser.perfil) && (
            <Button size="sm" className="h-9 gap-2 text-xs font-bold" onClick={() => setIsModalOpen(true)}>
              <Plus size={16} />
              Reportar Incidente
            </Button>
          )}
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Registos', value: incidents.length, icon: Activity, color: 'text-foreground' },
          { label: 'Em Aberto', value: incidents.filter(i => i.estado === 'Novo' || i.estado === 'Novo').length, icon: AlertCircle, color: 'text-destructive' },
          { label: 'Em Resolução', value: incidents.filter(i => i.estado === 'Em Progresso').length, icon: Clock, color: 'text-warning' },
          { label: 'Concluídos', value: incidents.filter(i => i.estado === 'Concluido').length, icon: CheckCircle2, color: 'text-success' },
        ].map((s, i) => (
          <Card key={i} className="shadow-none border-border">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{s.label}</p>
                <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              </div>
              <s.icon size={20} className="text-muted-foreground/30" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Table */}
      <Card className="shadow-none border-border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-24 text-[10px] uppercase font-bold h-10">ID</TableHead>
              <TableHead className="text-[10px] uppercase font-bold h-10">Data</TableHead>
              <TableHead className="text-[10px] uppercase font-bold h-10">Status</TableHead>
              <TableHead className="text-[10px] uppercase font-bold h-10">Severidade</TableHead>
              <TableHead className="text-[10px] uppercase font-bold h-10">Descrição & Unidade</TableHead>
              <TableHead className="text-[10px] uppercase font-bold h-10">Responsável</TableHead>
              <TableHead className="w-12 text-right h-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((incident) => (
              <TableRow 
                key={incident.id} 
                className="cursor-pointer group h-14"
                onClick={() => onSelectIncident(incident.id)}
              >
                <TableCell className="font-mono text-[10px] text-muted-foreground">
                  #{incident.id?.toString().slice(-6).toUpperCase()}
                </TableCell>
                <TableCell className="text-xs whitespace-nowrap">
                  {safeFormat(incident.created_at, 'dd MMM, HH:mm')}
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(incident.estado) as any} className="text-[9px] h-4 uppercase font-bold">
                    {incident.estado}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getSeverityVariant(incident.severidade) as any} className="text-[9px] h-4 uppercase font-bold">
                    {incident.severidade}
                  </Badge>
                </TableCell>
                <TableCell className="min-w-[250px]">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold truncate group-hover:text-primary transition-colors">
                      {incident.descricao}
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1 mt-0.5">
                      <Activity size={10} /> {incident.property_name}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden shrink-0">
                      {incident.responsavel_nome ? <UserIcon size={10} className="text-muted-foreground" /> : <Clock size={10} className="text-muted-foreground/30" />}
                    </div>
                    <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                      {incident.responsavel_nome || 'Livre'}
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
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-64 text-center">
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

      {/* New Incident Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Reportar Incidente</DialogTitle>
            <DialogDescription>Registar uma nova ocorrência técnica no sistema de gestão.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Unidade / Propriedade</Label>
                <Select 
                  value={formData.property_id} 
                  onValueChange={(val) => setFormData({ ...formData, property_id: val })}
                  required
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Selecione a unidade..." />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.endereco}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Ativo (Opcional)</Label>
                <Select 
                  value={formData.asset_id} 
                  onValueChange={(val) => setFormData({ ...formData, asset_id: val })}
                >
                  <SelectTrigger className="h-10">
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
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Categoria</Label>
                <Select 
                  value={formData.categoria} 
                  onValueChange={(val) => setFormData({ ...formData, categoria: val })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {incidentCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Severidade</Label>
                <Select 
                  value={formData.severidade} 
                  onValueChange={(val) => setFormData({ ...formData, severidade: val })}
                >
                  <SelectTrigger className="h-10">
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

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Descrição do Problema</Label>
              <Textarea 
                placeholder="Descreva o incidente em detalhe..." 
                className="min-h-[100px]"
                required
                value={formData.descricao}
                onChange={e => setFormData({ ...formData, descricao: e.target.value })}
              />
            </div>

            <DialogFooter className="gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? 'A registar...' : 'Confirmar Reporte'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
