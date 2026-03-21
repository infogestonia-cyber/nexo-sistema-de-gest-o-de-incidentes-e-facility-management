import React, { useState } from 'react';
import { 
  Scan, 
  Search, 
  Cpu, 
  ArrowRight,
  Shield,
  Clock,
  Activity,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AssetScanner({ onSelectAsset }: { onSelectAsset: (asset: any) => void }) {
  const [assetId, setAssetId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [foundAsset, setFoundAsset] = useState<any>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetId.trim()) return;
    
    setLoading(true);
    setError(null);
    setFoundAsset(null);
    
    try {
      const res = await fetch(`/api/assets`, {
        headers: { 'Authorization': `Bearer ${(sessionStorage.getItem('token') || localStorage.getItem('token'))}` }
      });
      if (!res.ok) throw new Error('Erro ao carregar ativos');
      const assets = await res.json();
      const asset = Array.isArray(assets) ? assets.find((a: any) => 
        a.id.toString() === assetId || 
        a.nome.toLowerCase().includes(assetId.toLowerCase())
      ) : null;
      
      if (asset) {
        setFoundAsset(asset);
      } else {
        setError('Ativo não encontrado. Verifique o ID ou Nome.');
      }
    } catch (err) {
      setError('Erro ao pesquisar ativo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-8 page-enter pt-10">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-emerald-500 rounded-none mx-auto flex items-center justify-center text-white shadow-xl shadow-emerald-500/20 mb-4">
          <Scan size={32} />
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">Scanner de Ativos</h2>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">Introduza o ID ou Nome para consulta rápida</p>
      </div>

      <form onSubmit={handleSearch} className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Ex: #0001 ou Gerador..."
            value={assetId}
            onChange={(e) => setAssetId(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-brand-surface border border-brand-border rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm text-white shadow-inner"
          />
        </div>
        <button 
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-emerald-500 text-white rounded-none font-bold uppercase tracking-widest text-xs hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50"
        >
          {loading ? 'A pesquisar...' : 'Verificar Ativo'}
        </button>
      </form>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="p-4 bg-red-500/10 border border-red-500/20 rounded-none flex items-center gap-3"
          >
            <AlertCircle size={18} className="text-red-500" />
            <p className="text-xs text-red-500 font-bold">{error}</p>
          </motion.div>
        )}

        {foundAsset && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-brand-surface border border-brand-border overflow-hidden rounded-none shadow-2xl"
          >
            <div className="p-6 bg-emerald-500/5 border-b border-brand-border">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-emerald-500/10 rounded-none text-emerald-500">
                  <Cpu size={24} />
                </div>
                <span className="text-[10px] font-mono text-gray-500">ID: #{foundAsset.id.toString().padStart(5, '0')}</span>
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">{foundAsset.nome}</h3>
              <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mt-1">{foundAsset.categoria}</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white/5 rounded-none border border-white/5">
                  <span className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Localização</span>
                  <p className="text-xs text-white font-medium">{foundAsset.localizacao_detalhada || 'N/A'}</p>
                </div>
                <div className="p-3 bg-white/5 rounded-none border border-white/5">
                  <span className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Estado</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-none bg-emerald-500" />
                    <p className="text-xs text-white font-bold">OPERACIONAL</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => onSelectAsset(foundAsset)}
                className="w-full py-4 border border-emerald-500/30 text-emerald-500 rounded-none font-bold uppercase tracking-widest text-[10px] hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                Abrir Ficha Técnica
                <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pt-8 grid grid-cols-2 gap-4 opacity-40 grayscale pointer-events-none">
        <div className="space-y-2">
            <Shield size={20} className="text-emerald-500 mx-auto" />
            <p className="text-[8px] font-bold text-white uppercase text-center tracking-widest">Segurança Ativa</p>
        </div>
        <div className="space-y-2">
            <Activity size={20} className="text-blue-500 mx-auto" />
            <p className="text-[8px] font-bold text-white uppercase text-center tracking-widest">Real-time Sync</p>
        </div>
      </div>
    </div>
  );
}

