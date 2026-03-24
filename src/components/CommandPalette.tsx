import React, { useState, useEffect, useRef } from 'react';
import { Search, Building2, Cpu, AlertCircle, X, ArrowRight, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string, id?: string) => void;
  properties: any[];
  assets: any[];
  incidents: any[];
}

export function CommandPalette({ isOpen, onClose, onNavigate, properties, assets, incidents }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const filteredProperties = properties.filter(p => 
    p.nome?.toLowerCase().includes(query.toLowerCase()) || 
    p.endereco?.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 3);

  const filteredAssets = assets.filter(a => 
    a.nome?.toLowerCase().includes(query.toLowerCase()) || 
    a.tag?.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 3);

  const filteredIncidents = incidents.filter(i => 
    i.titulo?.toLowerCase().includes(query.toLowerCase()) || 
    i.id?.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 3);

  const results = [
    ...filteredProperties.map(p => ({ type: 'property', id: p.id, label: p.nome, sub: p.endereco, icon: Building2, tab: 'properties' })),
    ...filteredAssets.map(a => ({ type: 'asset', id: a.id, label: a.nome, sub: a.tag, icon: Cpu, tab: 'assets' })),
    ...filteredIncidents.map(i => ({ type: 'incident', id: i.id, label: i.titulo, sub: `INC-${i.id.substring(0,6)}`, icon: AlertCircle, tab: 'incidents' }))
  ];

  const handleSelect = (item: any) => {
    onNavigate(item.tab, item.id);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        className="bg-[#09090b] w-full max-w-xl rounded-xl border border-zinc-800 shadow-2xl overflow-hidden relative"
      >
        <div className="flex items-center px-4 py-3 border-b border-zinc-800">
          <Search size={18} className="text-zinc-500 mr-3" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Procurar propriedades, ativos, incidentes..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-zinc-100 placeholder:text-zinc-600"
          />
          <div className="flex items-center gap-1 ml-2">
             <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-400 font-mono">ESC</kbd>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {query.length === 0 && results.length === 0 && (
            <div className="p-8 text-center">
               <Zap size={24} className="mx-auto text-zinc-700 mb-3" />
               <p className="text-xs text-zinc-500">Comece a digitar para pesquisar em todo o Nexo SGFM</p>
            </div>
          )}

          {results.length > 0 ? (
            <div className="space-y-1">
              {results.map((item, idx) => (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                    selectedIndex === idx ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900'
                  }`}
                >
                  <div className={`p-2 rounded-md ${selectedIndex === idx ? 'bg-primary text-primary-foreground' : 'bg-zinc-900 border border-zinc-800'}`}>
                    <item.icon size={16} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-bold truncate">{item.label}</p>
                    <p className="text-[10px] opacity-60 truncate">{item.sub}</p>
                  </div>
                  <ArrowRight size={14} className={`opacity-0 transition-opacity ${selectedIndex === idx ? 'opacity-100' : ''}`} />
                </button>
              ))}
            </div>
          ) : query.length > 0 && (
            <div className="p-8 text-center text-zinc-500 italic text-xs">
              Nenhum resultado encontrado para "{query}"
            </div>
          )}
        </div>

        <div className="p-3 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-between text-[10px] text-zinc-500 uppercase font-black tracking-widest">
           <div className="flex gap-4">
              <span className="flex items-center gap-1"><span className="px-1 py-0.5 rounded bg-zinc-800 border border-zinc-700">↵</span> Selecionar</span>
              <span className="flex items-center gap-1"><span className="px-1 py-0.5 rounded bg-zinc-800 border border-zinc-700">↑↓</span> Navegar</span>
           </div>
           <span>Nexo Global Search</span>
        </div>
      </motion.div>
    </div>
  );
}
