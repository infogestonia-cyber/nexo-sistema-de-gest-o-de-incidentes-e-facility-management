import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Building2, Wrench, AlertCircle, Calendar,
  Users as UsersIcon, LogOut, Menu, X, Bell, Search, 
  ShieldCheck, Cpu, Settings, Sun, Moon, FileText, Package, Scan
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import socket, { connectSocket, disconnectSocket } from './services/socketService';

// --- Components ---
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Properties from './components/Properties';
import Incidents from './components/Incidents';
import Assets from './components/Assets';
import Planning5Y from './components/Planning5Y';
import IncidentDetail from './components/IncidentDetail';
import Users from './components/Users';
import Maintenance from './components/Maintenance';
import Reports from './components/Reports';
import Inventory from './components/Inventory';
import AssetScanner from './components/AssetScanner';
import Analytics from './components/Analytics';
import SystemSettings from './components/SystemSettings';
import ChangePassword from './components/ChangePassword';

import { api } from './services/api';
import { requestNotificationPermission, showPushNotification } from './utils/notifications';
import { canManageUsers, canViewReports, canManageSettings } from './utils/permissions';

// --- UI components ---
import { Input } from './components/ui/input';
import { Button } from './components/ui/button';
import { Avatar, AvatarFallback } from './components/ui/avatar';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [propertyFilter, setPropertyFilter] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isValidating, setIsValidating] = useState(!!localStorage.getItem('token'));
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light';
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('light', savedTheme === 'light');
    }
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      const validateSession = async () => {
        try {
          const data = await api.get('/api/me');
          setUser(data.user);
          connectSocket(data.user);
          fetchNotifications();
        } catch (e) {
          console.warn('Session invalid or user deleted:', e);
          handleLogout();
        } finally {
          setIsValidating(false);
        }
      };
      validateSession();
    } else {
      setIsValidating(false);
      setUser(null);
    }
    return () => disconnectSocket();
  }, [token]);

  useEffect(() => {
    socket.on('notification', (notif) => {
      if (user && notif.userId === user.id) {
        setNotifications(prev => [notif, ...prev]);
        showPushNotification('Nexo SGFM', notif.mensagem);
      }
    });
    return () => {
      socket.off('notification');
    };
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const data = await api.get('/api/notifications');
      setNotifications(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setNotifications([]);
    }
  };

  const markNotificationsRead = async () => {
    try {
      await api.post('/api/notifications/read');
      setNotifications(prev => prev.map(n => ({ ...n, lida: 1 })));
    } catch (e) {
      console.error('Falha ao marcar notificações como lidas', e);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('light', newTheme === 'light');
  };

  const handleLogin = (userData: any, userToken: string) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('token', userToken);
    localStorage.setItem('user', JSON.stringify(userData));
    connectSocket(userData);
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    disconnectSocket();
  };

  if (isValidating || isSyncing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-20 h-20 bg-card border border-border shadow-sm rounded-xl flex items-center justify-center mb-8 relative overflow-hidden"
          >
            <ShieldCheck size={32} className="text-primary" />
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center space-y-3"
          >
            <h2 className="text-sm font-bold text-foreground tracking-widest uppercase">Estabelecendo Ligação Segura</h2>
            <div className="flex items-center justify-center gap-3">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">Autenticação em Curso</span>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return <Login onLogin={handleLogin} />;
  }

  if (user?.must_change_password) {
    return <ChangePassword />;
  }

  const navGroups = [
    {
      label: 'Geral',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'properties', label: 'Propriedades', icon: Building2 },
        { id: 'assets', label: 'Ativos & Inspecções', icon: Cpu },
        { id: 'incidents', label: 'Incidentes', icon: AlertCircle },
        { id: 'maintenance', label: 'Manutenção', icon: Wrench },
        { id: 'inventory', label: 'Inventário', icon: Package },
      ]
    },
    {
      label: 'Inteligência',
      items: [
        { id: 'analytics', label: 'Indicadores', icon: ShieldCheck },
        { id: 'scanner', label: 'Scanner QR', icon: Scan },
        { id: 'planning', label: 'Roteiro Estratégico', icon: Calendar },
        { id: 'reports', label: 'Relatórios', icon: FileText, permission: canViewReports },
      ]
    },
    {
      label: 'Sistema',
      items: [
        { id: 'users', label: 'Utilizadores', icon: UsersIcon, permission: canManageUsers },
        { id: 'settings', label: 'Configurações', icon: Settings, permission: canManageSettings },
      ]
    }
  ];

  const currentItem = [...navGroups[0].items, ...navGroups[1].items, ...navGroups[2].items].find(i => i.id === activeTab);

  return (
    <div className="min-h-screen bg-background flex font-sans text-foreground overflow-hidden h-screen w-full">
      {/* High-Fidelity Sidebar - Acme Inc. style */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 0 }}
        className={`bg-card border-r border-border flex flex-col sticky top-0 h-screen z-50 shrink-0 overflow-hidden transition-all duration-300 ${!isSidebarOpen && 'hidden md:flex'}`}
      >
        <div className="p-4 flex items-center justify-between h-14 shrink-0 px-6">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary text-primary-foreground shadow-sm">
                <ShieldCheck className="w-5 h-5" />
             </div>
             <div className="flex flex-col">
                <span className="font-bold text-sm tracking-tight">Nexo SGFM</span>
                <span className="text-[10px] text-muted-foreground font-medium truncate w-24">Enterprise Edition</span>
             </div>
          </div>
        </div>

        <div className="px-4 mb-2">
           <Button className="w-full justify-start gap-2 h-9 font-bold text-xs shadow-sm" variant="default">
              <div className="bg-primary-foreground text-primary rounded-sm p-0.5">
                 <X size={10} className="rotate-45" />
              </div>
              Rápido Criar
           </Button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto custom-scrollbar">
          {navGroups.map((group, idx) => (
            <div key={idx} className="space-y-1">
              {isSidebarOpen && <h3 className="px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">{group.label}</h3>}
              {group.items.map((item) => {
                if (item.permission && !item.permission(user?.perfil)) return null;
                const isActive = activeTab === item.id;
                return (
                  <Button
                    key={item.id}
                    variant={isActive ? "secondary" : "ghost"}
                    onClick={() => {
                      setActiveTab(item.id);
                      setSelectedIncidentId(null);
                    }}
                    className={`w-full justify-start h-9 px-2 gap-3 ${isActive ? 'bg-secondary font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-transparent'}`}
                  >
                    <item.icon size={16} className={isActive ? 'text-foreground' : 'text-muted-foreground/70'} />
                    {isSidebarOpen && <span className="text-sm">{item.label}</span>}
                  </Button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-border mt-auto">
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <Avatar className="h-8 w-8 border border-border">
              <AvatarFallback className="text-[10px] font-bold bg-muted uppercase">{(user?.nome || 'U').slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
               <p className="text-xs font-bold truncate leading-none mb-1">{user?.nome}</p>
               <p className="text-[10px] text-muted-foreground truncate">{user?.perfil}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8 text-muted-foreground hover:text-destructive">
               <LogOut size={14} />
            </Button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-6 shrink-0 z-20 sticky top-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="h-8 w-8 md:hidden">
              <Menu size={18} />
            </Button>
            
            {/* Breadcrumb style header */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
               <span>Plataforma</span>
               <span className="text-xs">/</span>
               <span className="text-foreground font-semibold">
                  {selectedIncidentId ? 'Protocolo de Incidente' : currentItem?.label}
               </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden lg:flex items-center">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Busca rápida (Alt+K)"
                className="pl-9 h-8 w-64 bg-muted/30 border-none shadow-none focus-visible:ring-1 focus-visible:ring-border"
              />
            </div>
            
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8 text-muted-foreground hover:text-foreground">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </Button>

            <div className="relative">
              <Button
                variant="ghost" 
                size="icon"
                onClick={() => {
                  setIsNotifOpen(!isNotifOpen);
                  if (!isNotifOpen) markNotificationsRead();
                }}
                className="h-8 w-8 text-muted-foreground hover:text-foreground relative"
              >
                <Bell size={16} />
                {notifications.some(n => !n.lida) && (
                  <span className="absolute top-1.5 right-2 w-2 h-2 bg-primary rounded-full border-2 border-background"></span>
                )}
              </Button>

              <AnimatePresence>
                {isNotifOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsNotifOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-80 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden"
                    >
                      <div className="p-3 border-b border-border flex items-center justify-between bg-muted/30">
                        <span className="text-xs font-semibold text-foreground">Notificações</span>
                      </div>
                      <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                        {notifications.length > 0 ? notifications.map((n, i) => (
                          <div key={i} className={`p-3 border-b border-border last:border-0 hover:bg-muted/50 transition-colors ${!n.lida ? 'bg-primary/5' : ''}`}>
                            <div className="flex items-start gap-3">
                              <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${!n.lida ? 'bg-primary' : 'bg-muted'}`}></div>
                              <div>
                                <p className="text-sm font-medium text-foreground mb-1 leading-none">{n.titulo}</p>
                                <p className="text-xs text-muted-foreground leading-snug">{n.mensagem}</p>
                              </div>
                            </div>
                          </div>
                        )) : (
                          <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                            <Bell size={24} className="mb-3 opacity-20" />
                            <p className="text-sm font-medium">Sem notificações recentes</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            
            <div className="h-4 w-px bg-border mx-1"></div>
            <Button variant="outline" size="sm" className="h-8 text-xs font-bold gap-2">
               <ShieldCheck size={14} />
               Verificar
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 relative z-10 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + (selectedIncidentId || '')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="h-full max-w-[1400px] mx-auto"
            >
              {selectedIncidentId ? (
                <IncidentDetail id={selectedIncidentId} onBack={() => setSelectedIncidentId(null)} />
              ) : (
                activeTab === 'dashboard' ? <Dashboard onSelectIncident={setSelectedIncidentId} /> :
                  activeTab === 'properties' ? <Properties onSelectProperty={(id) => { setPropertyFilter(id); setActiveTab('assets'); }} /> :
                    activeTab === 'incidents' ? <Incidents onSelectIncident={setSelectedIncidentId} /> :
                      activeTab === 'assets' ? <Assets propertyId={propertyFilter} onClearFilter={() => setPropertyFilter(null)} initialAsset={selectedAsset} onClearAsset={() => setSelectedAsset(null)} /> :
                        activeTab === 'maintenance' ? <Maintenance /> :
                          activeTab === 'inventory' ? <Inventory /> :
                              activeTab === 'analytics' ? <Analytics /> :
                                activeTab === 'scanner' ? <AssetScanner onSelectAsset={(a) => { setSelectedAsset(a); setActiveTab('assets'); }} /> :
                                  activeTab === 'planning' ? <Planning5Y /> :
                                    activeTab === 'reports' ? <Reports /> :
                                      activeTab === 'users' ? <Users /> : 
                                        activeTab === 'settings' ? <SystemSettings /> : <Dashboard onSelectIncident={setSelectedIncidentId} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
