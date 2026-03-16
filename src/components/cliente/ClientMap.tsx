import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MapPin, Building2, Map as MapIcon, Crosshair } from 'lucide-react';
import { api } from '../../services/api';

export default function ClientMap() {
  const [ativos, setAtivos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAtivos = async () => {
      try {
        const data = await api.get('/api/cliente/ativos');
        setAtivos(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Assets fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAtivos();
  }, []);

  return (
    <div className="flex-1 flex flex-col pt-4 pb-24 h-[calc(100vh-140px)]">
      <div className="px-5 mb-4 shrink-0 flex items-center justify-between">
         <h2 className="text-xl font-black text-white flex items-center gap-2">
           <MapIcon className="text-emerald-500" /> Mapa de Ativos
         </h2>
         <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded-none border border-emerald-500/20">
           {ativos.length} Registados
         </span>
      </div>

      <div className="flex-1 px-4 relative">
        <div className="absolute inset-x-4 inset-y-0 rounded-none overflow-hidden border border-white/10 shadow-2xl bg-[#0c1220]">
          {/* Faux Interactive Map Background */}
          <div className="absolute inset-0 opacity-20" 
               style={{
                 backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
                 backgroundSize: '24px 24px'
               }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080d18] via-transparent to-transparent z-0"></div>
          
          {/* Map Controls */}
          <div className="absolute right-4 bottom-4 z-10 flex flex-col gap-2">
             <button className="w-10 h-10 rounded-none bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white shadow-xl">
                <Crosshair size={18} />
             </button>
          </div>

          {/* Markers */}
          {loading ? (
             <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-none animate-spin" />
             </div>
          ) : (
             <div className="relative w-full h-full p-8 flex flex-wrap content-start gap-4">
                {ativos.slice(0, 10).map((ativo, i) => {
                   // Generate pseudo-random positions for the demo map based on ID
                   const top = `${20 + (Math.sin(i * 45) * 15 + 15)}%`;
                   const left = `${20 + (Math.cos(i * 45) * 20 + 20)}%`;
                   
                   return (
                     <motion.div 
                       key={ativo.id}
                       initial={{ scale: 0, opacity: 0 }}
                       animate={{ scale: 1, opacity: 1 }}
                       transition={{ delay: i * 0.1, type: "spring" }}
                       className="absolute group z-10"
                       style={{ top, left }}
                     >
                        <div className="relative flex flex-col items-center">
                           <div className={`w-12 p-2 rounded-none backdrop-blur-md border shadow-2xl flex items-center justify-center cursor-pointer transition-transform hover:scale-110
                             ${ativo.estado === 'Avariado' ? 'bg-red-500/20 border-red-500/40 text-red-400' : 
                               ativo.estado === 'Em Manutenção' ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 
                               'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'}`}
                           >
                              <MapPin size={20} className={ativo.estado === 'Avariado' ? 'animate-bounce' : ''} />
                           </div>
                           
                           {/* Tooltip */}
                           <div className="absolute top-full mt-2 w-max max-w-[160px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                             <div className="bg-[#141414] border border-white/10 shadow-2xl rounded-none p-3">
                                <p className="text-[10px] font-bold text-white truncate">{ativo.nome}</p>
                                <p className="text-[8px] font-mono text-gray-500 uppercase tracking-widest mt-1 truncate">{ativo.categoria}</p>
                                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/10">
                                   <div className={`w-1.5 h-1.5 rounded-none ${ativo.estado === 'Avariado' ? 'bg-red-500' : ativo.estado === 'Em Manutenção' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                                   <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{ativo.estado}</span>
                                </div>
                             </div>
                           </div>
                        </div>
                     </motion.div>
                   )
                })}
             </div>
          )}
        </div>
      </div>
    </div>
  );
}

