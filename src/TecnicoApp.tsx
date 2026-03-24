import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    LayoutDashboard,
    AlertCircle,
    Wrench,
    Package,
    Scan,
    LogOut,
    ShieldCheck,
    Bell
} from 'lucide-react';
import { api } from './services/api';
import socket, { connectSocket, disconnectSocket } from './services/socketService';
import { useNotifications } from './hooks/useNotifications';
import { NotificationBell } from './components/ui/NotificationBell';
import Login from './components/Login';
import TecnicoDashboard from './components/tecnico/TecnicoDashboard';
import TecnicoIncidents from './components/tecnico/TecnicoIncidents';
import TecnicoMaintenance from './components/tecnico/TecnicoMaintenance';
import TecnicoInventory from './components/tecnico/TecnicoInventory';
import AssetScanner from './components/AssetScanner';

type Tab = 'dashboard' | 'incidents' | 'maintenance' | 'inventory' | 'scanner';

const NAV = [
    { id: 'dashboard' as Tab, icon: LayoutDashboard, label: 'Início' },
    { id: 'incidents' as Tab, icon: AlertCircle, label: 'Tarefas' },
    { id: 'maintenance' as Tab, icon: Wrench, label: 'Manutenção' },
    { id: 'inventory' as Tab, icon: Package, label: 'Stock' },
    { id: 'scanner' as Tab, icon: Scan, label: 'Scan' },
];

export default function TecnicoApp() {
    const [user, setUser] = useState<any>(null);
    const [token, setToken] = useState<string | null>((sessionStorage.getItem('token') || localStorage.getItem('token')));
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
    const [isValidating, setIsValidating] = useState(!!(sessionStorage.getItem('token') || localStorage.getItem('token')));
    const [isSyncing, setIsSyncing] = useState(false);
    const { notifications, isOpen: isNotifOpen, setIsOpen: setIsNotifOpen, markAsRead: markNotificationsRead } = useNotifications(user);

    useEffect(() => {
        // Ensure dark mode is applied for consistent system look
        document.documentElement.classList.add('dark');
        // Mobile viewport height fix for some browsers
        const setAppHeight = () => {
            document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
        };
        window.addEventListener('resize', setAppHeight);
        setAppHeight();
        return () => window.removeEventListener('resize', setAppHeight);
    }, []);

    React.useEffect(() => {
        const savedToken = (sessionStorage.getItem('token') || localStorage.getItem('token'));
        if (savedToken) {
            const validateSession = async () => {
                try {
                    const data = await api.get('/api/me');
                    setUser(data.user);
                    connectSocket(data.user);
                } catch (e) {
                    console.warn('Invalid technician session', e);
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

    const handleLogin = (userData: any, userToken: string) => {
        // Clear EVERYTHING first to avoid stale token conflicts
        const keys = ['token', 'user', 'cliente_token', 'cliente_user'];
        keys.forEach(k => {
            localStorage.removeItem(k);
            sessionStorage.removeItem(k);
        });

        localStorage.setItem('token', userToken);
        localStorage.setItem('user', JSON.stringify(userData));
        
        setToken(userToken);
        setUser(userData);
        connectSocket(userData);
    };

    const handleLogout = () => {
        const keys = ['token', 'user', 'cliente_token', 'cliente_user'];
        keys.forEach(k => {
            localStorage.removeItem(k);
            sessionStorage.removeItem(k);
        });
        
        setUser(null);
        setToken(null);
        disconnectSocket();
    };

    if (isValidating || isSyncing) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-none blur-[120px] animate-pulse"></div>
                </div>
                <div className="relative z-10 flex flex-col items-center text-center">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="w-16 h-16 bg-white/5 backdrop-blur-xl border border-white/10 rounded-none flex items-center justify-center mb-6 relative">
                        <div className="absolute inset-0 border border-emerald-500/20 border-t-emerald-500 rounded-none animate-spin"></div>
                        <ShieldCheck size={28} className="text-emerald-500" />
                    </motion.div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[.3em] animate-pulse">Sincronização Segura</p>
                </div>
            </div>
        );
    }

    if (!user || !token) {
        return <Login onLogin={handleLogin} />;
    }

    // Se o utilizador não for técnico nem admin/gestor, talvez devêssemos avisar, 
    // mas vamos assumir que apenas pessoal autorizado acede a esta rota por agora.

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col w-full relative overflow-hidden font-sans dark">
            {/* Top bar */}
            <header className="flex items-center justify-between px-6 pt-safe-top pt-6 pb-4 border-b border-border flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-20 relative">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-primary font-black shadow-lg shadow-primary/10 transition-transform active:scale-95">
                        {user.nome?.charAt(0) || 'T'}
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.25em] leading-none mb-1.5 flex items-center gap-2">
                           <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                           Painel do Técnico
                        </p>
                        <p className="text-base font-bold text-foreground tracking-tight leading-none">{user.nome}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <NotificationBell 
                        notifications={notifications}
                        isOpen={isNotifOpen}
                        onToggle={() => setIsNotifOpen(!isNotifOpen)}
                        onRead={markNotificationsRead}
                        className="p-2.5 bg-secondary text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all border border-border active:scale-95"
                    />
                    <button 
                        onClick={handleLogout} 
                        className="p-2.5 bg-secondary text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-all border border-border active:scale-95"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-hidden relative z-10">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab + (selectedIncidentId || '')}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="h-full flex flex-col p-4 overflow-y-auto custom-scrollbar"
                    >
                        {activeTab === 'dashboard' && <TecnicoDashboard user={user} onNavigate={setActiveTab} onSelectIncident={setSelectedIncidentId} />}
                        {activeTab === 'incidents' && <TecnicoIncidents onSelectIncident={setSelectedIncidentId} />}
                        {activeTab === 'maintenance' && <TecnicoMaintenance />}
                        {activeTab === 'inventory' && <TecnicoInventory />}
                        {activeTab === 'scanner' && <AssetScanner onSelectAsset={(a) => { setActiveTab('incidents'); }} />}
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Bottom nav */}
            <nav className="fixed bottom-0 left-0 right-0 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border px-2 pt-3 pb-safe-bottom pb-5 flex items-center justify-around z-50">
                {NAV.map(({ id, icon: Icon, label }) => {
                    const active = activeTab === id;
                    return (
                        <button
                            key={id}
                            onClick={() => {
                                setActiveTab(id);
                                setSelectedIncidentId(null);
                            }}
                            className="flex flex-col items-center gap-1.5 flex-1 relative group"
                        >
                            <div className={`p-2.5 transition-all duration-300 relative ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}>
                                {active && (
                                  <motion.div 
                                    layoutId="nav-bg-tecnico"
                                    className="absolute inset-0 bg-primary/10 border border-primary/20"
                                  />
                                )}
                                <Icon size={20} className="relative z-10" />
                            </div>
                            <span className={`text-[8px] font-black uppercase tracking-[0.15em] transition-colors duration-300 ${active ? 'text-primary' : 'text-zinc-600 group-hover:text-zinc-400'}`}>
                                {label}
                            </span>
                            {active && (
                                <motion.div 
                                  layoutId="nav-indicator-tecnico" 
                                  className="absolute -top-3 w-6 h-0.5 bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" 
                                />
                            )}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}
