import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Clock,
  User,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  FileText,
  Download,
  Activity,
  Zap,
  ShieldCheck,
  Users,
  Building2,
  Cpu,
  ListChecks,
  Package,
  Plus,
  Trash2,
  Timer,
  Camera,
  Image as ImageIcon,
  Upload
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Markdown from 'react-markdown';
import socket from '../services/socketService';
import { jsPDF } from 'jspdf';
import { canUpdateIncidents } from '../utils/permissions';

export default function IncidentDetail({ id, onBack }: { id: string, onBack: () => void }) {
  const [incident, setIncident] = useState<any>(null);
  const [actionDesc, setActionDesc] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [checklists, setChecklists] = useState<any[]>([]);
  const [partsUsed, setPartsUsed] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQuantity, setPartQuantity] = useState(1);
  const [laborLogs, setLaborLogs] = useState<any[]>([]);
  const [activeTimer, setActiveTimer] = useState<any>(null);
  const [media, setMedia] = useState<any[]>([]);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchIncident();
    fetchChecklists();
    fetchPartsUsed();
    fetchInventory();
    fetchLabor();
    fetchMedia();

    socket.emit("join-room", {
      roomId: `incident-${id}`,
      user: JSON.parse(localStorage.getItem('user') || '{}')
    });

    socket.on("presence-update", (users) => {
      setActiveUsers(users);
    });

    return () => {
      socket.off("presence-update");
    };
  }, [id]);

  const fetchIncident = async () => {
    const res = await fetch(`/api/incidents/${id}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json();
    setIncident(data);
    setNewStatus(data.estado);
  };

  const fetchChecklists = async () => {
    const res = await fetch(`/api/incidents/${id}/checklists`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json();
    setChecklists(data);
  };

  const fetchPartsUsed = async () => {
    const res = await fetch(`/api/incidents/${id}/parts`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json();
    setPartsUsed(data);
  };

  const fetchInventory = async () => {
    const res = await fetch('/api/inventory', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json();
    setInventory(data);
  };

  const fetchLabor = async () => {
    const res = await fetch(`/api/incidents/${id}/labor`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json();
    setLaborLogs(data);
    const running = data.find((l: any) => !l.end_time);
    if (running) setActiveTimer(running);
  };

  const handleStartTimer = async () => {
    const res = await fetch(`/api/incidents/${id}/timer/start`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (res.ok) {
      const data = await res.json();
      setActiveTimer(data);
      fetchLabor();
    }
  };

  const handleStopTimer = async () => {
    if (!activeTimer) return;
    const res = await fetch(`/api/incidents/${id}/timer/stop`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}` 
      },
      body: JSON.stringify({ laborId: activeTimer.id })
    });
    if (res.ok) {
      setActiveTimer(null);
      fetchLabor();
    }
  };

  const calculateDuration = (start: string, end?: string) => {
    const s = new Date(start);
    const e = end ? new Date(end) : new Date();
    const diff = Math.floor((e.getTime() - s.getTime()) / 60000); // minutes
    if (diff < 60) return `${diff} min`;
    return `${Math.floor(diff / 60)}h ${diff % 60}m`;
  };

  const fetchMedia = async () => {
    try {
      const res = await fetch(`/api/incidents/${id}/media`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setMedia(data);
    } catch (e) { console.error(e); }
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
        const res = await fetch(`/api/incidents/${id}/media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: JSON.stringify({ image_url: base64, type })
        });
        if (res.ok) fetchMedia();
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
      doc.text(`- ${p.inventory?.name}: ${p.quantity_used} un x ${p.inventory?.unit_cost}€ = ${cost}€`, margin + 5, y);
      y += 6;
    });
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Materiais: ${totalMat}€`, margin, y + 5);
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

    doc.save(`Relatorio_Incidente_${incident.id.slice(0,8)}.pdf`);
  };

  const handleAddChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistItem.trim()) return;
    const res = await fetch(`/api/incidents/${id}/checklists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ task_description: newChecklistItem })
    });
    if (res.ok) {
      setNewChecklistItem('');
      fetchChecklists();
    }
  };

  const toggleChecklist = async (checklistId: string, currentStatus: boolean) => {
    const res = await fetch(`/api/incidents/${id}/checklists/${checklistId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ is_completed: !currentStatus })
    });
    if (res.ok) {
      fetchChecklists();
    }
  };

  const handleAddPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartId) return;
    const res = await fetch(`/api/incidents/${id}/parts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ part_id: selectedPartId, quantity_used: partQuantity })
    });
    if (res.ok) {
      setSelectedPartId('');
      setPartQuantity(1);
      fetchPartsUsed();
    }
  };

  const handleAddAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/incidents/${id}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ descricao_acao: actionDesc, novo_estado: newStatus })
      });
      if (res.ok) {
        setActionDesc('');
        fetchIncident();
      }
    } finally {
      setSubmittingAction(false);
    }
  };

  const fetchSystemSummary = async () => {
    // Standard system summary logic could go here
  };

  if (!incident) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">A carregar dados do protocolo...</p>
    </div>
  );

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors font-bold text-[10px] uppercase tracking-widest"
        >
          <ArrowLeft size={14} />
          Voltar à Matriz
        </button>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-xl border border-white/5">
            <Users size={12} className="text-emerald-500" />
            <div className="flex -space-x-1.5">
              {activeUsers.map((u, i) => (
                <div key={i} className="w-5 h-5 rounded-full border border-brand-surface bg-emerald-500 flex items-center justify-center text-[7px] font-bold text-white shadow-lg" title={u.user.nome}>
                  {u.user.nome.charAt(0)}
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleExportPDF}
              className="px-4 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-500/20 transition-all flex items-center gap-2"
            >
              <FileText size={14} /> Relatório PDF
            </button>
            <button className="p-2 bg-brand-surface border border-brand-border rounded-xl text-gray-400 hover:text-white transition-colors">
              <Download size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details & Actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-brand-surface rounded-none border border-brand-border overflow-hidden">
            <div className="p-6 bg-white/[0.02] border-b border-brand-border flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">Protocolo de {incident.categoria}</h2>
                  <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mt-0.5">ID: #{incident.id.toString().padStart(4, '0')}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider ${incident.severidade === 'Crítico' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                incident.severidade === 'Alto' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                  'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                }`}>
                Prioridade {incident.severidade}
              </span>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Localização do Ativo</p>
                  <div className="flex items-center gap-2 text-white">
                    <Building2 size={14} className="text-emerald-500" />
                    <span className="text-xs font-medium">{incident.property_name}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Estado Atual</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                    <span className="text-xs font-bold text-white uppercase tracking-widest">{incident.estado}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Contexto Técnico</p>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-xs text-gray-300 leading-relaxed">
                  {incident.descricao}
                </div>
              </div>

              {/* SLA Tracking */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-2xl border border-brand-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">SLA Resposta</span>
                    <Clock size={12} className="text-emerald-500" />
                  </div>
                  <p className="text-xs font-mono font-bold text-white">{format(new Date(incident.sla_resposta_limite), 'dd/MM HH:mm', { locale: ptBR })}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-brand-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">SLA Resolução</span>
                    <CheckCircle2 size={12} className="text-blue-500" />
                  </div>
                  <p className="text-xs font-mono font-bold text-white">{format(new Date(incident.sla_resolucao_limite), 'dd/MM HH:mm', { locale: ptBR })}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Operational Log */}
          <div className="bg-brand-surface rounded-none border border-brand-border overflow-hidden">
            <div className="p-6 border-b border-brand-border flex items-center justify-between">
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <Activity size={16} className="text-emerald-500" />
                Log Operacional
              </h3>
            </div>
            <div className="p-6 space-y-6">
              {canUpdateIncidents(user.perfil) && (
                <form onSubmit={handleAddAction} className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                      <textarea
                        value={actionDesc}
                        onChange={(e) => setActionDesc(e.target.value)}
                        placeholder="Registar ação técnica..."
                        className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white resize-none"
                        rows={2}
                      />
                    </div>
                    <div className="w-48 space-y-2">
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-white"
                      >
                        <option value="Aberto" className="bg-brand-surface">Aberto</option>
                        <option value="Atribuído" className="bg-brand-surface">Atribuído</option>
                        <option value="Em progresso" className="bg-brand-surface">Em progresso</option>
                        <option value="Resolvido" className="bg-brand-surface">Resolvido</option>
                        <option value="Fechado" className="bg-brand-surface">Fechado</option>
                      </select>
                      <button
                        type="submit"
                        disabled={submittingAction}
                        className="w-full py-2.5 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest disabled:opacity-50"
                      >
                        {submittingAction ? (
                          <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        ) : <Send size={14} />}
                        Submeter
                      </button>
                    </div>
                  </div>
                </form>
              )}

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {incident.actions?.map((action: any) => (
                  <div key={action.id} className="flex gap-4 group">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-white/5 border border-brand-border flex items-center justify-center text-[10px] font-bold text-gray-400">
                        {action.user_nome.charAt(0)}
                      </div>
                      <div className="flex-1 w-px bg-brand-border my-2"></div>
                    </div>
                    <div className="flex-1 pb-6">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white">{action.user_nome}</span>
                        <span className="text-[9px] font-mono text-gray-600">{format(new Date(action.data_hora), 'dd MMM HH:mm', { locale: ptBR })}</span>
                      </div>
                      <div className="p-3 bg-white/[0.02] rounded-2xl border border-white/5 text-xs text-gray-400 leading-relaxed">
                        {action.descricao_acao}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI Insights & Operations */}
        <div className="space-y-6">
          {/* Checklist Section */}
          <div className="bg-brand-surface rounded-none border border-brand-border overflow-hidden">
            <div className="p-4 border-b border-brand-border flex items-center justify-between bg-white/[0.02]">
              <h3 className="text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <ListChecks size={14} className="text-emerald-500" />
                Checklist do Técnico
              </h3>
              <span className="text-[9px] font-mono text-emerald-500 font-bold">
                {checklists.filter(c => c.is_completed).length}/{checklists.length}
              </span>
            </div>
            <div className="p-4 space-y-4">
              <form onSubmit={handleAddChecklist} className="relative">
                <input
                  type="text"
                  placeholder="Adicionar tarefa..."
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 bg-white/5 border border-brand-border rounded-xl text-[10px] focus:outline-none focus:ring-1 focus:ring-emerald-500/30 text-white"
                />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-500 hover:text-emerald-400">
                  <Plus size={14} />
                </button>
              </form>
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                {checklists.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 p-2 bg-white/[0.02] rounded-xl border border-white/5 group">
                    <button 
                      onClick={() => toggleChecklist(c.id, c.is_completed)}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${c.is_completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-600 hover:border-emerald-500/50'}`}
                    >
                      {c.is_completed && <CheckCircle2 size={10} />}
                    </button>
                    <span className={`text-[10px] flex-1 ${c.is_completed ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                      {c.task_description}
                    </span>
                  </div>
                ))}
                {checklists.length === 0 && <p className="text-[9px] text-gray-600 text-center py-4 italic">Nenhuma tarefa definida</p>}
              </div>
            </div>
          </div>

          {/* Parts Section */}
          <div className="bg-brand-surface rounded-none border border-brand-border overflow-hidden">
            <div className="p-4 border-b border-brand-border flex items-center justify-between bg-white/[0.02]">
              <h3 className="text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <Package size={14} className="text-blue-500" />
                Peças & Consumíveis
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <form onSubmit={handleAddPart} className="space-y-2">
                <select
                  value={selectedPartId}
                  onChange={(e) => setSelectedPartId(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-brand-border rounded-xl text-[10px] focus:outline-none text-white"
                >
                  <option value="" className="bg-brand-surface">Selecionar Peça...</option>
                  {inventory.map(p => (
                    <option key={p.id} value={p.id} className="bg-brand-surface" disabled={p.quantity_on_hand <= 0}>
                      {p.name} ({p.quantity_on_hand} uni.)
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    placeholder="Qtd"
                    value={partQuantity}
                    onChange={(e) => setPartQuantity(parseInt(e.target.value) || 1)}
                    className="w-20 px-3 py-2 bg-white/5 border border-brand-border rounded-xl text-[10px] text-white"
                  />
                  <button type="submit" className="flex-1 py-2 bg-blue-500 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all">
                    Adicionar
                  </button>
                </div>
              </form>
              <div className="space-y-2">
                {partsUsed.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-2 bg-white/[0.02] border border-white/5 rounded-xl">
                    <div>
                      <p className="text-[10px] font-bold text-white">{p.inventory?.name}</p>
                      <p className="text-[8px] text-gray-500 uppercase tracking-widest">{p.quantity_used} unidades @ {p.inventory?.unit_cost?.toLocaleString('pt-MZ')} MT</p>
                    </div>
                    <span className="text-[10px] font-bold text-blue-500">
                      {(p.quantity_used * (p.inventory?.unit_cost || 0)).toLocaleString('pt-MZ')} MT
                    </span>
                  </div>
                ))}
                {partsUsed.length > 0 && (
                  <div className="pt-2 border-t border-brand-border flex justify-between items-center">
                    <span className="text-[9px] font-bold text-gray-500 uppercase">Custo Total Mat.</span>
                    <span className="text-xs font-bold text-white">
                      {partsUsed.reduce((acc, p) => acc + (p.quantity_used * (p.inventory?.unit_cost || 0)), 0).toLocaleString('pt-MZ')} MT
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Labor Tracking Section */}
          <div className="bg-brand-surface rounded-none border border-brand-border overflow-hidden">
            <div className="p-4 border-b border-brand-border flex items-center justify-between bg-white/[0.02]">
              <h3 className="text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <Timer size={14} className="text-blue-500" />
                Registo de Tempo (Labor)
              </h3>
              {!activeTimer ? (
                <button onClick={handleStartTimer} className="px-3 py-1 bg-blue-500 text-white text-[9px] font-bold uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2">
                  <Clock size={12} /> Iniciar Timer
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-blue-400 animate-pulse font-bold">{calculateDuration(activeTimer.start_time)}</span>
                  <button onClick={handleStopTimer} className="px-3 py-1 bg-red-500 text-white text-[9px] font-bold uppercase tracking-widest hover:bg-red-600 transition-all">
                    Parar
                  </button>
                </div>
              )}
            </div>
            <div className="p-4 space-y-3">
              {laborLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between text-[10px] border-b border-white/5 pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center text-[8px] font-bold text-gray-500">
                      {log.user_id?.slice(-2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-gray-400 font-bold uppercase tracking-widest">Técnico #{log.user_id?.slice(-4)}</p>
                      <p className="text-[9px] text-gray-600 font-mono">{format(new Date(log.start_time), 'dd/MM HH:mm')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${!log.end_time ? 'text-blue-500' : 'text-white'}`}>
                      {!log.end_time ? 'Em curso...' : calculateDuration(log.start_time, log.end_time)}
                    </p>
                  </div>
                </div>
              ))}
              {laborLogs.length === 0 && <p className="text-[9px] text-gray-600 text-center py-4 italic">Nenhum registo de tempo.</p>}
            </div>
          </div>

          {/* Galeria de Fotos */}
          <div className="bg-brand-surface border border-brand-border rounded-none overflow-hidden mt-6">
            <div className="p-4 bg-white/[0.02] border-b border-brand-border flex items-center justify-between">
              <h3 className="text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <Camera size={14} className="text-emerald-500" />
                Galeria de Provas (Media)
              </h3>
              <div className="flex gap-2">
                <button onClick={() => handleUploadMedia('antes')} className="text-[9px] font-bold uppercase bg-white/5 hover:bg-white/10 px-3 py-1 rounded border border-white/10 transition-colors">Anexar Antes</button>
                <button onClick={() => handleUploadMedia('depois')} className="text-[9px] font-bold uppercase bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 px-3 py-1 rounded border border-emerald-500/20 transition-colors">Anexar Depois</button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {media?.map((item: any) => (
                  <div key={item.id} className="relative aspect-square bg-black/20 border border-brand-border rounded-xl overflow-hidden group">
                    <img src={item.image_url} alt="Evidência" className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded text-[8px] font-bold uppercase text-white border border-white/10">
                      {item.type}
                    </div>
                  </div>
                ))}
                {(!media || media.length === 0) && (
                  <div className="col-span-full py-12 text-center border-2 border-dashed border-brand-border rounded-xl">
                    <ImageIcon size={32} className="text-gray-700 mx-auto mb-2" />
                    <p className="text-[10px] text-gray-600 uppercase font-bold tracking-widest">Nenhuma foto anexada</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
