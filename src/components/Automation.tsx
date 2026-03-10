import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Clock, 
  Settings, 
  Plus, 
  Save, 
  AlertCircle, 
  Activity,
  Cpu,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Automation() {
  const [assets, setAssets] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  
  const [formData, setFormData] = useState({
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
    setLoading(true);
    try {
      const h = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const [assetsRes, schedulesRes] = await Promise.all([
        fetch('/api/assets', { headers: h }),
        fetch('/api/pm/schedules', { headers: h })
      ]);
      const [assetsData, schedulesData] = await Promise.all([
        assetsRes.json(),
        schedulesRes.json()
      ]);
      setAssets(assetsData);
      setSchedules(schedulesData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/pm/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          frequency_days: formData.frequency_days ? parseInt(formData.frequency_days) : null,
          threshold_value: formData.threshold_value ? parseInt(formData.threshold_value) : null
        })
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
        setFormData({ asset_id: '', task_description: '', frequency_days: '', threshold_value: '', categoria: 'Preventiva' });
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Zap className="text-amber-500" />
            Cérebro de Automação
          </h2>
          <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mt-1">Configuração de Manutenção Preventiva Inteligente</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-amber-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-amber-600 transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20 text-xs"
        >
          <Plus size={16} /> Novo Agendamento
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-brand-surface border border-brand-border rounded-none overflow-hidden">
            <div className="p-4 bg-white/[0.02] border-b border-brand-border flex items-center justify-between">
              <h3 className="text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <Clock size={14} className="text-amber-500" />
                Agendamentos Ativos
              </h3>
              <button onClick={fetchData} className="text-gray-500 hover:text-white"><RefreshCw size={14} /></button>
            </div>
            <div className="divide-y divide-brand-border">
              {schedules.map((s) => {
                const asset = assets.find(a => a.id === s.asset_id);
                return (
                  <div key={s.id} className="p-4 hover:bg-white/[0.01] transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                        {s.frequency_days ? <Clock size={18} /> : <Activity size={18} />}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{s.task_description}</h4>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                          Ativo: {asset?.nome || 'Desconhecido'} 
                          {s.frequency_days && ` • Cada ${s.frequency_days} dias`}
                          {s.threshold_value && ` • Limite: ${s.threshold_value} unidades`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                       <span className={`px-2 py-1 rounded text-[8px] font-bold uppercase ${s.frequency_days ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}`}>
                          {s.frequency_days ? 'Baseado em Tempo' : 'Baseado em Uso'}
                       </span>
                    </div>
                  </div>
                );
              })}
              {schedules.length === 0 && (
                <div className="p-12 text-center">
                  <p className="text-[10px] text-gray-600 italic">Nenhum agendamento configurado.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-brand-surface border border-brand-border p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Zap size={100} />
            </div>
            <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Estado do Motor</h3>
            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400">Próximas 24h</span>
                <span className="text-xs font-bold text-amber-500">2 Alertas</span>
              </div>
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full w-[65%]" />
              </div>
              <p className="text-[9px] text-gray-500 leading-relaxed italic">
                O sistema está monitorizando os medidores de {assets.length} ativos em tempo real para disparar ordens de trabalho automáticas.
              </p>
            </div>
          </div>

          <div className="bg-brand-surface border border-brand-border p-6 shadow-xl">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Tipos de Gatilho</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Clock size={16} className="text-blue-500 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold text-white uppercase">Intervalo Fixo</p>
                  <p className="text-[9px] text-gray-500">Ideal para inspeções semanais ou mensais.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Activity size={16} className="text-purple-500 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold text-white uppercase">Limite de Uso</p>
                  <p className="text-[9px] text-gray-500">Ideal para troca de consumíveis por horas/ciclos.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-brand-surface w-full max-w-lg shadow-2xl border border-brand-border relative z-10">
              <div className="p-6 bg-amber-500 text-white flex items-center justify-between">
                <h2 className="font-bold tracking-tight">Novo Agendamento Inteligente</h2>
                <Plus size={20} className="rotate-45 cursor-pointer" onClick={() => setIsModalOpen(false)} />
              </div>
              <form onSubmit={handleSave} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Ativo Alvo</label>
                  <select required value={formData.asset_id} onChange={e => setFormData({...formData, asset_id: e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-xs text-white">
                    <option value="" className="bg-brand-surface">Selecionar Ativo...</option>
                    {assets.map(a => <option key={a.id} value={a.id} className="bg-brand-surface">{a.nome} ({a.categoria})</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Descrição da Tarefa</label>
                  <input type="text" required value={formData.task_description} onChange={e => setFormData({...formData, task_description: e.target.value})} placeholder="ex: Revisão Geral do Motor de Popa" className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-xs text-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Frequência (Dias)</label>
                    <input type="number" value={formData.frequency_days} onChange={e => setFormData({...formData, frequency_days: e.target.value})} placeholder="ex: 30" className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-xs text-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Limite Medidor</label>
                    <input type="number" value={formData.threshold_value} onChange={e => setFormData({...formData, threshold_value: e.target.value})} placeholder="ex: 500" className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-xs text-white" />
                  </div>
                </div>
                <button type="submit" className="w-full py-4 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-all shadow-xl shadow-amber-500/20 uppercase tracking-widest text-xs">
                  Activar Automação
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
