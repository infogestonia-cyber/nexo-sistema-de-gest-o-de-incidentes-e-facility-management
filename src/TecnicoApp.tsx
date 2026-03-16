import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    LayoutDashboard,
    AlertCircle,
    Wrench,
    Package,
    Scan,
    LogOut,
    ShieldCheck
} from 'lucide-react';
import { api } from './services/api';
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
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
    const [isValidating, setIsValidating] = useState(!!localStorage.getItem('token'));
    const [isSyncing, setIsSyncing] = useState(false);

    React.useEffect(() => {
        const savedToken = localStorage.getItem('token');
        if (savedToken) {
            const validateSession = async () => {
                try {
                    const data = await api.get('/api/me');
                    setUser(data.user);
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
    }, [token]);

    const handleLogin = async (userData: any, userToken: string) => {
        setIsSyncing(true);
        setToken(userToken);
        localStorage.setItem('token', userToken);
        
        try {
            // Secure Handshake stabilization
            const data = await api.get('/api/me');
            setUser(data.user);
            localStorage.setItem('user', JSON.stringify(data.user));
        } catch (e) {
            handleLogout();
        } finally {
            setIsSyncing(false);
        }
    };

    const handleLogout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    };

    if (isValidating || isSyncing) {
        return (
            <div className="min-h-screen bg-[#080d18] flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/5 rounded-none blur-[120px] animate-pulse"></div>
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
        <div className="min-h-screen bg-[#080d18] flex flex-col max-w-md mx-auto relative overflow-hidden">
            {/* Top bar */}
            <div className="flex items-center justify-between px-5 pt-safe-top pt-5 pb-4 border-b border-white/5 flex-shrink-0 bg-[#080d18]/80 backdrop-blur-xl z-20">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-none bg-emerald-500 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/20">
                        {user.nome?.charAt(0) || 'T'}
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest leading-none">Portal do Técnico</p>
                        <p className="text-sm font-black text-white mt-0.5">{user.nome}</p>
                    </div>
                </div>
                <button onClick={handleLogout} className="p-2 rounded-none bg-white/5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                    <LogOut size={16} />
                </button>
            </div>

            {/* Content */}
            <main className="flex-1 overflow-y-auto custom-scrollbar pb-28 relative z-10">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab + (selectedIncidentId || '')}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="p-4"
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
            <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#0a0f1a]/95 backdrop-blur-xl border-t border-white/8 px-2 pt-3 pb-safe-bottom pb-4 flex items-center justify-around z-50">
                {NAV.map(({ id, icon: Icon, label }) => {
                    const active = activeTab === id;
                    return (
                        <button
                            key={id}
                            onClick={() => {
                                setActiveTab(id);
                                setSelectedIncidentId(null);
                            }}
                            className="flex flex-col items-center gap-1 flex-1 relative"
                        >
                            <div className={`p-2 rounded-none transition-all ${active ? 'bg-emerald-500/15' : ''}`}>
                                <Icon size={20} className={active ? 'text-emerald-400' : 'text-gray-600'} />
                            </div>
                            <span className={`text-[8px] font-black uppercase tracking-wider transition-all ${active ? 'text-emerald-400' : 'text-gray-700'}`}>
                                {label}
                            </span>
                            {active && (
                                <motion.div layoutId="nav-indicator-tecnico" className="absolute -top-1 w-6 h-0.5 bg-emerald-500 rounded-none" />
                            )}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}
