import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ClipboardList, Plus, CheckCircle2, AlertTriangle, Clock,
  X, Calendar, User, FileText, ChevronDown, Wrench, Eye, Shield,
  AlertCircle, ThumbsUp, ThumbsDown, Camera, Save, MoreVertical,
  ChevronRight, Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { QRCodeSVG } from 'qrcode.react';

const CONDITION_OPTIONS = ['Excelente', 'Bom', 'Razoável', 'Degradado', 'Crítico'];
const ANOMALY_TYPES = ['Visual', 'Funcional', 'Ruído', 'Vibração', 'Vazamento', 'Corrosão', 'Outra'];

export default function ManualInspection({ asset, onBack }: { asset: any; onBack: () => void }) {
  const [inspections, setInspections] = useState<any[]>([]);
  const [maintenanceData, setMaintenanceData] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewInspection, setIsNewInspection] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [meterReadings, setMeterReadings] = useState<any[]>([]);
  const [newReading, setNewReading] = useState({ value: '', unit: 'Horas' });
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    condicao_geral: 'Bom',
    anomalias_detectadas: [] as string[],
    descricao_anomalias: '',
    accoes_imediatas: '',
    requer_manutencao: false,
    componentes_verificados: {
      estrutura: false,
      conexoes: false,
      limpeza: false,
      seguranca: false,
      funcionamento: false,
    },
    observacoes: '',
    inspector_id: '',
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const [inspRes, maintRes, usersRes, meterRes] = await Promise.all([
          fetch(`/api/asset-inspections?asset_id=${asset.id}`, { headers }),
          fetch('/api/maintenance-plans', { headers }),
          fetch('/api/users', { headers }),
          fetch(`/api/assets/${asset.id}/meter-readings`, { headers }),
        ]);
        const [inspData, maintData, usersData, meterData] = await Promise.all([
          inspRes.ok ? inspRes.json() : [],
          maintRes.ok ? maintRes.json() : [],
          usersRes.ok ? usersRes.json() : [],
          meterRes.ok ? meterRes.json() : [],
        ]);
        setInspections(Array.isArray(inspData) ? inspData : []);
        setMaintenanceData(Array.isArray(maintData) ? maintData.filter((m: any) => m.asset_id === asset.id) : []);
        setUsers(Array.isArray(usersData) ? usersData : []);
        setMeterReadings(Array.isArray(meterData) ? meterData : []);
      } catch (e) {
        console.error('Erro ao carregar dados:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [asset.id]);

  const handleAnomalyToggle = (type: string) => {
    setFormData(prev => ({
      ...prev,
      anomalias_detectadas: prev.anomalias_detectadas.includes(type)
        ? prev.anomalias_detectadas.filter(a => a !== type)
        : [...prev.anomalias_detectadas, type],
    }));
  };

  const handleComponentToggle = (key: string) => {
    setFormData(prev => ({
      ...prev,
      componentes_verificados: {
        ...prev.componentes_verificados,
        [key]: !prev.componentes_verificados[key as keyof typeof prev.componentes_verificados],
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        asset_id: asset.id,
        data_inspecao: new Date().toISOString(),
        ...formData,
        componentes_verificados: JSON.stringify(formData.componentes_verificados),
        anomalias_detectadas: formData.anomalias_detectadas.join(', '),
      };
      const res = await fetch('/api/asset-inspections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const newInsp = await res.json();
        setInspections(prev => [newInsp, ...prev]);
        setIsNewInspection(false);
        setFormData({
          condicao_geral: 'Bom', anomalias_detectadas: [], descricao_anomalias: '',
          accoes_imediatas: '', requer_manutencao: false,
          componentes_verificados: { estrutura: false, conexoes: false, limpeza: false, seguranca: false, funcionamento: false },
          observacoes: '', inspector_id: '',
        });
        showToast('✅ Inspecção registada com sucesso!');
      } else {
        showToast('❌ Erro ao guardar inspecção. Tente novamente.');
      }
    } catch (err) {
      showToast('❌ Erro de rede ao submeter inspecção.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMeterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReading.value) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/assets/${asset.id}/meter-readings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ reading_value: newReading.value, unit: newReading.unit }),
      });
      if (res.ok) {
        const data = await res.json();
        setMeterReadings(p => [data, ...p]);
        setNewReading({ ...newReading, value: '' });
        showToast('✅ Leitura registada!');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Condition colour mapping
  const conditionColor = (c: string) => {
    if (c === 'Excelente') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (c === 'Bom') return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    if (c === 'Razoável') return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    if (c === 'Degradado') return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
    return 'text-red-400 bg-red-500/10 border-red-500/20';
  };

  const lastInspection = inspections[0];
  const nextMaintenance = maintenanceData[0];

  return (
    <div className="space-y-5 page-enter">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-4 right-4 z-[200] bg-brand-surface border border-brand-border shadow-2xl px-5 py-3 text-sm font-bold text-white"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors font-bold text-[10px] uppercase tracking-widest"
        >
          <ArrowLeft size={14} />
          Voltar ao Portfólio
        </button>
        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/5">
          <ClipboardList size={12} className="text-emerald-500" />
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Inspecção Manual</span>
        </div>
      </div>

      {/* Asset Header Card */}
      <div className="bg-brand-surface border border-brand-border p-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-1">
            ATIVO #{asset.id?.toString().padStart(5, '0')}
          </p>
          <h2 className="text-lg font-bold text-white tracking-tight">{asset.nome}</h2>
          <div className="flex flex-wrap gap-3 mt-2">
            <span className="text-[10px] text-gray-400 flex items-center gap-1">
              <Activity size={10} className="text-emerald-500" /> {asset.categoria}
            </span>
            {asset.localizacao_detalhada && (
              <span className="text-[10px] text-gray-400">📍 {asset.localizacao_detalhada}</span>
            )}
            {asset.data_instalacao && (
              <span className="text-[10px] text-gray-400">
                📅 Instalado em {format(new Date(asset.data_instalacao), 'dd MMM yyyy', { locale: ptBR })}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <button 
            onClick={() => setIsQRModalOpen(true)}
            className="p-3 bg-white/5 border border-brand-border rounded-xl text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-2 group"
          >
            <span className="text-[9px] font-bold uppercase tracking-widest hidden group-hover:block transition-all">Etiqueta QR</span>
            <Save size={16} />
          </button>
          {lastInspection && (
            <span className={`px-2 py-1 text-[9px] font-bold uppercase tracking-widest border ${conditionColor(lastInspection.condicao_geral)}`}>
              {lastInspection.condicao_geral}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Inspecções', value: inspections.length, color: 'text-emerald-500' },
              { label: 'Última Condição', value: lastInspection?.condicao_geral || '—', color: lastInspection ? conditionColor(lastInspection.condicao_geral).split(' ')[0] : 'text-gray-500' },
              { label: 'Horas / Ciclos', value: meterReadings[0]?.reading_value || '0', color: 'text-amber-500' },
              { label: 'Manutenções', value: maintenanceData.length, color: 'text-blue-500' },
            ].map((s, i) => (
              <div key={i} className="bg-brand-surface border border-brand-border p-4">
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{s.label}</p>
                <p className={`text-sm font-bold mt-1 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Inspections List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Histórico de Inspecções</h3>
            </div>
            {/* ... rest of inspections list logic ... */}
          </div>
        </div>

        {/* Right Column: Meter Readings */}
        <div className="space-y-5">
          <div className="bg-brand-surface border border-brand-border flex flex-col h-full">
            <div className="p-4 border-b border-brand-border flex items-center justify-between bg-white/[0.02]">
              <h3 className="text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <Activity size={14} className="text-amber-500" />
                Medição de Uso
              </h3>
            </div>
            <div className="p-4 flex-1 space-y-4">
              <form onSubmit={handleMeterSubmit} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Leitura"
                    value={newReading.value}
                    onChange={e => setNewReading({ ...newReading, value: e.target.value })}
                    className="flex-1 px-3 py-2 bg-white/5 border border-brand-border rounded-xl text-[10px] text-white focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                  />
                  <select
                    value={newReading.unit}
                    onChange={e => setNewReading({ ...newReading, unit: e.target.value })}
                    className="w-24 px-3 py-2 bg-white/5 border border-brand-border rounded-xl text-[10px] text-white focus:outline-none"
                  >
                    <option value="Horas">Horas</option>
                    <option value="Ciclos">Ciclos</option>
                    <option value="Km">Km</option>
                    <option value="Uni">Uni</option>
                  </select>
                </div>
                <button type="submit" disabled={submitting} className="w-full py-2 bg-amber-500 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20">
                  Registar Leitura
                </button>
              </form>

              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                {meterReadings.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                    <div>
                      <p className="text-xs font-bold text-white">{r.reading_value} {r.unit}</p>
                      <p className="text-[8px] text-gray-500 uppercase tracking-widest">{format(new Date(r.recorded_at), 'dd MMM yyyy', { locale: ptBR })}</p>
                    </div>
                    {/* Comparison trend would go here */}
                  </div>
                ))}
                {meterReadings.length === 0 && <p className="text-[9px] text-gray-600 text-center py-8 italic uppercase tracking-widest">Sem leituras</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR Modal */}
      <AnimatePresence>
        {isQRModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsQRModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white p-8 rounded-none shadow-2xl relative z-10 text-center">
              <h3 className="text-black font-bold uppercase tracking-widest text-[10px] mb-6">Etiqueta de Ativo - Nexo SGFM</h3>
              <div className="bg-white p-4 inline-block border-2 border-black">
                <QRCodeSVG value={JSON.stringify({ id: asset.id, name: asset.nome })} size={180} />
              </div>
              <p className="text-black font-bold text-sm mt-4 tracking-tight">{asset.nome}</p>
              <p className="text-gray-500 font-mono text-[9px] mt-1">ID: #{asset.id?.toString().padStart(6, '0')}</p>
              <button 
                onClick={() => window.print()}
                className="mt-8 w-full py-3 bg-black text-white font-bold uppercase tracking-widest text-[10px] hover:bg-gray-800 transition-all"
              >
                Imprimir Etiqueta
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Inspecções', value: inspections.length, color: 'text-emerald-500' },
          { label: 'Última Condição', value: lastInspection?.condicao_geral || '—', color: lastInspection ? conditionColor(lastInspection.condicao_geral).split(' ')[0] : 'text-gray-500' },
          { label: 'Anomalias Detectadas', value: inspections.filter(i => i.anomalias_detectadas && i.anomalias_detectadas !== '').length, color: 'text-amber-500' },
          { label: 'Planos de Manutenção', value: maintenanceData.length, color: 'text-blue-500' },
        ].map((s, i) => (
          <div key={i} className="bg-brand-surface border border-brand-border p-4">
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{s.label}</p>
            <p className={`text-sm font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Histórico de Inspecções</h3>
        <button
          onClick={() => setIsNewInspection(true)}
          className="bg-emerald-500 text-white px-5 py-2 font-bold hover:bg-emerald-600 transition-all flex items-center gap-2 text-xs shadow-lg shadow-emerald-500/20"
        >
          <Plus size={14} />
          Nova Inspecção
        </button>
      </div>

      {/* Inspections List */}
      {loading ? (
        <div className="flex items-center justify-center h-32 gap-3">
          <div className="w-6 h-6 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <span className="text-xs text-gray-500 font-mono">A carregar inspecções...</span>
        </div>
      ) : inspections.length === 0 ? (
        <div className="bg-brand-surface border border-brand-border p-10 text-center">
          <ClipboardList size={32} className="text-gray-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-400">Nenhuma inspecção registada</p>
          <p className="text-xs text-gray-600 mt-1">Clique em "Nova Inspecção" para registar a primeira</p>
        </div>
      ) : (
        <div className="space-y-2">
          {inspections.map((insp) => (
            <motion.div
              key={insp.id}
              layout
              className="bg-brand-surface border border-brand-border p-4 flex items-center justify-between hover:border-emerald-500/30 transition-colors cursor-pointer group"
              onClick={() => setSelectedInspection(insp)}
            >
              <div className="flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full ${insp.condicao_geral === 'Excelente' || insp.condicao_geral === 'Bom' ? 'bg-emerald-500' :
                    insp.condicao_geral === 'Razoável' ? 'bg-amber-500' : 'bg-red-500'
                  }`} />
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-white">
                      {format(new Date(insp.data_inspecao), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                    <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest border ${conditionColor(insp.condicao_geral)}`}>
                      {insp.condicao_geral}
                    </span>
                    {insp.requer_manutencao && (
                      <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest border bg-red-500/10 border-red-500/20 text-red-400">
                        Manutenção Requerida
                      </span>
                    )}
                  </div>
                  {insp.anomalias_detectadas && insp.anomalias_detectadas !== '' && (
                    <p className="text-[10px] text-amber-400 mt-0.5">⚠ {insp.anomalias_detectadas}</p>
                  )}
                  {insp.observacoes && (
                    <p className="text-[10px] text-gray-500 mt-0.5 truncate max-w-[400px]">{insp.observacoes}</p>
                  )}
                </div>
              </div>
              <ChevronRight size={14} className="text-gray-600 group-hover:text-emerald-500 transition-colors" />
            </motion.div>
          ))}
        </div>
      )}

      {/* New Inspection Modal */}
      <AnimatePresence>
        {isNewInspection && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewInspection(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-brand-surface w-full max-w-2xl shadow-2xl border border-brand-border relative z-10 flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-5 bg-emerald-500 text-white flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-sm font-bold tracking-tight">Nova Ficha de Inspecção</h2>
                  <p className="text-emerald-100 text-[10px] font-medium uppercase tracking-widest mt-0.5">{asset.nome}</p>
                </div>
                <button onClick={() => setIsNewInspection(false)} className="p-2 hover:bg-white/20 transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <div className="overflow-y-auto flex-1 p-6">
                <form onSubmit={handleSubmit} id="inspection-form" className="space-y-6">
                  {/* Condition */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">
                      Condição Geral do Ativo
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {CONDITION_OPTIONS.map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setFormData(p => ({ ...p, condicao_geral: opt }))}
                          className={`py-2 text-[10px] font-bold uppercase tracking-wide border transition-all ${formData.condicao_geral === opt
                              ? conditionColor(opt)
                              : 'border-brand-border text-gray-500 hover:border-gray-400'
                            }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Checklist */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">
                      Componentes Verificados
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries({
                        estrutura: 'Estrutura Física',
                        conexoes: 'Conexões / Cabos',
                        limpeza: 'Limpeza',
                        seguranca: 'Segurança',
                        funcionamento: 'Funcionamento Geral',
                      }).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleComponentToggle(key)}
                          className={`flex items-center gap-2 p-3 border text-xs font-bold transition-all ${formData.componentes_verificados[key as keyof typeof formData.componentes_verificados]
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'border-brand-border text-gray-500 hover:border-gray-400'
                            }`}
                        >
                          <CheckCircle2 size={14} className={formData.componentes_verificados[key as keyof typeof formData.componentes_verificados] ? 'text-emerald-500' : 'text-gray-600'} />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Anomalies */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">
                      Tipo de Anomalias Detectadas
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {ANOMALY_TYPES.map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleAnomalyToggle(type)}
                          className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide border transition-all ${formData.anomalias_detectadas.includes(type)
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                              : 'border-brand-border text-gray-500 hover:border-gray-400'
                            }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {formData.anomalias_detectadas.length > 0 && (
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">
                        Descrição das Anomalias
                      </label>
                      <textarea
                        rows={3}
                        value={formData.descricao_anomalias}
                        onChange={e => setFormData(p => ({ ...p, descricao_anomalias: e.target.value }))}
                        placeholder="Descreva em detalhe as anomalias encontradas..."
                        className="w-full px-4 py-3 bg-white/5 border border-brand-border text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none placeholder-gray-600"
                      />
                    </div>
                  )}

                  {/* Actions taken */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">
                      Acções Imediatas Tomadas
                    </label>
                    <textarea
                      rows={2}
                      value={formData.accoes_imediatas}
                      onChange={e => setFormData(p => ({ ...p, accoes_imediatas: e.target.value }))}
                      placeholder="Descreva quaisquer acções tomadas durante a inspecção..."
                      className="w-full px-4 py-3 bg-white/5 border border-brand-border text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none placeholder-gray-600"
                    />
                  </div>

                  {/* Require maintenance */}
                  <div className="flex items-center justify-between p-4 bg-white/5 border border-brand-border">
                    <div>
                      <p className="text-xs font-bold text-white">Requer Manutenção?</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Assinale se o ativo necessita de intervenção técnica</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, requer_manutencao: !p.requer_manutencao }))}
                      className={`flex items-center gap-2 px-4 py-2 border font-bold text-xs transition-all ${formData.requer_manutencao
                          ? 'bg-red-500/10 border-red-500/30 text-red-400'
                          : 'border-brand-border text-gray-500 hover:border-gray-400'
                        }`}
                    >
                      {formData.requer_manutencao ? <AlertTriangle size={14} /> : <ThumbsUp size={14} />}
                      {formData.requer_manutencao ? 'Sim' : 'Não'}
                    </button>
                  </div>

                  {/* Inspector and Observations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Inspector</label>
                      <select
                        value={formData.inspector_id}
                        onChange={e => setFormData(p => ({ ...p, inspector_id: e.target.value }))}
                        className="w-full px-3 py-3 bg-white/5 border border-brand-border text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value="" className="bg-brand-surface">Selecionar Inspector</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id} className="bg-brand-surface">{u.nome}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Observações Adicionais</label>
                      <textarea
                        rows={3}
                        value={formData.observacoes}
                        onChange={e => setFormData(p => ({ ...p, observacoes: e.target.value }))}
                        placeholder="Notas e observações gerais..."
                        className="w-full px-3 py-2 bg-white/5 border border-brand-border text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none placeholder-gray-600"
                      />
                    </div>
                  </div>
                </form>
              </div>

              {/* Modal Footer */}
              <div className="p-5 border-t border-brand-border flex items-center justify-between gap-3 shrink-0 bg-brand-surface">
                <button
                  type="button"
                  onClick={() => setIsNewInspection(false)}
                  className="px-5 py-2.5 border border-brand-border text-gray-400 hover:text-white hover:border-gray-400 transition-colors font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="inspection-form"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 uppercase tracking-widest text-xs disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <><div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" /> A guardar...</>
                  ) : (
                    <><Save size={14} /> Guardar Inspecção</>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Inspection Detail Modal */}
      <AnimatePresence>
        {selectedInspection && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedInspection(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="bg-brand-surface w-full max-w-xl shadow-2xl border border-brand-border relative z-10 flex flex-col max-h-[90vh]"
            >
              <div className={`p-5 flex items-center justify-between shrink-0 ${selectedInspection.condicao_geral === 'Crítico' || selectedInspection.condicao_geral === 'Degradado'
                  ? 'bg-red-900/30 border-b border-red-500/20'
                  : 'bg-emerald-900/20 border-b border-emerald-500/20'
                }`}>
                <div>
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 border ${conditionColor(selectedInspection.condicao_geral)}`}>
                    {selectedInspection.condicao_geral}
                  </span>
                  <p className="text-white font-bold mt-2 text-sm">
                    {format(new Date(selectedInspection.data_inspecao), "dd MMMM yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <button onClick={() => setSelectedInspection(null)} className="p-2 hover:bg-white/10 transition-colors text-gray-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-5 space-y-4">
                {selectedInspection.anomalias_detectadas && selectedInspection.anomalias_detectadas !== '' && (
                  <div className="p-4 bg-amber-500/5 border border-amber-500/20">
                    <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">⚠ Anomalias Detectadas</p>
                    <p className="text-xs text-amber-200">{selectedInspection.anomalias_detectadas}</p>
                    {selectedInspection.descricao_anomalias && (
                      <p className="text-xs text-gray-400 mt-2">{selectedInspection.descricao_anomalias}</p>
                    )}
                  </div>
                )}
                {selectedInspection.requer_manutencao && (
                  <div className="p-4 bg-red-500/5 border border-red-500/20 flex items-center gap-3">
                    <AlertTriangle size={16} className="text-red-400 shrink-0" />
                    <p className="text-xs text-red-300 font-bold">Este ativo requer intervenção de manutenção</p>
                  </div>
                )}
                {selectedInspection.accoes_imediatas && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Acções Imediatas</p>
                    <p className="text-xs text-gray-300">{selectedInspection.accoes_imediatas}</p>
                  </div>
                )}
                {selectedInspection.componentes_verificados && (() => {
                  try {
                    const comps = typeof selectedInspection.componentes_verificados === 'string'
                      ? JSON.parse(selectedInspection.componentes_verificados)
                      : selectedInspection.componentes_verificados;
                    const labels: Record<string, string> = {
                      estrutura: 'Estrutura', conexoes: 'Conexões', limpeza: 'Limpeza',
                      seguranca: 'Segurança', funcionamento: 'Funcionamento',
                    };
                    return (
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Componentes Verificados</p>
                        <div className="grid grid-cols-3 gap-2">
                          {Object.entries(comps).map(([k, v]) => (
                            <div key={k} className={`flex items-center gap-2 p-2 border text-[10px] font-bold ${v ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'border-brand-border text-gray-600'}`}>
                              <CheckCircle2 size={12} /> {labels[k] || k}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  } catch { return null; }
                })()}
                {selectedInspection.observacoes && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Observações</p>
                    <p className="text-xs text-gray-300 leading-relaxed">{selectedInspection.observacoes}</p>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-brand-border shrink-0">
                <button
                  onClick={() => setSelectedInspection(null)}
                  className="w-full py-2.5 border border-brand-border text-gray-400 hover:text-white hover:border-gray-400 transition-colors font-bold text-xs uppercase tracking-widest"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
