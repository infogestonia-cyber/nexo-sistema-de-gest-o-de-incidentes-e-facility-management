import React, { useState, useEffect } from 'react';
import { 
  Settings, Save, AlertCircle, Plus, Trash2, Tag, 
  Shield, Timer, Bell, Key, Database, Layout
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- shadcn UI imports ---
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';

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
        headers: { 'Authorization': `Bearer ${(sessionStorage.getItem('token') || localStorage.getItem('token'))}` }
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
          'Authorization': `Bearer ${(sessionStorage.getItem('token') || localStorage.getItem('token'))}`
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

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">A carregar registos globais...</p>
    </div>
  );

  const slaSettings = settings.filter(s => s.setting_key.includes('sla_'));
  const assetCategories = settings.find(s => s.setting_key === 'asset_categories');
  const incidentCategories = settings.find(s => s.setting_key === 'incident_categories');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 border-b border-border pb-6">
        <h2 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
          <Settings className="text-primary w-4 h-4" />
          Configurações do Sistema
        </h2>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 italic">Parâmetros de governança, SLAs e taxonomia de ativos</p>
      </div>

      <Tabs defaultValue="sla" className="space-y-6">
        <TabsList className="bg-muted/20 border border-border p-1 h-10">
          <TabsTrigger value="sla" className="text-[10px] font-bold uppercase tracking-widest h-8 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">Protocolos SLA</TabsTrigger>
          <TabsTrigger value="taxonomy" className="text-[10px] font-bold uppercase tracking-widest h-8 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">Taxonomia</TabsTrigger>
          <TabsTrigger value="security" className="text-[10px] font-bold uppercase tracking-widest h-8 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">Segurança</TabsTrigger>
        </TabsList>

        <TabsContent value="sla" className="space-y-6 focus-visible:outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {slaSettings.map(s => (
              <Card key={s.id} className="shadow-none border-border group">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs uppercase font-bold tracking-widest flex items-center gap-2">
                      <Timer size={14} className="text-primary" />
                      {s.description || s.setting_key.replace('sla_', '').toUpperCase()}
                    </CardTitle>
                    <Badge variant="outline" className="text-[8px] font-bold uppercase tracking-widest h-4">SLA Ativo</Badge>
                  </div>
                  <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground/40 mt-1">Limites temporais para resposta e resolução por prioridade</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Resposta (Horas)</Label>
                      <Input
                        type="number"
                        value={s.setting_value.resposta_horas || 0}
                        onChange={(e) => {
                          const newSettings = [...settings];
                          const idx = newSettings.findIndex(x => x.id === s.id);
                          newSettings[idx].setting_value.resposta_horas = parseInt(e.target.value) || 0;
                          setSettings(newSettings);
                        }}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Resolução (Horas)</Label>
                      <Input
                        type="number"
                        value={s.setting_value.resolucao_horas || 0}
                        onChange={(e) => {
                          const newSettings = [...settings];
                          const idx = newSettings.findIndex(x => x.id === s.id);
                          newSettings[idx].setting_value.resolucao_horas = parseInt(e.target.value) || 0;
                          setSettings(newSettings);
                        }}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/10 border-t border-border/50 py-3">
                  <Button 
                    className="w-full h-8 text-[10px] font-bold uppercase tracking-widest gap-2" 
                    onClick={() => handleSave(s.setting_key, s.setting_value)}
                    disabled={saving === s.setting_key}
                  >
                    {saving === s.setting_key ? 'Sincronizando...' : <><Save size={12} /> Guardar Parâmetros</>}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="taxonomy" className="space-y-6 focus-visible:outline-none">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Asset Categories */}
              <Card className="shadow-none border-border">
                <CardHeader>
                  <CardTitle className="text-xs uppercase font-bold tracking-widest flex items-center gap-2">
                    <Database size={14} className="text-primary" />
                    Categorias de Ativos
                  </CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground/40 mt-1">Defina a classificação hierárquica dos equipamentos</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Nova categoria..." 
                      value={newCategory} 
                      onChange={e => setNewCategory(e.target.value)}
                      className="h-9 text-xs"
                      onKeyDown={e => e.key === 'Enter' && assetCategories && newCategory.trim() && handleSave('asset_categories', [...assetCategories.setting_value, newCategory.trim()]) && setNewCategory('')}
                    />
                    <Button size="sm" className="h-9 px-3" onClick={() => assetCategories && newCategory.trim() && handleSave('asset_categories', [...assetCategories.setting_value, newCategory.trim()]) && setNewCategory('')}>
                      <Plus size={16} />
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {assetCategories?.setting_value?.map((cat: string, idx: number) => (
                      <div key={idx} className="flex items-center justify-between bg-muted/20 border border-border p-2 rounded-sm group">
                        <span className="text-xs font-medium">{cat}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive" onClick={() => handleSave('asset_categories', assetCategories.setting_value.filter((_: any, i: number) => i !== idx))}>
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Incident Categories */}
              <Card className="shadow-none border-border">
                <CardHeader>
                  <CardTitle className="text-xs uppercase font-bold tracking-widest flex items-center gap-2">
                    <AlertCircle size={14} className="text-primary" />
                    Natureza de Incidentes
                  </CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground/40 mt-1">Tipificação de problemas para filtragem e estatística</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                   <div className="flex gap-2">
                    <Input 
                      placeholder="Nova categoria..." 
                      value={newIncidentCategory} 
                      onChange={e => setNewIncidentCategory(e.target.value)}
                      className="h-9 text-xs"
                      onKeyDown={e => e.key === 'Enter' && incidentCategories && newIncidentCategory.trim() && handleSave('incident_categories', [...incidentCategories.setting_value, newIncidentCategory.trim()]) && setNewIncidentCategory('')}
                    />
                    <Button size="sm" className="h-9 px-3" onClick={() => incidentCategories && newIncidentCategory.trim() && handleSave('incident_categories', [...incidentCategories.setting_value, newIncidentCategory.trim()]) && setNewIncidentCategory('')}>
                      <Plus size={16} />
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {incidentCategories?.setting_value?.map((cat: string, idx: number) => (
                      <div key={idx} className="flex items-center justify-between bg-muted/20 border border-border p-2 rounded-sm group">
                        <span className="text-xs font-medium">{cat}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive" onClick={() => handleSave('incident_categories', incidentCategories.setting_value.filter((_: any, i: number) => i !== idx))}>
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
           </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-6 focus-visible:outline-none">
          <Card className="shadow-none border-border overflow-hidden">
            <CardHeader>
              <CardTitle className="text-xs uppercase font-bold tracking-widest flex items-center gap-2">
                <Shield size={14} className="text-primary" />
                Políticas de Acesso & Segurança
              </CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground/40 mt-1">Configurações globais de autenticação e proteção de dados</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pb-12 pt-4">
               <div className="flex items-center justify-between p-4 bg-muted/20 border border-border rounded-sm">
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-tight">Autenticação em Duas Etapas (2FA)</p>
                    <p className="text-[10px] text-muted-foreground uppercase opacity-50 font-bold">Obrigatório para perfis Administrativos e Gestores</p>
                  </div>
                  <Badge variant="outline" className="text-[8px] font-bold uppercase tracking-widest opacity-30">Desativado Globalmente</Badge>
               </div>
               <div className="flex items-center justify-between p-4 bg-muted/20 border border-border rounded-sm">
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-tight">Expiração de Sessão</p>
                    <p className="text-[10px] text-muted-foreground uppercase opacity-50 font-bold">Tempo de inatividade antes de logout automático (Padrão: 8h)</p>
                  </div>
                   <Button variant="outline" size="sm" className="h-7 text-[8px] font-bold uppercase">Configurar</Button>
               </div>
               <div className="flex items-center justify-between p-4 bg-muted/20 border border-border rounded-sm">
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-tight">Logs de Auditoria</p>
                    <p className="text-[10px] text-muted-foreground uppercase opacity-50 font-bold">Retenção de histórico de alterações críticas (Padrão: 365 dias)</p>
                  </div>
                   <Badge variant="success" className="text-[8px] font-bold uppercase tracking-widest">Ativo</Badge>
               </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
