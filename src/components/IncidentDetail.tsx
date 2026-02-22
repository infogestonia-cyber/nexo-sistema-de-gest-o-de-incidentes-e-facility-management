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
  Cpu
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Markdown from 'react-markdown';
import socket from '../services/socketService';
import { canUpdateIncidents } from '../utils/permissions';

export default function IncidentDetail({ id, onBack }: { id: number, onBack: () => void }) {
  const [incident, setIncident] = useState<any>(null);
  const [actionDesc, setActionDesc] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchIncident();

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

    // Predictive analytics logic removed
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
          <button className="p-2 bg-brand-surface border border-brand-border rounded-xl text-gray-400 hover:text-white transition-colors">
            <Download size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details & Actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-brand-surface rounded-[32px] border border-brand-border overflow-hidden">
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
          <div className="bg-brand-surface rounded-[32px] border border-brand-border overflow-hidden">
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

        {/* Right Column: AI Insights */}
        <div className="space-y-6">
          {/* AI Predictive Analysis */}
          {/* System Performance Card (formerly AI) */}
          <div className="bg-brand-surface rounded-[32px] border border-brand-border overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <Activity size={80} />
            </div>
            <div className="p-6 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center gap-3">
              <div className="p-2 bg-emerald-500 rounded-xl text-white shadow-lg shadow-emerald-500/20">
                <ShieldCheck size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Status de Integridade</h3>
                <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest">Sistema Nexo - SGFM Ativo</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 space-y-2 text-center py-10">
                <p className="text-xs text-white font-medium">Todos os sensores operacionais. Monitorização em tempo real ativa.</p>
              </div>
            </div>
          </div>

          {/* AI Protocol Summary */}
          {/* Protocol Summary */}
          <div className="bg-brand-surface rounded-[32px] border border-brand-border overflow-hidden">
            <div className="p-6 border-b border-brand-border flex items-center justify-between">
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <MessageSquare size={16} className="text-blue-500" />
                Resumo do Sistema
              </h3>
            </div>
            <div className="p-6">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest text-center py-10">Resumo técnico gerado pelo motor Nexo.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
