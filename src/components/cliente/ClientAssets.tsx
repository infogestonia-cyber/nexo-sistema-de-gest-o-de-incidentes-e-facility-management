import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Cpu, CheckCircle2, AlertTriangle, Wrench } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { api } from '../../services/api';

const ESTADO_COLORS: Record<string, { bg: string; dot: string; label: string }> = {
  'Operacional': { bg: 'bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-500', label: 'Operacional' },
  'Em Manutenção': { bg: 'bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-500 animate-pulse', label: 'Em Manutenção' },
  'Avariado': { bg: 'bg-red-500/10 border-red-500/20', dot: 'bg-red-500', label: 'Avariado' },
};

const CAT_ICONS: Record<string, string> = {
  'AVAC': '❄️',
  'Electricidade': '⚡',
  'Canalização': '💧',
  'Civil': '🏗️',
  'Segurança': '🔒',
};

export default function ClientAssets() {
  const [ativos, setAtivos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAtivos = async () => {
      try {
        const data = await api.get('/api/cliente/ativos');
        setAtivos(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Assets fetch error:', err);
        setAtivos([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAtivos();
  }, []);

  const operacional = ativos.filter(a => a.estado === 'Operacional').length;
  const manutencao = ativos.filter(a => a.estado === 'Em Manutenção').length;
  const avariado = ativos.filter(a => a.estado === 'Avariado').length;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 pb-28 space-y-5">
      <h2 className="text-xl font-black text-white">Meus Ativos</h2>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-none text-center">
          <p className="text-xl font-black text-white">{operacional}</p>
          <p className="text-[8px] text-emerald-400 font-bold uppercase tracking-wider">OK</p>
        </div>
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-none text-center">
          <p className="text-xl font-black text-white">{manutencao}</p>
          <p className="text-[8px] text-amber-400 font-bold uppercase tracking-wider">Manutenção</p>
        </div>
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-none text-center">
          <p className="text-xl font-black text-white">{avariado}</p>
          <p className="text-[8px] text-red-400 font-bold uppercase tracking-wider">Avariado</p>
        </div>
      </div>

      {/* Asset cards */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-none animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {ativos.map((ativo, i) => {
            const style = ESTADO_COLORS[ativo.estado] || ESTADO_COLORS['Operacional'];
            return (
              <motion.div
                key={ativo.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`border rounded-none p-4 space-y-3 ${style.bg}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-none bg-white/5 flex items-center justify-center text-xl flex-shrink-0">
                    {CAT_ICONS[ativo.categoria] || '⚙️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{ativo.nome}</p>
                    <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">{ativo.categoria}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className={`w-2 h-2 rounded-none ${style.dot}`} />
                    <span className="text-[9px] font-bold text-gray-400">{style.label}</span>
                  </div>
                </div>

                {ativo.ultima_manutencao && (
                  <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                    <Wrench size={11} className="text-gray-600" />
                    <p className="text-[9px] text-gray-600">
                      Última manutenção: <span className="text-gray-400">{format(new Date(ativo.ultima_manutencao), 'dd MMM yyyy', { locale: ptBR })}</span>
                    </p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

