import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, ClipboardList, Plus, CheckCircle2, AlertTriangle, Clock,
  X, Calendar, User, FileText, ChevronDown, Wrench, Eye, Shield,
  AlertCircle, ThumbsUp, ThumbsDown, Camera, Save, MoreVertical,
  ChevronRight, Activity, QrCode, Printer, History
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { QRCodeSVG } from 'qrcode.react';

// --- shadcn UI imports ---
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Pagination } from './ui/Pagination';
import { RefreshButton } from './ui/RefreshButton';

const CONDITION_OPTIONS = ['Excelente', 'Bom', 'Razoável', 'Degradado', 'Crítico'];
const ANOMALY_TYPES = ['Visual', 'Funcional', 'Ruído', 'Vibração', 'Vazamento', 'Corrosão', 'Outra'];

export default function DigitalTwin({ asset, onBack }: { asset: any; onBack: () => void }) {
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
  const [inspectionsPage, setInspectionsPage] = useState(1);
  const itemsPerPage = 5;

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

  const fetchAll = async () => {
    setLoading(true);
    try {
      const token = (sessionStorage.getItem('token') || localStorage.getItem('token'));
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

  useEffect(() => {
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

  const handleComponentToggle = (key: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      componentes_verificados: {
        ...prev.componentes_verificados,
        [key]: checked,
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
          Authorization: `Bearer ${(sessionStorage.getItem('token') || localStorage.getItem('token'))}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const newInsp = await res.json().catch(() => null);
        if (newInsp) setInspections(prev => [newInsp, ...prev]);
        setIsNewInspection(false);
        setFormData({
          condicao_geral: 'Bom', anomalias_detectadas: [], descricao_anomalias: '',
          accoes_imediatas: '', requer_manutencao: false,
          componentes_verificados: { estrutura: false, conexoes: false, limpeza: false, seguranca: false, funcionamento: false },
          observacoes: '', inspector_id: '',
        });
      }
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
          Authorization: `Bearer ${(sessionStorage.getItem('token') || localStorage.getItem('token'))}`,
        },
        body: JSON.stringify({ reading_value: newReading.value, unit: newReading.unit }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data) setMeterReadings(p => [data, ...p]);
        setNewReading({ ...newReading, value: '' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const conditionVariant = (c: string) => {
    if (c === 'Excelente' || c === 'Bom') return 'success';
    if (c === 'Razoável') return 'warning';
    return 'destructive';
  };

  const lastInspection = inspections[0];


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={onBack} className="h-8 w-8">
            <ArrowLeft size={14} />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold tracking-tight leading-none mb-1">
              Digital Twin: {asset.nome}
            </h1>
            <p className="text-xs text-muted-foreground font-medium">
              Gestão de Ciclo de Vida & Monitorização Operacional
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RefreshButton onClick={fetchAll} loading={loading} />
          <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => setIsQRModalOpen(true)}>
            <QrCode size={14} />
            Etiqueta
          </Button>
          <Button variant="default" size="sm" className="h-9 gap-2" onClick={() => setIsNewInspection(true)}>
            <Plus size={14} />
            Nova Inspecção
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-3 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="shadow-none border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-muted-foreground border border-border">
                  <Shield size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Condição</p>
                  <p className="text-sm font-bold">{lastInspection?.condicao_geral || 'Não Avaliado'}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-none border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-muted-foreground border border-border">
                  <Activity size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Uso Acumulado</p>
                  <p className="text-sm font-bold">{meterReadings[0]?.reading_value || '0'} {meterReadings[0]?.unit || 'un'}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-none border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-muted-foreground border border-border">
                  <Calendar size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Última Inspecção</p>
                  <p className="text-sm font-bold">
                    {lastInspection ? format(new Date(lastInspection.data_inspecao), 'dd MMM yyyy', { locale: ptBR }) : 'Pendente'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="history" className="w-full">
            <TabsList className="w-full justify-start bg-muted/20 border-b border-border rounded-none h-11 p-0">
              <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 text-xs font-bold uppercase tracking-widest">Histórico de Inspecções</TabsTrigger>
              <TabsTrigger value="meter" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 text-xs font-bold uppercase tracking-widest">Leituras de Medidores</TabsTrigger>
              <TabsTrigger value="info" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 text-xs font-bold uppercase tracking-widest">Ficha Técnica</TabsTrigger>
            </TabsList>
            
            <TabsContent value="history" className="pt-4 animate-in fade-in duration-300">
                <Card className="shadow-none border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px] uppercase font-bold">Data</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold">Condição</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold">Anomalias</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inspections.slice((inspectionsPage - 1) * itemsPerPage, inspectionsPage * itemsPerPage).map((insp) => (
                        <TableRow key={insp.id} className="cursor-pointer group" onClick={() => setSelectedInspection(insp)}>
                          <TableCell className="text-xs font-medium">
                            {format(new Date(insp.data_inspecao), 'dd MMM yyyy, HH:mm', { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={conditionVariant(insp.condicao_geral) as any} className="text-[9px] h-4">
                              {insp.condicao_geral}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-[11px] text-muted-foreground">
                            {insp.anomalias_detectadas || 'Nenhuma'}
                          </TableCell>
                          <TableCell>
                            {insp.requer_manutencao && <Badge variant="destructive" className="text-[8px] h-3.5 px-1">MANUTENÇÃO</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                      {inspections.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic text-xs">
                            Nenhuma inspecção registada até ao momento.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Card>
                {inspections.length > itemsPerPage && (
                  <div className="mt-4">
                    <Pagination
                      currentPage={inspectionsPage}
                      totalItems={inspections.length}
                      itemsPerPage={itemsPerPage}
                      onPageChange={setInspectionsPage}
                    />
                  </div>
                )}
            </TabsContent>

            <TabsContent value="meter" className="pt-4 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-1 shadow-none border-border">
                  <CardHeader>
                    <CardTitle className="text-sm">Nova Medição</CardTitle>
                    <CardDescription className="text-xs">Registe leituras de uso: horas, ciclos, etc.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleMeterSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold">Valor</Label>
                        <Input
                          type="number"
                          value={newReading.value}
                          onChange={e => setNewReading({ ...newReading, value: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold">Unidade</Label>
                        <Select value={newReading.unit} onValueChange={val => setNewReading({ ...newReading, unit: val })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Horas">Horas</SelectItem>
                            <SelectItem value="Ciclos">Ciclos</SelectItem>
                            <SelectItem value="Km">Km</SelectItem>
                            <SelectItem value="Uni">Uni</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="submit" disabled={submitting} className="w-full text-xs font-bold">
                        EFETUAR LEITURA
                      </Button>
                    </form>
                  </CardContent>
                </Card>
                
                <Card className="md:col-span-2 shadow-none border-border">
                  <CardHeader>
                    <CardTitle className="text-sm">Cronologia de Uso</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[10px] uppercase font-bold">Data</TableHead>
                          <TableHead className="text-[10px] uppercase font-bold">Leitura</TableHead>
                          <TableHead className="text-[10px] uppercase font-bold text-right">Diferença</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading && meterReadings.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="h-32 text-center">
                              <div className="flex flex-col items-center gap-2">
                                <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sincronizando...</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : meterReadings.length > 0 ? (
                          meterReadings.map((r, i) => (
                          <TableRow key={r.id}>
                            <TableCell className="text-xs">{format(new Date(r.recorded_at), 'dd MMM yyyy', { locale: ptBR })}</TableCell>
                            <TableCell className="text-xs font-bold">{r.reading_value} {r.unit}</TableCell>
                            <TableCell className="text-right text-[10px] text-muted-foreground">
                              {i < meterReadings.length - 1 ? `+${(Number(r.reading_value) - Number(meterReadings[i+1].reading_value)).toFixed(1)}` : '—'}
                            </TableCell>
                          </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="h-32 text-center text-muted-foreground italic text-xs">
                               Nenhuma leitura encontrada.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="info" className="pt-4 animate-in fade-in duration-300">
              <Card className="shadow-none border-border">
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Identificação</Label>
                      <p className="mt-1 font-semibold">{asset.nome}</p>
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Categoria do Ativo</Label>
                      <p className="mt-1 font-semibold">{asset.categoria}</p>
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Localização Detalhada</Label>
                      <p className="mt-1 font-semibold">{asset.localizacao_detalhada || 'Sem informação'}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Unidade de Alojamento</Label>
                      <p className="mt-1 font-semibold">{asset.property_name || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Data de Comissionamento</Label>
                      <p className="mt-1 font-semibold">{asset.data_instalacao || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Estado de Obsolescência</Label>
                      <p className="mt-1">
                        {asset.obsoleto ? (
                          <Badge variant="destructive" className="text-[9px]">OBSOLETO ({asset.data_obsolescencia})</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] bg-primary/10 border-primary/20 text-primary">OPERATIVO</Badge>
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Status Card */}
        <div className="space-y-6">
          <Card className="shadow-none border-border bg-zinc-950 text-white">
            <CardHeader className="p-4 border-b border-white/10">
              <CardTitle className="text-[10px] uppercase font-bold flex items-center gap-2">
                <Shield size={14} className="text-zinc-400" />
                Saúde do Ativo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-end justify-between">
                <span className="text-[10px] text-zinc-400 font-bold uppercase">Estado Geral</span>
                <span className={`text-sm font-bold ${lastInspection?.condicao_geral === 'Excelente' ? 'text-emerald-400' : 'text-zinc-100'}`}>
                  {lastInspection?.condicao_geral || 'N/D'}
                </span>
              </div>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${
                    lastInspection?.condicao_geral === 'Excelente' ? 'bg-emerald-500 w-full' :
                    lastInspection?.condicao_geral === 'Bom' ? 'bg-emerald-500/70 w-4/5' :
                    lastInspection?.condicao_geral === 'Razoável' ? 'bg-amber-500 w-1/2' : 'bg-destructive w-1/4'
                  }`}
                />
              </div>
              <Separator className="bg-white/5" />
              <div className="space-y-2">
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Ações Requeridas</p>
                {lastInspection?.requer_manutencao ? (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded flex items-start gap-2">
                    <AlertTriangle size={14} className="text-destructive shrink-0 mt-0.5" />
                    <p className="text-[10px] font-medium leading-relaxed">Intervenção técnica imediata sugerida pela última inspeção.</p>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] font-medium leading-relaxed">Nenhuma ação crítica pendente reportada.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-none border-border">
            <CardHeader className="p-4 border-b border-border">
                <CardTitle className="text-[10px] uppercase font-bold flex items-center gap-2 text-muted-foreground">
                  <History size={14} />
                  Contexto Histórico
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Planos Ativos</span>
                <span className="font-bold">{maintenanceData.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Incidentes Críticos</span>
                <span className="font-bold text-destructive">0</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* QR Modal */}
      <Dialog open={isQRModalOpen} onOpenChange={setIsQRModalOpen}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>Etiqueta de Ativo</DialogTitle>
            <DialogDescription>ID: #{asset.id?.toString().padStart(6, '0')}</DialogDescription>
          </DialogHeader>
          <div className="p-8 flex flex-col items-center gap-6">
            <div className="p-4 bg-white border-2 border-zinc-950 rounded-lg">
               <QRCodeSVG value={JSON.stringify({ id: asset.id, name: asset.nome })} size={180} />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-sm tracking-tight">{asset.nome}</p>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Nexo SGFM Asset Tag</p>
            </div>
          </div>
          <Button variant="default" className="w-full gap-2" onClick={() => window.print()}>
            <Printer size={16} />
            Imprimir Etiqueta
          </Button>
        </DialogContent>
      </Dialog>

      {/* New Inspection Modal */}
      <Dialog open={isNewInspection} onOpenChange={setIsNewInspection}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Nova Inspecção Técnica</DialogTitle>
            <DialogDescription>Avaliação sistemática do estado operativo: {asset.nome}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            <form onSubmit={handleSubmit} id="inspection-form" className="space-y-8 py-4">
              <div className="space-y-3">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Condição Geral</Label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {CONDITION_OPTIONS.map(opt => (
                    <Button
                      key={opt}
                      type="button"
                      variant={formData.condicao_geral === opt ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFormData(p => ({ ...p, condicao_geral: opt }))}
                      className="text-[10px] h-8 font-bold"
                    >
                      {opt}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Checklist de Conformidade</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries({
                    estrutura: 'Integridade Estrutural',
                    conexoes: 'Sistemas Elétricos / Conexões',
                    limpeza: 'Estado de Higiene / Limpeza',
                    seguranca: 'Protocolos de Segurança',
                    funcionamento: 'Performance Operacional',
                  }).map(([key, label]) => (
                    <div key={key} className="flex items-center space-x-2 p-3 border border-border rounded-md bg-muted/10">
                      <Checkbox 
                        id={key} 
                        checked={formData.componentes_verificados[key as keyof typeof formData.componentes_verificados]}
                        onCheckedChange={(checked) => handleComponentToggle(key, !!checked)}
                      />
                      <label htmlFor={key} className="text-xs font-medium leading-none cursor-pointer">{label}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Anomalias e Observações</Label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {ANOMALY_TYPES.map(type => (
                    <Badge
                      key={type}
                      variant={formData.anomalias_detectadas.includes(type) ? 'default' : 'secondary'}
                      className="cursor-pointer"
                      onClick={() => handleAnomalyToggle(type)}
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
                <Textarea 
                  placeholder="Detalhamento técnico de anomalias ou observações gerais..." 
                  className="min-h-[100px]"
                  value={formData.observacoes}
                  onChange={e => setFormData(p => ({ ...p, observacoes: e.target.value }))}
                />
              </div>

              <div className="flex items-center justify-between p-4 border border-border rounded-md bg-muted/5">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold uppercase">Manutenção Necessária?</p>
                  <p className="text-[10px] text-muted-foreground">Sinalizar para intervenção técnica imediata</p>
                </div>
                <Checkbox 
                   checked={formData.requer_manutencao}
                   onCheckedChange={(checked) => setFormData(p => ({ ...p, requer_manutencao: !!checked }))}
                />
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Responsável pela Inspecção</Label>
                <Select value={formData.inspector_id} onValueChange={val => setFormData(p => ({ ...p, inspector_id: val }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o técnico..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id.toString()}>{u.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </form>
          </ScrollArea>
          <div className="flex gap-3 pt-4 border-t border-border">
             <Button variant="outline" className="flex-1" onClick={() => setIsNewInspection(false)}>Cancelar</Button>
             <Button type="submit" form="inspection-form" disabled={submitting} className="flex-1">
               {submitting ? 'A guardar...' : 'Confirmar Inspecção'}
             </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inspection Detail Modal */}
      <Dialog open={!!selectedInspection} onOpenChange={() => setSelectedInspection(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Detalhe da Inspecção</DialogTitle>
            <DialogDescription>
              {selectedInspection && format(new Date(selectedInspection.data_inspecao), "dd MMMM yyyy 'às' HH:mm", { locale: ptBR })}
            </DialogDescription>
          </DialogHeader>
          {selectedInspection && (
            <div className="space-y-6 pt-4">
              <div className="flex items-center justify-between">
                <Badge variant={conditionVariant(selectedInspection.condicao_geral) as any}>
                  CONDIÇÃO: {selectedInspection.condicao_geral}
                </Badge>
                {selectedInspection.requer_manutencao && <Badge variant="destructive">MANUTENÇÃO REQUERIDA</Badge>}
              </div>

              <div className="space-y-4 text-sm">
                {selectedInspection.anomalias_detectadas && (
                  <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-md">
                    <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                       <AlertCircle size={14} /> Anomalias Detectadas
                    </p>
                    <p className="text-foreground font-medium">{selectedInspection.anomalias_detectadas}</p>
                    {selectedInspection.descricao_anomalias && (
                       <p className="text-muted-foreground mt-2 text-xs">{selectedInspection.descricao_anomalias}</p>
                    )}
                  </div>
                )}

                <div>
                   <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-2 block">Observações do Técnico</Label>
                   <p className="text-foreground leading-relaxed italic bg-muted/20 p-4 border border-border rounded-md">
                     "{selectedInspection.observacoes || 'Sem observações escritas.'}"
                   </p>
                </div>
              </div>

              <Button variant="outline" className="w-full" onClick={() => setSelectedInspection(null)}>Fechar Detalhe</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
