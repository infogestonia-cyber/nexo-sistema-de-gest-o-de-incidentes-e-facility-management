import React, { useState, useEffect } from 'react';
import { Settings, Save, AlertCircle, Plus, Trash2, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function SystemSettings() {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [newIncidentCategory, setNewIncidentCategory] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key: string, value: any) => {
    setSaving(key);
    try {
      const res = await fetch(`/api/settings/${key}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ setting_value: value })
      });
      if (res.ok) {
        fetchSettings();
      }
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <div className="p-6 text-white text-xs">A carregar configurações...</div>;

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-none border border-emerald-500/20">
              <Settings size={20} />
            </div>
            Configurações do Sistema
          </h2>
          <p className="text-[10px] font-mono text-gray-400 mt-2 uppercase tracking-widest">
            SLA e Parâmetros Globais
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {settings.map(s => {
          if (s.setting_key === 'asset_categories') return null; // Handle separately
          return (
            <div key={s.id} className="bg-brand-surface border border-brand-border rounded-none p-6 space-y-4 hover:border-emerald-500/20 transition-colors">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-emerald-500" />
                <h3 className="text-xs font-bold text-white uppercase tracking-widest">{s.description || s.setting_key}</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 block">Tempo de Resposta (h)</label>
                  <input
                    type="number"
                    value={s.setting_value.resposta_horas || 0}
                    onChange={(e) => {
                      const newSettings = [...settings];
                      const idx = newSettings.findIndex(x => x.id === s.id);
                      newSettings[idx].setting_value.resposta_horas = parseInt(e.target.value) || 0;
                      setSettings(newSettings);
                    }}
                    className="w-full px-3 py-2 bg-white/5 border border-brand-border rounded-none text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 block">Tempo de Resolução (h)</label>
                  <input
                    type="number"
                    value={s.setting_value.resolucao_horas || 0}
                    onChange={(e) => {
                      const newSettings = [...settings];
                      const idx = newSettings.findIndex(x => x.id === s.id);
                      newSettings[idx].setting_value.resolucao_horas = parseInt(e.target.value) || 0;
                      setSettings(newSettings);
                    }}
                    className="w-full px-3 py-2 bg-white/5 border border-brand-border rounded-none text-xs text-white"
                  />
                </div>
              </div>
              <button
                onClick={() => handleSave(s.setting_key, s.setting_value)}
                disabled={saving === s.setting_key}
                className="w-full py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-none font-bold hover:bg-emerald-500/20 text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all mt-2"
              >
                {saving === s.setting_key ? 'A gravar...' : <><Save size={14} /> Guardar Alterações</>}
              </button>
            </div>
          );
        })}

        {/* Dynamic Categories Management */}
        {settings.find(s => s.setting_key === 'asset_categories') && (
          <div className="bg-brand-surface border border-brand-border rounded-none p-6 space-y-4 hover:border-emerald-500/20 transition-colors">
            <div className="flex items-center gap-2">
              <Tag size={16} className="text-emerald-500" />
              <h3 className="text-xs font-bold text-white uppercase tracking-widest">Categorias de Ativos</h3>
            </div>
            
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Nova categoria..."
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="flex-1 px-3 py-2 bg-white/5 border border-brand-border rounded-none text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const s = settings.find(x => x.setting_key === 'asset_categories');
                    if (s && newCategory.trim()) {
                      const updated = [...s.setting_value, newCategory.trim()];
                      handleSave('asset_categories', updated);
                      setNewCategory('');
                    }
                  }
                }}
              />
              <button 
                onClick={() => {
                  const s = settings.find(x => x.setting_key === 'asset_categories');
                  if (s && newCategory.trim()) {
                    const updated = [...s.setting_value, newCategory.trim()];
                    handleSave('asset_categories', updated);
                    setNewCategory('');
                  }
                }}
                className="p-2 bg-emerald-500 text-white rounded-none hover:bg-emerald-600 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
              <AnimatePresence initial={false}>
                {settings.find(s => s.setting_key === 'asset_categories')?.setting_value.map((cat: string, idx: number) => (
                  <motion.div
                    key={cat}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center justify-between bg-white/5 border border-white/10 rounded-none px-3 py-2"
                  >
                    <span className="text-xs text-white">{cat}</span>
                    <button
                      onClick={() => {
                        const s = settings.find(x => x.setting_key === 'asset_categories');
                        if (s) {
                          const updated = s.setting_value.filter((_: string, i: number) => i !== idx);
                          handleSave('asset_categories', updated);
                        }
                      }}
                      className="text-red-400 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="pt-4 border-t border-brand-border">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest">Categorias de Incidentes</h3>
              <p className="text-[10px] text-gray-500 mt-1">Defina os tipos de problema que podem ser reportados.</p>
              <div className="flex gap-2 mt-3">
                <input
                  type="text"
                  placeholder="Nova categoria de incidente..."
                  value={newIncidentCategory}
                  onChange={(e) => setNewIncidentCategory(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white/5 border border-brand-border rounded-none text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const s = settings.find(x => x.setting_key === 'incident_categories');
                      if (s && newIncidentCategory.trim()) {
                        const updated = [...s.setting_value, newIncidentCategory.trim()];
                        handleSave('incident_categories', updated);
                        setNewIncidentCategory('');
                      }
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const s = settings.find(x => x.setting_key === 'incident_categories');
                    if (s && newIncidentCategory.trim()) {
                      const updated = [...s.setting_value, newIncidentCategory.trim()];
                      handleSave('incident_categories', updated);
                      setNewIncidentCategory('');
                    }
                  }}
                  className="p-2 bg-emerald-500 text-white rounded-none hover:bg-emerald-600 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar mt-3">
                <AnimatePresence initial={false}>
                  {settings.find(s => s.setting_key === 'incident_categories')?.setting_value.map((cat: string, idx: number) => (
                    <motion.div
                      key={cat}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center justify-between bg-white/5 border border-white/10 rounded-none px-3 py-2"
                    >
                      <span className="text-xs text-white">{cat}</span>
                      <button
                        onClick={() => {
                          const s = settings.find(x => x.setting_key === 'incident_categories');
                          if (s) {
                            const updated = s.setting_value.filter((_: string, i: number) => i !== idx);
                            handleSave('incident_categories', updated);
                          }
                        }}
                        className="text-red-400 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}

        {settings.length === 0 && (
          <p className="text-xs text-gray-500 italic">Nenhuma configuração encontrada no sistema.</p>
        )}
      </div>
    </div>
  );
}

