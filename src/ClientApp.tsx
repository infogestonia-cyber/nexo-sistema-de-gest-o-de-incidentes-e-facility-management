import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { LayoutDashboard, FileText, Cpu, PlusCircle, LogOut, ShieldCheck } from 'lucide-react';
import { api } from './services/api';
import ClientLogin from './components/cliente/ClientLogin';
import ClientDashboard from './components/cliente/ClientDashboard';
import ClientOrders from './components/cliente/ClientOrders';
import ClientAssets from './components/cliente/ClientAssets';
import ClientNewRequest from './components/cliente/ClientNewRequest';
import ClientMap from './components/cliente/ClientMap';

type Tab = 'dashboard' | 'ordens' | 'ativos' | 'novo' | 'mapa';

const NAV = [
  { id: 'dashboard' as Tab, icon: LayoutDashboard, label: 'Início' },
  { id: 'ordens' as Tab, icon: FileText, label: 'Ordens' },
  { id: 'ativos' as Tab, icon: Cpu, label: 'Ativos' },
  { id: 'mapa' as Tab, icon: LayoutDashboard, label: 'Mapa' }, // Reusing an icon for Map since lucide Map icon isn't imported here
  { id: 'novo' as Tab, icon: PlusCircle, label: 'Pedido' },
];

export default function ClientApp() {
  const [cliente, setCliente] = useState<any>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('cliente_token'));
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isValidating, setIsValidating] = useState(!!localStorage.getItem('cliente_token'));
  const [isSyncing, setIsSyncing] = useState(false);

  React.useEffect(() => {
    const savedToken = localStorage.getItem('cliente_token');
    const savedCliente = localStorage.getItem('cliente_user');

    if (savedToken && savedCliente) {
      setToken(savedToken);
      setCliente(JSON.parse(savedCliente));
    }
    setIsValidating(false);
  }, []);

  const handleLogin = async (clienteData: any, clienteToken: string) => {
    setIsSyncing(true);
    setToken(clienteToken);
    localStorage.setItem('cliente_token', clienteToken);
    localStorage.setItem('cliente_user', JSON.stringify(clienteData));
    setCliente(clienteData);
    setIsSyncing(false);
  };

  const handleLogout = () => {
    setCliente(null);
    setToken(null);
    localStorage.removeItem('cliente_user');
    localStorage.removeItem('cliente_token');
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

  if (!cliente || !token) {
    return <ClientLogin onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#080d18] flex flex-col max-w-md mx-auto relative overflow-hidden">
      {/* Mesh Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] bg-emerald-500/5 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-blue-500/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 pt-safe-top pt-6 pb-4 border-b border-white/5 flex-shrink-0 relative z-20 bg-[#080d18]/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 font-black shadow-lg shadow-emerald-500/10">
            {cliente.nome?.charAt(0)}
          </div>
          <div>
            <p className="text-[10px] font-black text-emerald-500/50 uppercase tracking-[0.2em] leading-none mb-1">Portal do Cliente</p>
            <p className="text-sm font-black text-white tracking-tight">{cliente.nome}</p>
          </div>
        </div>
        <button 
          onClick={handleLogout} 
          className="p-2.5 bg-white/5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all border border-white/5 active:scale-95"
        >
          <LogOut size={16} />
        </button>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-hidden relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="h-full flex flex-col"
          >
            {activeTab === 'dashboard' && <ClientDashboard cliente={cliente} onNavigate={setActiveTab} />}
            {activeTab === 'ordens' && <ClientOrders />}
            {activeTab === 'ativos' && <ClientAssets />}
            {activeTab === 'mapa' && <ClientMap />}
            {activeTab === 'novo' && <ClientNewRequest />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#0a0f1a]/80 backdrop-blur-2xl border-t border-white/5 px-4 pt-3 pb-safe-bottom pb-5 flex items-center justify-around z-50">
        {NAV.map(({ id, icon: Icon, label }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex flex-col items-center gap-1.5 px-2 py-1 relative group"
            >
              <div className={`p-2.5 transition-all duration-300 relative ${active ? 'text-emerald-400' : 'text-gray-500 group-hover:text-gray-300'}`}>
                {active && (
                  <motion.div 
                    layoutId="nav-bg"
                    className="absolute inset-0 bg-emerald-500/10 border border-emerald-500/20"
                  />
                )}
                <Icon size={20} className="relative z-10" />
              </div>
              <span className={`text-[9px] font-black uppercase tracking-widest transition-colors duration-300 ${active ? 'text-emerald-400' : 'text-gray-600 group-hover:text-gray-400'}`}>
                {label}
              </span>
              {active && (
                <motion.div 
                  layoutId="nav-indicator" 
                  className="absolute -top-3 w-6 h-0.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
