import React, { useState, useEffect } from 'react';
import { 
  Scan, Search, Cpu, ArrowRight, Shield, Activity, AlertCircle, Link as LinkIcon, Camera, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';

export default function AssetScanner({ onSelectAsset }: { onSelectAsset: (asset: any) => void }) {
  const [assetId, setAssetId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [foundAsset, setFoundAsset] = useState<any>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [unlinkedQr, setUnlinkedQr] = useState<string | null>(null);
  
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedToLink, setSelectedToLink] = useState('');

  useEffect(() => {
    if (unlinkedQr) {
      fetch('/api/assets', {
        headers: { 'Authorization': `Bearer ${(sessionStorage.getItem('token') || localStorage.getItem('token'))}` }
      })
      .then(res => res.json())
      .then(data => setAssets(Array.isArray(data) ? data : []))
      .catch(console.error);
    }
  }, [unlinkedQr]);

  useEffect(() => {
    if (!isScanning) {
        // cleanup is handled via scanner.clear when valid
        return;
    }
    
    let scanner = new Html5QrcodeScanner('qr-reader', {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
    }, false);

    scanner.render((decodedText) => {
      scanner.clear();
      setIsScanning(false);
      setAssetId(decodedText);
      handleSearch(null, decodedText);
    }, (err) => {
      // ignore empty frames
    });

    return () => {
      if (scanner) {
          scanner.clear().catch(e => console.warn(e));
      }
    };
  }, [isScanning]);

  const handleSearch = async (e: React.FormEvent | null, searchId = assetId) => {
    if (e) e.preventDefault();
    if (!searchId.trim()) return;
    
    setLoading(true);
    setError(null);
    setFoundAsset(null);
    setUnlinkedQr(null);
    
    try {
      const res = await fetch(`/api/assets`, {
        headers: { 'Authorization': `Bearer ${(sessionStorage.getItem('token') || localStorage.getItem('token'))}` }
      });
      if (!res.ok) throw new Error('Erro ao carregar ativos');
      const data = await res.json();
      
      const asset = Array.isArray(data) ? data.find((a: any) => 
        (a.qr_code && a.qr_code.toLowerCase() === searchId.toLowerCase()) ||
        a.id.toString() === searchId || 
        a.nome.toLowerCase().includes(searchId.toLowerCase())
      ) : null;
      
      if (asset) {
        setFoundAsset(asset);
      } else {
        setUnlinkedQr(searchId);
      }
    } catch (err) {
      setError('Erro ao pesquisar ativo.');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkQr = async () => {
      if (!selectedToLink || !unlinkedQr) return;
      setLoading(true);
      try {
          const res = await fetch(`/api/assets/${selectedToLink}`, {
              method: 'PATCH',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${(sessionStorage.getItem('token') || localStorage.getItem('token'))}`
              },
              body: JSON.stringify({ qr_code: unlinkedQr })
          });
          
          if (!res.ok) {
              const info = await res.json();
              throw new Error(info.error || 'Falha ao vincular QR Code');
          }
          
          setError(null);
          setUnlinkedQr(null);
          handleSearch(null, unlinkedQr);
      } catch (err: any) {
          setError(err.message || 'Erro ao gravar vinculação na base de dados. Certifique-se que o código não está já num ativo.');
          setLoading(false);
      }
  };

  return (
    <div className="max-w-md mx-auto space-y-6 page-enter pt-6 pb-24">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-primary/10 rounded-xl mx-auto flex items-center justify-center text-primary shadow-lg shadow-primary/20 mb-4 border border-primary/20">
          <Scan size={32} />
        </div>
        <h2 className="text-xl font-bold text-foreground tracking-tight">Scanner de Ativos</h2>
        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Identificação e Registo via QR</p>
      </div>

      <div className="flex gap-2">
          <button 
            type="button" 
            onClick={() => { setIsScanning(!isScanning); setFoundAsset(null); setUnlinkedQr(null); }}
            className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-xl border transition-all ${isScanning ? 'bg-primary/20 border-primary text-primary' : 'bg-muted/30 border-border text-foreground hover:bg-muted/50'}`}
          >
              {isScanning ? <X size={20} /> : <Camera size={20} />}
              <span className="text-[9px] font-bold uppercase tracking-widest leading-none">
                  {isScanning ? 'Parar Câmera' : 'Abrir Câmera'}
              </span>
          </button>
      </div>

      <AnimatePresence>
          {isScanning && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden rounded-xl border border-border">
                  <div id="qr-reader" className="w-full bg-black"></div>
              </motion.div>
          )}
      </AnimatePresence>

      {!isScanning && (
        <form onSubmit={handleSearch} className="space-y-3">
            <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 w-4 h-4" />
            <input
                type="text"
                placeholder="Introduzir Câdigo Manualmente..."
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-muted/30 border border-border rounded-xl focus:outline-none focus:border-primary/50 text-sm text-foreground shadow-sm font-bold placeholder:text-muted-foreground/30 transition-all"
            />
            </div>
            <button 
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold uppercase tracking-widest text-[10px] hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
            >
            {loading ? 'A processar...' : 'Verificar'}
            </button>
        </form>
      )}

      <AnimatePresence mode="wait">
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3"
          >
            <AlertCircle size={18} className="text-rose-500" />
            <p className="text-xs text-rose-500 font-bold">{error}</p>
          </motion.div>
        )}

        {unlinkedQr && (
           <motion.div
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           className="bg-card backdrop-blur-sm border border-border overflow-hidden rounded-xl shadow-lg mt-4"
         >
           <div className="p-5 bg-muted/20 border-b border-border text-center">
             <div className="w-12 h-12 bg-amber-500/10 rounded-full mx-auto flex items-center justify-center text-amber-500 mb-3 border border-amber-500/20">
               <LinkIcon size={20} />
             </div>
             <h3 className="text-sm font-bold text-foreground">Código Não Reconhecido</h3>
             <p className="text-[10px] text-muted-foreground mt-1 max-w-[200px] mx-auto">
               O código <strong className="text-foreground">{unlinkedQr}</strong> não está associado a nenhum ativo atual.
             </p>
           </div>
           
           <div className="p-5 space-y-4 bg-muted/5">
             <div>
               <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Vincular a Ativo Existente</label>
               <select 
                 className="w-full bg-background border border-border rounded-lg p-3 text-sm font-medium"
                 value={selectedToLink}
                 onChange={e => setSelectedToLink(e.target.value)}
               >
                 <option value="">Selecione um ativo...</option>
                 {assets.map(a => (
                   <option key={a.id} value={a.id}>{a.nome} ({a.categoria})</option>
                 ))}
               </select>
             </div>
             <button
               onClick={handleLinkQr}
               disabled={!selectedToLink || loading}
               className="w-full py-3 bg-amber-500 text-black rounded-lg font-bold uppercase tracking-widest text-[10px] hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
             >
               {loading ? 'A Vincular...' : 'Confirmar Vinculação'}
             </button>
           </div>
         </motion.div>
        )}

        {foundAsset && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card backdrop-blur-sm border border-border overflow-hidden rounded-xl shadow-lg card-shine mt-4"
          >
            <div className="p-5 bg-primary/5 border-b border-border">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 bg-primary/10 rounded-lg text-primary border border-primary/20">
                  <Cpu size={18} />
                </div>
                <span className="text-[10px] font-bold font-mono text-muted-foreground bg-muted/30 px-2 py-0.5 rounded">ID: #{foundAsset.id.toString().padStart(5, '0')}</span>
              </div>
              <h3 className="text-base font-bold text-foreground tracking-tight">{foundAsset.nome}</h3>
              <p className="text-[9px] text-primary font-bold uppercase tracking-widest mt-1">{foundAsset.categoria}</p>
            </div>
            
            <div className="p-5 space-y-4 relative">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 bg-muted/20 border border-border rounded-lg">
                  <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Local</span>
                  <p className="text-[11px] text-foreground font-bold truncate">{foundAsset.localizacao_detalhada || 'N/A'}</p>
                </div>
                <div className="p-2.5 bg-muted/20 border border-border rounded-lg">
                  <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Estado</span>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      foundAsset.estado === 'Operacional' ? 'bg-emerald-500' :
                      foundAsset.estado === 'Em Manutenção' ? 'bg-amber-500' :
                      foundAsset.estado === 'Inativo' ? 'bg-rose-500' : 'bg-primary'
                    }`} />
                    <p className="text-[9px] text-foreground font-black uppercase tracking-wider">{foundAsset.estado || 'DESCONHECIDO'}</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => onSelectAsset(foundAsset)}
                className="w-full py-2.5 border border-primary/30 text-primary rounded-lg font-bold uppercase tracking-widest text-[9px] hover:bg-primary/10 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2"
              >
                Detalhes & Intervenções
                <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
