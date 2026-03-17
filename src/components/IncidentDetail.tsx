import React, { useEffect, useState } from 'react';
import { ensureArray } from '../utils/safeArray';
import {
  ArrowLeft, Clock, User, MessageSquare, Send, CheckCircle2,
  AlertCircle, FileText, Download, Activity, Zap, ShieldCheck,
  Users, Building2, Cpu, ListChecks, Package, Plus, Trash2,
  Timer, Camera, Image as ImageIcon, Upload, MoreVertical
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import socket from '../services/socketService';
import { jsPDF } from 'jspdf';
import { canUpdateIncidents, canAssignIncidents } from '../utils/permissions';
import { api } from '../services/api';

// --- shadcn UI imports ---
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { Label } from './ui/label';
import { MagicBadge } from './ui/magic';

const safeFormat = (dateStr: string | null | undefined, formatStr: string, options?: any) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return format(d, formatStr, options);
  } catch (e) {
    return '—';
  }
};

export default function IncidentDetail({ id, onBack }: { id: string, onBack: () => void }) {
  const [incident, setIncident] = useState<any>(null);
  const [actionDesc, setActionDesc] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [assignedTech, setAssignedTech] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [techUsers, setTechUsers] = useState<any[]>([]);
  const [checklists, setChecklists] = useState<any[]>([]);
  const [partsUsed, setPartsUsed] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQuantity, setPartQuantity] = useState(1);
  const [laborLogs, setLaborLogs] = useState<any[]>([]);
  const [activeTimer, setActiveTimer] = useState<any>(null);
  const [media, setMedia] = useState<any[]>([]);
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [loadingPart, setLoadingPart] = useState(false);
  const [loadingTimer, setLoadingTimer] = useState(false);
  const [estCost, setEstCost] = useState(0);
  const [user] = useState<any>(() => {
    try {
      const u = localStorage.getItem('user');
      return u && u !== 'undefined' ? JSON.parse(u) : {};
    } catch { return {}; }
  });

  useEffect(() => {
    fetchIncident();
    fetchChecklists();
    fetchPartsUsed();
    fetchInventory();
    fetchLabor();
    fetchTechUsers();

    socket.emit("join-room", {
      roomId: `incident-${id}`,
      user: (() => {
        try {
          const u = localStorage.getItem('user');
          return u && u !== 'undefined' ? JSON.parse(u) : {};
        } catch { return {}; }
      })()
    });

    socket.on("presence-update", (users) => {
      setActiveUsers(users);
    });

    socket.on("incident-update", ({ incidentId }) => {
      if (incidentId === id) {
        fetchIncident();
        fetchChecklists();
        fetchPartsUsed();
        fetchLabor();
        fetchMedia(); 
      }
    });

    return () => {
      socket.off("presence-update");
      socket.off("incident-update");
    };
  }, [id]);

  const fetchIncident = async () => {
    try {
      const data = await api.get(`/api/incidents/${id}`);
      setIncident(data);
      if (data?.estado) setNewStatus(data.estado);
      if (data?.responsavel_id) setAssignedTech(data.responsavel_id);
      if (data?.custo_estimado) setEstCost(data.custo_estimado);
      fetchMedia(data); 
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTechUsers = async () => {
    try {
      const data = await api.get('/api/users');
      setTechUsers(Array.isArray(data) ? data.filter((u: any) => u.perfil === 'Técnico' || u.perfil === 'Gestor' || u.perfil === 'Administrador') : []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchChecklists = async () => {
    try {
      const data = await api.get(`/api/incidents/${id}/checklists`);
      setChecklists(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setChecklists([]);
    }
  };

  const fetchPartsUsed = async () => {
    try {
      const data = await api.get(`/api/incidents/${id}/parts`);
      setPartsUsed(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setPartsUsed([]);
    }
  };

  const fetchInventory = async () => {
    try {
      const data = await api.get('/api/inventory');
      setInventory(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setInventory([]);
    }
  };

  const fetchLabor = async () => {
    try {
      const data = await api.get(`/api/incidents/${id}/labor`);
      const logs = Array.isArray(data) ? data : [];
      setLaborLogs(logs);
      const running = logs.find((l: any) => !l.end_time);
      if (running) setActiveTimer(running);
    } catch (e) {
      console.error(e);
      setLaborLogs([]);
    }
  };

  const handleStartTimer = async () => {
    setLoadingTimer(true);
    try {
      const data = await api.post(`/api/incidents/${id}/timer/start`);
      setActiveTimer(data);
      fetchLabor();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTimer(false);
    }
  };

  const handleStopTimer = async () => {
    if (!activeTimer) return;
    setLoadingTimer(true);
    try {
      await api.post(`/api/incidents/${id}/timer/stop`, { laborId: activeTimer.id });
      setActiveTimer(null);
      fetchLabor();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTimer(false);
    }
  };

  const calculateDuration = (start: string, end?: string) => {
    const s = new Date(start);
    const e = end ? new Date(end) : new Date();
    const diff = Math.floor((e.getTime() - s.getTime()) / 60000); // minutes
    if (diff < 60) return `${diff} min`;
    return `${Math.floor(diff / 60)}h ${diff % 60}m`;
  };

  const fetchMedia = async (incData: any = incident) => {
    try {
      const data = await api.get(`/api/incidents/${id}/media`);
      const mediaList = Array.isArray(data) ? data : [];
      
      if (incData?.imagem_url) {
        mediaList.unshift({
          id: 'main-img',
          image_url: incData.imagem_url,
          type: 'Abertura Pelo Cliente'
        });
      }
      setMedia(mediaList);
    } catch (e) {
      console.error(e);
      setMedia(incData?.imagem_url ? [{ id: 'main-img', image_url: incData.imagem_url, type: 'Abertura Pelo Cliente' }] : []);
    }
  };

  const handleUploadMedia = async (type: 'antes' | 'depois') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          await api.post(`/api/incidents/${id}/media`, { image_url: base64, type });
          fetchMedia();
        } catch (err) {
          console.error(err);
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const margin = 20;
    let y = 20;

    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129); // Emerald-500
    doc.text('Relatório de Intervenção - Nexo SGFM', margin, y);
    y += 15;

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, margin, y);
    y += 10;

    doc.setDrawColor(200);
    doc.line(margin, y, 190, y);
    y += 10;

    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(`Incidente: ${incident.descricao}`, margin, y);
    y += 10;
    doc.setFontSize(10);
    doc.text(`ID: ${incident.id} | Categoria: ${incident.categoria} | Severidade: ${incident.severidade}`, margin, y);
    y += 15;

    doc.setFontSize(12);
    doc.text('Checklist de Tarefas:', margin, y);
    y += 7;
    doc.setFontSize(10);
    checklists.forEach((c: any) => {
      doc.text(`[${c.is_completed ? 'X' : ' '}] ${c.task_description}`, margin + 5, y);
      y += 6;
    });
    y += 10;

    doc.setFontSize(12);
    doc.text('Consumo de Materiais:', margin, y);
    y += 7;
    doc.setFontSize(10);
    let totalMat = 0;
    partsUsed.forEach((p: any) => {
      const cost = (p.inventory?.unit_cost || 0) * p.quantity_used;
      totalMat += cost;
      doc.text(`- ${p.inventory?.name}: ${p.quantity_used} un x ${p.inventory?.unit_cost} MT = ${cost} MT`, margin + 5, y);
      y += 6;
    });
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Materiais: ${totalMat} MT`, margin, y + 5);
    doc.setFont('helvetica', 'normal');
    y += 20;

    doc.setFontSize(12);
    doc.text('Registo de Labor (Mão-de-Obra):', margin, y);
    y += 7;
    doc.setFontSize(10);
    laborLogs.forEach((l: any) => {
      doc.text(`- Técnico #${l.user_id?.slice(-4)}: ${calculateDuration(l.start_time, l.end_time)}`, margin + 5, y);
      y += 6;
    });

    doc.save(`Relatorio_Incidente_${incident.id.slice(0, 8)}.pdf`);
  };

  const handleAddChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistItem.trim()) return;
    setLoadingChecklist(true);
    try {
      await api.post(`/api/incidents/${id}/checklists`, { task_description: newChecklistItem });
      setNewChecklistItem('');
      fetchChecklists();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingChecklist(false);
    }
  };

  const toggleChecklist = async (checklistId: string, currentStatus: boolean) => {
    try {
      await api.patch(`/api/incidents/${id}/checklists/${checklistId}`, { is_completed: !currentStatus });
      fetchChecklists();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteChecklist = async (checklistId: string) => {
    if (!window.confirm('Eliminar esta tarefa? A ação será registada no log de auditoria.')) return;
    setLoadingChecklist(true);
    try {
      await api.delete(`/api/incidents/${id}/checklists/${checklistId}`);
      fetchChecklists();
      fetchIncident();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingChecklist(false);
    }
  };

  const handleAddPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartId) return;
    setLoadingPart(true);
    try {
      await api.post(`/api/incidents/${id}/parts`, { part_id: selectedPartId, quantity_used: partQuantity });
      setSelectedPartId('');
      setPartQuantity(1);
      fetchPartsUsed();
      fetchIncident();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPart(false);
    }
  };

  const handleDeletePart = async (partId: string) => {
    if (!window.confirm('Eliminar este material? O stock será restaurado e a ação registada no log.')) return;
    setLoadingPart(true);
    try {
      await api.delete(`/api/incidents/${id}/parts/${partId}`);
      fetchPartsUsed();
      fetchIncident();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPart(false);
    }
  };

  const handleAddAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAction(true);
    try {
      await api.post(`/api/incidents/${id}/actions`, { 
        descricao_acao: actionDesc, 
        novo_estado: newStatus, 
        responsavel_id: assignedTech 
      });
      setActionDesc('');
      fetchIncident();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleUpdateEstCost = async (val: number) => {
    setEstCost(val);
    try {
      await api.post(`/api/incidents/${id}/actions`, { 
        descricao_acao: `[Custo Estimado Atualizado] Novo valor: ${val.toLocaleString('pt-MZ')} MT` 
      });
    } catch (err) {
      console.error(err);
    }
  };

  if (!incident) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-8 h-8 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin"></div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">A carregar detalhes do protocolo...</p>
    </div>
  );

  return (
    <div className="space-y-6 pb-8">
      {/* Header - Compact & Semantic */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={onBack}
            className="h-8 w-8 rounded-md"
          >
            <ArrowLeft size={14} />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold tracking-tight leading-none mb-1">
              Protocolo #{incident.id ? String(incident.id).slice(0, 8).toUpperCase() : '---'}
            </h1>
            <p className="text-xs text-muted-foreground font-medium">
              {incident.categoria} &bull; {safeFormat(incident.created_at, 'dd MMM yyyy')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-muted/50 border border-border rounded-md">
            <Users size={12} className="text-muted-foreground" />
            <div className="flex -space-x-1">
              {ensureArray<any>(activeUsers).map((u, i) => (
                <div key={i} className="w-4 h-4 rounded-full border border-background bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[7px] font-bold text-foreground" title={u.user.nome}>
                  {u.user?.nome?.charAt(0) || '?'}
                </div>
              ))}
            </div>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider ml-1">Live</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportPDF} className="h-8 shadow-none">
            <FileText size={14} className="mr-2" /> PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Details & Actions */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-none border-border">
            <CardHeader className="pb-4 border-b border-border flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-base">Detalhes da Intervenção</CardTitle>
                <CardDescription className="text-xs">Contexto e identificação do ativo</CardDescription>
              </div>
              <Badge variant={
                incident.severidade === 'Crítico' ? 'destructive' :
                incident.severidade === 'Alto' ? 'warning' : 'outline'
              } className="text-[10px] uppercase font-bold px-2.5">
                {incident.severidade}
              </Badge>
            </CardHeader>
            
            <CardContent className="p-6 space-y-8">
              {/* Top Meta Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-sm">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Informação de Origem</p>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-muted-foreground border border-border">
                      <User size={16} />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground leading-none">{incident.criado_por_nome || 'Cliente / Sistema'}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Reportado por</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Atribuição Técnica</p>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-muted-foreground border border-border">
                      <ShieldCheck size={16} />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground leading-none">{incident.responsavel_nome || 'Não atribuído'}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Responsável</p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="bg-border/50" />

              {/* Location and Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Localização Operacional</p>
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <Building2 size={16} className="text-muted-foreground shrink-0" />
                    <span className="truncate">{incident.property_name || 'N/A'}</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Estado de Resolução</p>
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <div className={`w-2 h-2 rounded-full ${incident.estado === 'Resolvido' ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-orange-500'}`}></div>
                    <span className="truncate uppercase text-xs tracking-wide">{incident.estado}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Descrição Técnica do Incidente</p>
                <div className="text-sm leading-relaxed text-foreground bg-muted/30 p-4 rounded-md border border-border/50 whitespace-pre-wrap">
                  {incident.descricao}
                </div>
              </div>

              {/* SLA Tracking - Stark Minimalist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-md border border-border bg-muted/20 flex flex-col gap-1">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">SLA Resposta Limite</p>
                  <p className="text-sm font-semibold">{safeFormat(incident.sla_resposta_limite, 'dd/MM/yyyy HH:mm')}</p>
                </div>
                <div className="p-4 rounded-md border border-border bg-muted/20 flex flex-col gap-1">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">SLA Resolução Limite</p>
                  <p className="text-sm font-semibold">{safeFormat(incident.sla_resolucao_limite, 'dd/MM/yyyy HH:mm')}</p>
                </div>
              </div>

              {/* Financial Summary - Flat NY Style */}
              <div className="p-5 bg-background rounded-md border border-border">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Package size={14} /> Resumo Financeiro Projetado
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <p className="text-[9px] text-muted-foreground uppercase font-bold">Materiais</p>
                    <p className="text-base font-semibold">
                      {partsUsed.reduce((acc, p) => acc + (p.quantity_used * (p.inventory?.unit_cost || 0)), 0).toLocaleString('pt-MZ')} <span className="text-[10px] text-muted-foreground">MT</span>
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] text-muted-foreground uppercase font-bold">Mão-de-Obra</p>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="number" 
                        min="0"
                        value={estCost} 
                        onChange={(e) => setEstCost(parseFloat(e.target.value) || 0)}
                        onBlur={(e) => handleUpdateEstCost(parseFloat(e.target.value) || 0)}
                        className="w-24 h-7 px-2 py-0 text-xs bg-background border-border"
                      />
                      <span className="text-[10px] text-muted-foreground font-semibold">MT</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] text-foreground uppercase font-bold">Total Final</p>
                    <p className="text-xl font-bold text-foreground">
                      {(partsUsed.reduce((acc, p) => acc + (p.quantity_used * (p.inventory?.unit_cost || 0)), 0) + estCost).toLocaleString('pt-MZ')} <span className="text-xs">MT</span>
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Operational Log - Segmented List Style */}
          <Card className="shadow-none border-border">
            <CardHeader className="border-b border-border p-5">
              <div className="space-y-1">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity size={16} className="text-muted-foreground" />
                  Registo de Intervenções
                </CardTitle>
                <CardDescription className="text-xs">Cronologia de ações e comentários técnicos</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {canUpdateIncidents(user.perfil) && (
                <div className="p-5 border-b border-border bg-muted/10">
                  <form onSubmit={handleAddAction} className="space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <Textarea
                          value={actionDesc}
                          onChange={(e) => setActionDesc(e.target.value)}
                          placeholder="Nova observação técnica..."
                          className="min-h-[100px] resize-none border-border bg-background"
                          required
                        />
                      </div>
                      <div className="w-full md:w-56 flex flex-col gap-3">
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase text-muted-foreground font-bold">Estado</Label>
                          <Select value={newStatus} onValueChange={setNewStatus}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Aberto">Aberto</SelectItem>
                              <SelectItem value="Atribuído">Atribuído</SelectItem>
                              <SelectItem value="Em progresso">Em progresso</SelectItem>
                              <SelectItem value="Resolvido">Resolvido</SelectItem>
                              <SelectItem value="Fechado">Fechado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {canAssignIncidents(user.perfil) && (
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-muted-foreground font-bold">Responsável</Label>
                            <Select value={assignedTech} onValueChange={setAssignedTech}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Atribuir..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Nenhum</SelectItem>
                                {techUsers.map(t => (
                                  <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        
                        <Button
                          type="submit"
                          disabled={submittingAction}
                          size="sm"
                          className="w-full mt-auto"
                        >
                          {submittingAction ? '...' : (
                            <>Registar Ação <Send size={14} className="ml-2" /></>
                          )}
                        </Button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              <ScrollArea className="max-h-[500px] p-6">
                <div className="space-y-6 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-border">
                  {incident.actions && incident.actions.length > 0 ? (
                    incident.actions.map((action: any) => (
                      <div key={action.id} className="flex gap-4 relative">
                        <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center text-[10px] font-bold text-foreground z-10 shrink-0">
                          {action.user_nome?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1 pb-6">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-semibold text-foreground">{action.user_nome}</span>
                            <span className="text-[10px] font-medium text-muted-foreground/60">
                              {safeFormat(action.data_hora, 'dd MMM, HH:mm')}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                            {action.descricao_acao}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-muted-foreground opacity-50">
                      <MessageSquare size={32} className="mx-auto mb-3" />
                      <p className="text-xs font-medium uppercase tracking-widest">Sem registos</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: AI Insights & Operations */}
        <div className="space-y-6 text-sm">
          
          {/* Labor Tracking Section - Stark Modern */}
          <Card className="shadow-none border-border">
            <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-bold flex items-center gap-2">
                <Timer size={14} className="text-muted-foreground" />
                Registo de Tempo
              </CardTitle>
              {!activeTimer ? (
                <Button
                  size="sm"
                  onClick={handleStartTimer}
                  disabled={loadingTimer}
                  variant="outline"
                  className="h-7 text-[10px] font-bold px-2.5"
                >
                  {loadingTimer ? '...' : 'INICIAR'}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleStopTimer}
                  disabled={loadingTimer}
                  className="h-7 text-[10px] font-bold px-2.5"
                >
                  {calculateDuration(activeTimer.start_time)} • PARAR
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[250px] p-4">
                <div className="space-y-2">
                  {laborLogs.filter((l:any) => l.end_time).map((log: any) => (
                    <div key={log.id} className="flex items-center justify-between text-xs p-2.5 bg-muted/10 rounded border border-border/50">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded bg-zinc-100 dark:bg-zinc-800 border border-border flex items-center justify-center text-[9px] font-bold font-mono">
                          {(log.user_nome || 'T')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold leading-none mb-0.5">{log.user_nome || 'Técnico'}</p>
                          <p className="text-[8px] text-muted-foreground uppercase opacity-70">
                            {safeFormat(log.start_time, 'HH:mm')} &rarr; {safeFormat(log.end_time, 'HH:mm')}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-[10px] font-bold text-muted-foreground">
                        {calculateDuration(log.start_time, log.end_time)}
                      </span>
                    </div>
                  ))}
                  {laborLogs.filter((l:any) => l.end_time).length === 0 && (
                    <p className="text-[10px] text-muted-foreground text-center py-4 uppercase tracking-widest opacity-40">Sem registos finalizados</p>
                  )}
                </div>
              </ScrollArea>
              {laborLogs.filter((l:any) => l.end_time).length > 0 && (() => {
                const totalMin = laborLogs.filter((l:any) => l.end_time).reduce((acc: number, l: any) => {
                  const diff = Math.floor((new Date(l.end_time).getTime() - new Date(l.start_time).getTime()) / 60000);
                  return acc + diff;
                }, 0);
                return (
                  <div className="p-3 bg-muted/30 border-t border-border flex justify-between items-center">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Acumulado</span>
                    <span className="text-sm font-bold text-foreground">
                      {Math.floor(totalMin / 60)}h {Math.floor(totalMin % 60)}m
                    </span>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Checklist Section - Minimalist */}
          <Card className="shadow-none border-border">
            <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-bold flex items-center gap-2">
                <ListChecks size={14} className="text-muted-foreground" />
                Checklist
              </CardTitle>
              <span className="text-[10px] font-bold text-muted-foreground px-1.5 py-0.5 border border-border rounded bg-muted">
                {checklists.filter(c => c.is_completed).length}/{checklists.length}
              </span>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <form onSubmit={handleAddChecklist} className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Nova tarefa..."
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  disabled={loadingChecklist}
                  className="flex-1 h-8 text-xs bg-muted/10 border-border"
                  required
                />
                <Button 
                  type="submit" 
                  size="icon"
                  disabled={loadingChecklist}
                  variant="outline"
                  className="h-8 w-8"
                >
                  {loadingChecklist ? <Activity size={12} className="animate-spin" /> : <Plus size={14} />}
                </Button>
              </form>
              
              <div className="space-y-1.5">
                {checklists.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 p-2 hover:bg-muted/30 rounded transition-colors group">
                    <button
                      onClick={() => toggleChecklist(c.id, c.is_completed)}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${
                        c.is_completed ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-background' : 'border-border'
                      }`}
                    >
                      {c.is_completed && <CheckCircle2 size={10} className="stroke-[4]" />}
                    </button>
                    <span className={`text-xs flex-1 truncate transition-all ${c.is_completed ? 'text-muted-foreground line-through opacity-50' : 'text-foreground'}`}>
                      {c.task_description}
                    </span>
                    {(c.user_id === user.id || ['Administrador', 'Gestor'].includes(user.perfil)) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteChecklist(c.id)}
                        disabled={loadingChecklist}
                        className="w-6 h-6 text-muted-foreground/30 hover:text-destructive opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={12} />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Materials Consumption - Flat List */}
          <Card className="shadow-none border-border">
            <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-bold flex items-center gap-2">
                <Package size={14} className="text-muted-foreground" />
                Materiais
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <form onSubmit={handleAddPart} className="flex flex-col gap-2">
                <Select value={selectedPartId} onValueChange={val => setSelectedPartId(val)} required>
                  <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue placeholder="Peça..." />
                  </SelectTrigger>
                  <SelectContent>
                    {inventory.map(p => (
                      <SelectItem key={p.id} value={p.id} disabled={p.quantidade <= 0}>
                        {p.nome} ({p.quantidade})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Input
                    type="number" min="1" placeholder="Qtd"
                    value={partQuantity}
                    onChange={(e) => setPartQuantity(parseInt(e.target.value) || 1)}
                    className="h-8 text-xs text-center border-border"
                    required
                  />
                  <Button type="submit" size="sm" disabled={loadingPart} className="flex-1 h-8 text-[10px] font-bold">
                    REQUISITAR
                  </Button>
                </div>
              </form>
              
              <div className="divide-y divide-border/50 border-t border-border mt-4">
                {partsUsed.map((p) => (
                  <div key={p.id} className="py-3 flex justify-between items-start group">
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-semibold truncate text-foreground">{p.inventory?.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {p.quantity_used} x {p.inventory?.unit_cost?.toLocaleString('pt-MZ')} MT
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs font-mono font-bold">
                        {(p.quantity_used * (p.inventory?.unit_cost || 0)).toLocaleString('pt-MZ')} <span className="text-[10px]">MT</span>
                      </span>
                      {(p.user_id === user.id || ['Administrador', 'Gestor'].includes(user.perfil)) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePart(p.id)}
                          disabled={loadingPart}
                          className="w-6 h-6 text-muted-foreground/30 hover:text-destructive opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={12} />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Multimedia Gallery - Clean Grid */}
          <Card className="shadow-none border-border">
            <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-bold flex items-center gap-2">
                <Camera size={14} className="text-muted-foreground" />
                Fotografias
              </CardTitle>
              <div className="flex gap-1">
                <Button size="icon" variant="outline" onClick={() => handleUploadMedia('antes')} className="h-7 w-7"><Upload size={12} /></Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-2">
                {media?.map((item: any) => (
                  <div key={item.id} className="relative aspect-square rounded border border-border overflow-hidden group">
                    <img src={item.image_url} alt="Evidência" className="w-full h-full object-cover" />
                    <div className="absolute top-1 left-1">
                      <Badge variant="outline" className="bg-background/90 text-[8px] px-1 py-0 border-border/50 uppercase">
                        {item.type}
                      </Badge>
                    </div>
                  </div>
                ))}
                {(!media || media.length === 0) && (
                  <div className="col-span-full py-8 flex flex-col items-center justify-center border border-dashed border-border rounded-md bg-muted/20 opacity-30">
                    <ImageIcon size={24} className="text-muted-foreground mb-2" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">Sem imagens</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
