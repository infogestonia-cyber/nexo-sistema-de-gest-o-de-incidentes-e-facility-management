import React, { useState, useEffect } from 'react';
import { 
  Plus, User as UserIcon, X, MoreVertical, CheckCircle2, 
  ShieldCheck, Search, Shield, UserCircle, Key, Trash2, 
  Mail, Settings, MoreHorizontal, UserMinus, Activity,
  Calendar, ClipboardList, Briefcase, ChevronRight,
  TrendingUp, Clock, History, Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { canManageUsers } from '../utils/permissions';

// --- shadcn UI imports ---
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Label } from './ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Separator } from './ui/separator';
import { Pagination } from './ui/Pagination';
import { RefreshButton } from './ui/RefreshButton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Progress } from './ui/progress';

// Helper for date formatting
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const getPerfilVariant = (perfil: string) => {
  switch (perfil?.toLowerCase()) {
    case 'administrador': return 'destructive';
    case 'gestor': return 'default';
    case 'técnico': return 'secondary';
    case 'cliente': return 'outline';
    default: return 'outline';
  }
};

export default function Users() {
  const [users, setUsers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [profileFilter, setProfileFilter] = useState('todos');

  // Reset page when filtering
  useEffect(() => {
    setCurrentPage(1);
  }, [search, profileFilter]);
  
  const [currentUser] = useState<any>(() => {
    try {
      const u = (sessionStorage.getItem('user') || localStorage.getItem('user'));
      return u && u !== 'undefined' ? JSON.parse(u) : {};
    } catch { return {}; }
  });
  
  const [formData, setFormData] = useState({
    id: '',
    nome: '',
    email: '',
    password: '',
    perfil: 'Visualizador',
    property_id: 'none',
    asset_id: 'none'
  });
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);

  // --- User Detail States ---
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [userActivity, setUserActivity] = useState<any>(null);
  const [activityLoading, setActivityLoading] = useState(false);

  useEffect(() => { 
    fetchUsers(); 
    fetchMetadata();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${(sessionStorage.getItem('token') || localStorage.getItem('token'))}` } });
      const data = res.ok ? await res.json() : [];
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [pRes, aRes] = await Promise.all([
        fetch('/api/properties', { headers: { Authorization: `Bearer ${(sessionStorage.getItem('token') || localStorage.getItem('token'))}` } }),
        fetch('/api/assets', { headers: { Authorization: `Bearer ${(sessionStorage.getItem('token') || localStorage.getItem('token'))}` } }),
      ]);
      if (pRes.ok) setProperties(await pRes.json());
      if (aRes.ok) setAssets(await aRes.json());
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (user: any) => {
    if (!window.confirm(`Tem a certeza que deseja eliminar ${user.nome}?`)) return;
    try {
      const url = user.type === 'client' ? `/api/clientes/${user.id}` : `/api/users/${user.id}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${(sessionStorage.getItem('token') || localStorage.getItem('token'))}` }
      });
      if (res.ok) fetchUsers();
    } catch (e) { console.error(e); }
  };

  const handleUserClick = (u: any) => {
    setSelectedUser(u);
    setIsDetailOpen(true);
    fetchUserActivity(u.id);
  };

  const fetchUserActivity = async (userId: string) => {
    setActivityLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/activity`, {
        headers: { Authorization: `Bearer ${(sessionStorage.getItem('token') || localStorage.getItem('token'))}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUserActivity(data);
      }
    } catch (e) {
      console.error('Erro ao buscar atividade:', e);
    } finally {
      setActivityLoading(false);
    }
  };

  const handleExportBI = () => {
    if (!selectedUser || !userActivity) return;

    // Sheet 1: Perfil & Resumo
    const perfilData = [
      { Campo: 'Nome', Valor: selectedUser.nome },
      { Campo: 'Email', Valor: selectedUser.email },
      { Campo: 'Perfil', Valor: selectedUser.perfil },
      { Campo: 'Estado', Valor: selectedUser.estado || 'Ativo' },
      { Campo: 'Membro desde', Valor: safeFormat(selectedUser.created_at, 'dd/MM/yyyy') },
      { Campo: '', Valor: '' },
      { Campo: 'KPI: Compliance SLA', Valor: `${userActivity.stats?.compliance || 0}%` },
      { Campo: 'KPI: Incidentes Resolvidos', Valor: userActivity.stats?.totalResolved || 0 },
      { Campo: 'KPI: Total Atribuídos', Valor: userActivity.stats?.totalAssigned || 0 },
    ];

    // Sheet 2: Incidentes
    const incidentsData = (userActivity.incidents || []).map((inc: any) => ({
      ID: inc.id?.substring(0, 8),
      Data: safeFormat(inc.created_at, 'dd/MM/yy HH:mm'),
      Categoria: inc.categoria,
      Descricao: inc.descricao,
      Estado: inc.estado,
      Prioridade: inc.prioridade
    }));

    // Sheet 3: Timeline de Ações
    const actionsData = (userActivity.actions || []).map((act: any) => ({
      Data: safeFormat(act.created_at, 'dd/MM/yy HH:mm'),
      Acao: act.descricao_acao,
      Incidente: act.incident_desc
    }));

    // Sheet 4: Responsabilidades (Planos e Inspeções)
    const plansData = (userActivity.plans || []).map((p: any) => ({
      Tipo: p.tipo,
      Ativo: p.asset_name,
      Estado: p.estado,
      Data_Prevista: safeFormat(p.data_planeada, 'dd/MM/yyyy')
    }));

    const workbook = XLSX.utils.book_new();
    
    const wsPerfil = XLSX.utils.json_to_sheet(perfilData);
    XLSX.utils.book_append_sheet(workbook, wsPerfil, "Perfil & Resumo");

    if (incidentsData.length > 0) {
      const wsInc = XLSX.utils.json_to_sheet(incidentsData);
      XLSX.utils.book_append_sheet(workbook, wsInc, "Incidentes");
    }

    if (actionsData.length > 0) {
      const wsAct = XLSX.utils.json_to_sheet(actionsData);
      XLSX.utils.book_append_sheet(workbook, wsAct, "Histórico de Ações");
    }

    if (plansData.length > 0) {
      const wsPlans = XLSX.utils.json_to_sheet(plansData);
      XLSX.utils.book_append_sheet(workbook, wsPlans, "Responsabilidades");
    }

    XLSX.writeFile(workbook, `Nexo_BI_${selectedUser.nome.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleEdit = (u: any, e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar abrir o detalhe ao editar
    setEditingId(u.id);
    setFormData({
      id: u.id,
      nome: u.nome || '',
      email: u.email || '',
      password: '',
      perfil: u.perfil || 'Visualizador',
      property_id: u.property_id || 'none',
      asset_id: u.asset_id || 'none'
    });
    setIsModalOpen(true);
  };

  const handleNewUser = () => {
    setEditingId(null);
    setFormData({
      id: '', nome: '', email: '', password: '', perfil: 'Visualizador',
      property_id: 'none', asset_id: 'none'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const submitData = {
        ...formData,
        property_id: formData.property_id === 'none' ? null : formData.property_id,
        asset_id: formData.asset_id === 'none' ? null : formData.asset_id
      };

      const method = editingId ? 'PATCH' : 'POST';
      const url = editingId 
        ? (formData.perfil === 'Cliente' ? `/api/clientes/${editingId}` : `/api/users/${editingId}`)
        : '/api/users';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${(sessionStorage.getItem('token') || localStorage.getItem('token'))}` },
        body: JSON.stringify(submitData),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setEditingId(null);
        fetchUsers();
        // Se estivermos editando o usuário selecionado no Sheet, atualizamos ele também
        if (editingId === selectedUser?.id) {
            setSelectedUser({ ...selectedUser, ...submitData });
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = !search || 
      u.nome?.toLowerCase().includes(search.toLowerCase()) || 
      u.email?.toLowerCase().includes(search.toLowerCase());
    
    const matchesProfile = profileFilter === 'todos' || 
      u.perfil === profileFilter;
      
    return matchesSearch && matchesProfile;
  });

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
            <Input
              placeholder="Pesquisar utilizadores..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 w-64 h-9 text-xs bg-muted/20 border-border"
            />
          </div>

          <Select value={profileFilter} onValueChange={setProfileFilter}>
            <SelectTrigger className="w-40 h-9 text-[10px] font-bold uppercase tracking-widest bg-muted/20 border-border">
              <SelectValue placeholder="Filtrar Perfil" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Perfis</SelectItem>
              <SelectItem value="Administrador">Administradores</SelectItem>
              <SelectItem value="Gestor">Gestores</SelectItem>
              <SelectItem value="Técnico">Técnicos</SelectItem>
              <SelectItem value="Cliente">Clientes</SelectItem>
            </SelectContent>
          </Select>

          <RefreshButton onClick={fetchUsers} loading={loading} />
          <div className="hidden md:flex items-center gap-2 px-3 h-9 border border-border rounded-md bg-muted/10">
            <UserIcon size={12} className="text-muted-foreground" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{filteredUsers.length} Contas Ativas</span>
          </div>
        </div>
        {canManageUsers(currentUser.perfil) && (
          <Button
            onClick={handleNewUser}
            className="h-9 gap-2 text-xs font-bold"
          >
            <Plus size={16} />
            Novo Utilizador
          </Button>
        )}
      </div>

      {/* Roles Summary - Minimalist */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Administradores', count: users.filter(u => u.perfil === 'Administrador').length, variant: 'destructive' },
          { label: 'Gestores', count: users.filter(u => u.perfil === 'Gestor').length, variant: 'default' },
          { label: 'Técnicos', count: users.filter(u => u.perfil === 'Técnico').length, variant: 'secondary' },
          { label: 'Clientes', count: users.filter(u => u.perfil === 'Cliente').length, variant: 'outline' },
        ].map((role, i) => (
          <Card key={i} className="shadow-none border-border">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{role.label}</p>
                <p className="text-xl font-bold mt-0.5">{role.count}</p>
              </div>
              <Badge variant={role.variant as any} className="h-2 w-2 rounded-full p-0" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card className="shadow-none border-border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[10px] uppercase font-bold h-10">Utilizador</TableHead>
              <TableHead className="text-[10px] uppercase font-bold h-10">Perfil / Acesso</TableHead>
              <TableHead className="text-[10px] uppercase font-bold h-10">Status</TableHead>
              <TableHead className="text-[10px] uppercase font-bold h-10">Último Acesso</TableHead>
              <TableHead className="w-12 text-right h-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-64 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-xs">Sincronizando utilizadores...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedUsers.length > 0 ? (
              paginatedUsers.map((u) => (
                <TableRow 
                    key={u.id} 
                    className="group h-14 cursor-pointer hover:bg-muted/50"
                    onClick={() => handleUserClick(u)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-muted border border-border flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                        <UserIcon size={14} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold truncate">{u.nome}</span>
                        <span className="text-[10px] text-muted-foreground truncate">{u.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPerfilVariant(u.perfil) as any} className="text-[9px] h-4 uppercase font-bold">
                      {u.perfil}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`h-1.5 w-1.5 rounded-full ${u.estado === 'Inativo' ? 'bg-muted-foreground' : 'bg-success'}`}></div>
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">{u.estado || 'Ativo'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-[10px] text-muted-foreground font-medium">
                    {u.ultimo_acesso ? safeFormat(u.ultimo_acesso, 'dd MMM, HH:mm') : 'Nunca acedeu'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/30 group-hover:text-foreground">
                          <MoreVertical size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 text-xs">
                        <DropdownMenuLabel>Gestão de Conta</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => handleEdit(u, e)}>
                          <Settings size={14} className="mr-2" /> Editar Perfil
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleResetPassword(u)}>
                          <Key size={14} className="mr-2" /> Resetar Password
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(u)}>
                          <UserMinus size={14} className="mr-2" /> Revogar Acesso
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-64 text-center text-muted-foreground italic text-xs">
                   Nenhum utilizador encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Pagination
        currentPage={currentPage}
        totalItems={filteredUsers.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />

      {/* User Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Utilizador' : 'Novo Utilizador'}</DialogTitle>
            <DialogDescription>Configure as credenciais e nível de acesso ao ecossistema.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Nome Completo</Label>
              <Input
                required
                value={formData.nome}
                onChange={e => setFormData({ ...formData, nome: e.target.value })}
                placeholder="ex: João Silva"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Email / Login</Label>
              <Input
                required
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="joao.silva@empresa.com"
              />
            </div>
            {!editingId && (
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Password Inicial</Label>
                <Input
                  required
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Perfil de Acesso</Label>
              <Select 
                value={formData.perfil} 
                onValueChange={val => setFormData({ ...formData, perfil: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Administrador">Administrador</SelectItem>
                  <SelectItem value="Gestor">Gestor</SelectItem>
                  <SelectItem value="Técnico">Técnico</SelectItem>
                  <SelectItem value="Cliente">Cliente</SelectItem>
                  <SelectItem value="Visualizador">Visualizador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Separator className="my-2" />
            
            <DialogFooter className="gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={submitting} className="flex-1 font-bold">
                {submitting ? 'A processar...' : 'Guardar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* User Detail BI Sheet */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent side="right" className="p-0 border-l border-border bg-card/95 backdrop-blur-sm sm:max-w-xl md:max-w-2xl overflow-hidden flex flex-col">
          <SheetHeader className="p-8 pb-4 space-y-4 shrink-0">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                    <UserIcon size={32} />
                    </div>
                    <div className="flex-1 space-y-1">
                    <SheetTitle className="text-2xl font-bold tracking-tight">{selectedUser?.nome}</SheetTitle>
                    <div className="flex items-center gap-3">
                        <Badge variant={getPerfilVariant(selectedUser?.perfil) as any} className="text-[10px] font-bold uppercase tracking-wider">
                            {selectedUser?.perfil}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail size={12} /> {selectedUser?.email}
                        </span>
                    </div>
                    </div>
                </div>
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 px-4 text-[10px] font-bold uppercase tracking-widest gap-2 hover:bg-primary hover:text-primary-foreground transition-all"
                    onClick={handleExportBI}
                    disabled={activityLoading || !userActivity}
                >
                    <Download size={14} /> Baixar BI
                </Button>
             </div>
          </SheetHeader>

          <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
             <TabsList className="px-8 bg-transparent border-b border-border rounded-none h-12 gap-6">
                <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-0 text-[10px] font-bold uppercase tracking-[0.2em] h-12">
                   Visão Geral
                </TabsTrigger>
                <TabsTrigger value="activity" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-0 text-[10px] font-bold uppercase tracking-[0.2em] h-12">
                   Atividade BI
                </TabsTrigger>
                <TabsTrigger value="tasks" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-0 text-[10px] font-bold uppercase tracking-[0.2em] h-12">
                   Responsabilidades
                </TabsTrigger>
             </TabsList>

             <ScrollArea className="flex-1">
                <div className="p-8 pt-6">
                   <TabsContent value="overview" className="mt-0 space-y-6">
                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-4">
                         <Card className="bg-muted/30 border-none shadow-none">
                            <CardContent className="p-4">
                               <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Compliance SLA</p>
                               <div className="mt-2 flex items-end justify-between">
                                  <span className="text-2xl font-bold">{userActivity?.stats?.compliance || 0}%</span>
                                  <TrendingUp size={16} className="text-success mb-1" />
                                </div>
                                <Progress value={userActivity?.stats?.compliance || 0} className="h-1.5 mt-3 bg-primary/10" />
                            </CardContent>
                         </Card>
                         <Card className="bg-muted/30 border-none shadow-none">
                            <CardContent className="p-4">
                               <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Incidentes Resolvidos</p>
                               <div className="mt-2 flex items-end justify-between">
                                  <span className="text-2xl font-bold">{userActivity?.stats?.totalResolved || 0}</span>
                                  <span className="text-xs text-muted-foreground mb-1">de {userActivity?.stats?.totalAssigned || 0}</span>
                                </div>
                                <div className="flex gap-1 mt-3">
                                   {Array.from({ length: 12 }).map((_, i) => (
                                      <div key={i} className={`h-1 flex-1 rounded-full ${i < (userActivity?.stats?.totalResolved || 0) ? 'bg-primary' : 'bg-primary/10'}`} />
                                   ))}
                                </div>
                            </CardContent>
                         </Card>
                      </div>

                      {/* Timeline Preview */}
                      <div className="space-y-4">
                         <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Clock size={12} /> Últimas Ações Registadas
                         </h3>
                         <div className="space-y-4">
                            {activityLoading ? (
                               <div className="space-y-3">
                                  {[1, 2, 3].map(i => <div key={i} className="h-16 w-full bg-muted/30 rounded-lg animate-pulse" />)}
                               </div>
                            ) : userActivity?.actions?.length > 0 ? (
                               userActivity.actions.slice(0, 5).map((action: any) => (
                                  <div key={action.id} className="relative pl-6 border-l border-border pb-4 last:pb-0">
                                     <div className="absolute left-[-5px] top-1 h-2 w-2 rounded-full bg-primary" />
                                     <p className="text-xs font-semibold">{action.descricao_acao}</p>
                                     <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-2">
                                        <History size={10} /> {safeFormat(action.created_at, 'dd MMM, HH:mm')} — {action.incident_desc}
                                     </p>
                                  </div>
                               ))
                            ) : (
                               <p className="text-xs text-muted-foreground italic text-center py-8">Sem histórico de ações recente.</p>
                            )}
                         </div>
                      </div>
                   </TabsContent>

                   <TabsContent value="activity" className="mt-0">
                      <div className="space-y-4">
                         {userActivity?.incidents?.length > 0 ? (
                            <Table>
                               <TableHeader>
                                  <TableRow>
                                     <TableHead className="text-[10px] uppercase font-bold px-0">Incidente</TableHead>
                                     <TableHead className="text-[10px] uppercase font-bold">Estado</TableHead>
                                     <TableHead className="text-[10px] uppercase font-bold text-right">Data</TableHead>
                                  </TableRow>
                               </TableHeader>
                               <TableBody>
                                  {userActivity.incidents.map((inc: any) => (
                                     <TableRow key={inc.id} className="hover:bg-transparent px-0 border-border/50">
                                        <TableCell className="px-0 py-3">
                                           <div className="flex flex-col">
                                              <span className="text-xs font-semibold">{inc.categoria}</span>
                                              <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">{inc.descricao}</span>
                                           </div>
                                        </TableCell>
                                        <TableCell>
                                           <Badge variant="outline" className="text-[8px] h-4 font-bold uppercase">
                                              {inc.estado}
                                           </Badge>
                                        </TableCell>
                                        <TableCell className="text-right text-[10px] text-muted-foreground font-medium">
                                           {safeFormat(inc.created_at, 'dd/MM/yy')}
                                        </TableCell>
                                     </TableRow>
                                  ))}
                               </TableBody>
                            </Table>
                         ) : (
                            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground border border-dashed border-border rounded-xl bg-muted/5">
                               <Activity size={24} className="mb-2 opacity-50" />
                               <p className="text-xs font-medium">Nenhum incidente vinculado</p>
                            </div>
                         )}
                      </div>
                   </TabsContent>

                   <TabsContent value="tasks" className="mt-0">
                      <div className="grid gap-4">
                         <div className="space-y-3">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Manutenções Atribuídas</h4>
                            {userActivity?.plans?.length > 0 ? (
                               userActivity.plans.map((p: any) => (
                                  <div key={p.id} className="p-4 rounded-lg bg-muted/20 border border-border flex items-center justify-between">
                                     <div>
                                        <p className="text-xs font-bold">{p.tipo}</p>
                                        <p className="text-[10px] text-muted-foreground">{p.asset_name}</p>
                                     </div>
                                     <Badge variant="outline" className="font-bold text-[8px] h-4 uppercase">{p.estado}</Badge>
                                  </div>
                               ))
                            ) : (
                               <p className="text-xs text-muted-foreground italic">Sem planos de manutenção atribuídos.</p>
                            )}
                         </div>

                         <Separator />

                         <div className="space-y-3">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Inspeções Realizadas</h4>
                            {userActivity?.inspections?.length > 0 ? (
                               userActivity.inspections.map((i: any) => (
                                  <div key={i.id} className="p-4 rounded-lg bg-muted/20 border border-border">
                                     <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-bold">{i.asset_name}</p>
                                        <Badge className="bg-success/20 text-success border-none text-[8px] h-4 uppercase">{i.condicao_geral}</Badge>
                                     </div>
                                     <p className="text-[10px] text-muted-foreground line-clamp-2">{i.observacoes || 'Sem observações detalhadas.'}</p>
                                     <p className="text-[9px] font-bold text-muted-foreground mt-2 uppercase tracking-tight italic">
                                        {safeFormat(i.data_inspecao, 'dd MMMM yyyy')}
                                     </p>
                                  </div>
                               ))
                            ) : (
                               <p className="text-xs text-muted-foreground italic">Nenhuma inspeção registada.</p>
                            )}
                         </div>
                      </div>
                   </TabsContent>
                </div>
             </ScrollArea>
             
             <div className="p-8 pt-4 border-t border-border flex items-center justify-between bg-muted/5">
                 <div className="flex items-center gap-2">
                    <UserCircle size={14} className="text-muted-foreground" />
                    <span className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">Membro Nexo desde {safeFormat(selectedUser?.created_at || new Date().toISOString(), 'MMM yyyy')}</span>
                 </div>
                 <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest gap-2" onClick={(e) => handleEdit(selectedUser, e)}>
                    <Settings size={12} /> Configurar Acesso
                 </Button>
             </div>
          </Tabs>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Safe date formatter
const safeFormat = (dateStr: string | null | undefined, fmt: string) => {
  if (!dateStr) return '—';
  try {
    const d = parseISO(dateStr);
    if (!isValid(d)) return '—';
    return format(d, fmt, { locale: ptBR });
  } catch { return '—'; }
};

const handleResetPassword = async (user: any) => {
  const newPass = window.prompt(`Defina a nova senha temporária para ${user.nome}:`, 'Nexo@2025');
  if (!newPass) return;
  try {
    const res = await fetch(`/api/users/${user.id}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${(sessionStorage.getItem('token') || localStorage.getItem('token'))}` },
      body: JSON.stringify({ newPassword: newPass }),
    });
    if (res.ok) alert('Senha resetada com sucesso');
  } catch (e) { console.error(e); }
};
