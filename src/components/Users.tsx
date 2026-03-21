import React, { useState, useEffect } from 'react';
import { 
  Plus, User as UserIcon, X, MoreVertical, CheckCircle2, 
  ShieldCheck, Search, Shield, UserCircle, Key, Trash2, 
  Mail, Settings, MoreHorizontal, UserMinus
} from 'lucide-react';
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
        fetch('/api/assets', { headers: { Authorization: `Bearer ${(sessionStorage.getItem('token') || localStorage.getItem('token'))}` } })
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

  const handleEdit = (u: any) => {
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
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter(u => 
    !search ||
    u.nome?.toLowerCase().includes(search.toLowerCase()) || 
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.perfil?.toLowerCase().includes(search.toLowerCase())
  );

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
                <TableRow key={u.id} className="group h-14">
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
                        <DropdownMenuItem onClick={() => handleEdit(u)}>
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
    </div>
  );
}

// Helper for resetting password (not defined in the snippet but referenced in handleResetPassword - added for safety)
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

// Safe date formatter
const safeFormat = (dateStr: string | null | undefined, fmt: string) => {
  if (!dateStr) return '—';
  try {
    const d = parseISO(dateStr);
    if (!isValid(d)) return '—';
    return format(d, fmt, { locale: ptBR });
  } catch { return '—'; }
};
import { parseISO, isValid } from 'date-fns';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
