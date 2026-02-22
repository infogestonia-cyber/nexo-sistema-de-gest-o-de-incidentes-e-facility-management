import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Building2,
  Wrench,
  AlertCircle,
  Calendar,
  Users as UsersIcon,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  ChevronRight,
  ShieldCheck,
  Activity,
  Cpu,
  Settings,
  Sun,
  Moon,
  FileText
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

import { canManageUsers, canViewReports } from './utils/permissions';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null);
  const [propertyFilter, setPropertyFilter] = useState<number | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light';
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('light', savedTheme === 'light');
    }
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser && token) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      connectSocket(parsedUser);
      fetchNotifications();
    }
    return () => disconnectSocket();
  }, [token]);

  useEffect(() => {
    socket.on('notification', (notif) => {
      if (user && notif.userId === user.id) {
        setNotifications(prev => [notif, ...prev]);
      }
    });
    return () => {
      socket.off('notification');
    };
  }, [user]);

  const fetchNotifications = async () => {
    const res = await fetch('/api/notifications', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json();
    setNotifications(data);
  };

  const markNotificationsRead = async () => {
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    setNotifications(prev => prev.map(n => ({ ...n, lida: 1 })));
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

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  const navItems = [
    { id: 'dashboard', label: 'Centro de Comando', icon: LayoutDashboard },
    { id: 'properties', label: 'Portfólio de Ativos', icon: Building2 },
    { id: 'incidents', label: 'Matriz de Incidentes', icon: AlertCircle },
    { id: 'assets', label: 'Gémeos Digitais', icon: Cpu },
    { id: 'maintenance', label: 'Plano de Manutenção', icon: Wrench },
    { id: 'planning', label: 'Roteiro Estratégico', icon: Calendar },
    { id: 'reports', label: 'Centro de Relatórios', icon: FileText, permission: canViewReports },
    { id: 'users', label: 'Acesso ao Sistema', icon: UsersIcon, permission: canManageUsers },
  ];

  return (
    <div className="min-h-screen bg-brand-bg flex font-sans text-gray-300 selection:bg-emerald-500/30 overflow-hidden">
      {/* Premium Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 240 : 80 }}
        className="bg-brand-surface border-r border-brand-border flex flex-col sticky top-0 h-screen z-50 shrink-0"
      >
        <div className="p-4 flex items-center justify-between">
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2"
            >
              <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <ShieldCheck className="text-white w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-sm tracking-tight block leading-none text-white">Nexo</span>
                <span className="text-[8px] uppercase tracking-[0.15em] text-emerald-500 font-bold">SGFM - Sistema de Gestão</span>
              </div>
            </motion.div>
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-gray-500 hover:text-white"
          >
            {isSidebarOpen ? <X size={14} /> : <Menu size={14} />}
          </button>
        </div>

        <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            if (item.permission && !item.permission(user?.perfil)) return null;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSelectedIncidentId(null);
                }}
                className={`sidebar-item w-full ${isActive ? 'active' : ''} ${!isSidebarOpen ? 'justify-center px-0' : ''}`}
                title={item.label}
              >
                <item.icon size={16} />
                {isSidebarOpen && <span className="font-medium text-[12px] tracking-wide">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-brand-border">
          <div className={`flex items-center gap-2 p-2 rounded-xl bg-white/5 mb-2 ${!isSidebarOpen && 'justify-center'}`}>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold shadow-lg text-[10px]">
              {user?.nome?.charAt(0)}
            </div>
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold truncate text-white leading-tight">{user?.nome}</p>
                <div className="flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[8px] uppercase font-bold text-gray-500 tracking-wider">{user?.perfil}</span>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className={`sidebar-item w-full text-red-400 hover:bg-red-400/5 hover:text-red-400 py-1.5 ${!isSidebarOpen ? 'justify-center px-0' : ''}`}
          >
            <LogOut size={16} />
            {isSidebarOpen && <span className="font-medium text-[12px]">Terminar Sessão</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="h-12 border-b border-brand-border flex items-center justify-between px-6 shrink-0 relative z-10 bg-brand-surface/50 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <h1 className="text-xs font-bold tracking-tight text-white">
              {selectedIncidentId ? 'Protocolo de Incidente' : navItems.find(i => i.id === activeTab)?.label}
            </h1>
            <div className="h-3 w-px bg-brand-border"></div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Estado:</span>
              <span className="text-[9px] font-mono text-emerald-500 uppercase tracking-widest font-bold">Operacional</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600 w-3 h-3" />
              <input
                type="text"
                placeholder="Pesquisa Global..."
                className="bg-white/5 border border-brand-border rounded-lg pl-8 pr-3 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-emerald-500/30 w-48 transition-all"
              />
            </div>
            <button
              onClick={toggleTheme}
              className="p-1.5 text-gray-400 hover:text-white transition-colors"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div className="relative">
              <button
                onClick={() => {
                  setIsNotifOpen(!isNotifOpen);
                  if (!isNotifOpen) markNotificationsRead();
                }}
                className="p-1.5 text-gray-400 hover:text-white transition-colors relative group"
              >
                <Bell size={16} />
                {notifications.some(n => !n.lida) && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-500 rounded-full border border-brand-surface"></span>
                )}
              </button>

              <AnimatePresence>
                {isNotifOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsNotifOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-80 bg-brand-surface border border-brand-border rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-brand-border flex items-center justify-between bg-white/[0.02]">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Notificações</span>
                        <span className="text-[8px] font-mono text-emerald-500 uppercase tracking-widest">Tempo Real</span>
                      </div>
                      <div className="max-h-96 overflow-y-auto custom-scrollbar">
                        {notifications.length > 0 ? notifications.map((n, i) => (
                          <div key={i} className={`p-4 border-b border-brand-border last:border-0 hover:bg-white/[0.02] transition-colors ${!n.lida ? 'bg-emerald-500/[0.02]' : ''}`}>
                            <div className="flex items-start gap-3">
                              <div className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${!n.lida ? 'bg-emerald-500' : 'bg-gray-700'}`}></div>
                              <div>
                                <p className="text-[11px] font-bold text-white mb-0.5">{n.titulo}</p>
                                <p className="text-[10px] text-gray-500 leading-relaxed">{n.mensagem}</p>
                              </div>
                            </div>
                          </div>
                        )) : (
                          <div className="p-8 text-center opacity-20">
                            <Bell size={24} className="mx-auto mb-2" />
                            <p className="text-[10px] font-bold uppercase tracking-widest">Sem notificações</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <div className="h-3 w-px bg-brand-border"></div>
            <div className="flex items-center gap-2 text-gray-500">
              <span className="text-[9px] font-mono">v2.5.0</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 relative z-10 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + (selectedIncidentId || '')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {selectedIncidentId ? (
                <IncidentDetail id={selectedIncidentId} onBack={() => setSelectedIncidentId(null)} />
              ) : (
                activeTab === 'dashboard' ? <Dashboard onSelectIncident={setSelectedIncidentId} /> :
                  activeTab === 'properties' ? <Properties onSelectProperty={(id) => { setPropertyFilter(id); setActiveTab('assets'); }} /> :
                    activeTab === 'incidents' ? <Incidents onSelectIncident={setSelectedIncidentId} /> :
                      activeTab === 'assets' ? <Assets propertyId={propertyFilter} onClearFilter={() => setPropertyFilter(null)} /> :
                        activeTab === 'maintenance' ? <Maintenance /> :
                          activeTab === 'planning' ? <Planning5Y /> :
                            activeTab === 'reports' ? <Reports /> :
                              activeTab === 'users' ? <Users /> : <Dashboard onSelectIncident={setSelectedIncidentId} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
