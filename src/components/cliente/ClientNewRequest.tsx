import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Camera, CheckCircle2, ChevronDown, Building2 } from 'lucide-react';
import { api } from '../../services/api';
import { logError } from '../../utils/remoteLogger';

const CATEGORIAS = ['AVAC', 'Eléctrico', 'Canalização', 'Civil', 'Carpintaria', 'Segurança', 'Outro'];

export default function ClientNewRequest() {
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('');
  const [ativo, setAtivo] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [properties, setProperties] = useState<any[]>([]);
  const [ativos, setAtivos] = useState<any[]>([]);
  const [imagem, setImagem] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [pData, aData] = await Promise.all([
        api.get('/api/cliente/properties'),
        api.get('/api/cliente/ativos')
      ]);
      setProperties(pData);
      setAtivos(aData);
    } catch (err: any) {
      logError('Erro ao carregar dados iniciais do cliente', err);
    }
  };

  const handlePhoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onloadend = () => setImagem(reader.result as string);
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao || !categoria || !propertyId) { setError('Preencha a descrição, categoria e localização.'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/api/cliente/ordens/nova', { 
        descricao, categoria, ativo, property_id: propertyId, imagem 
      });
      setSuccess(true);
    } catch (err: any) {
      logError('Falha ao submeter ordem de serviço do cliente', err);
      setError(err.error || 'Erro ao submeter pedido');
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-24 h-24 bg-emerald-500 rounded-none flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 size={48} className="text-black" />
      </motion.div>
      <h3 className="text-2xl font-black text-white">Pedido Enviado!</h3>
      <p className="text-gray-400 text-sm mt-2 leading-relaxed">A sua solicitação foi registada. A nossa equipe irá responder em breve.</p>
      <button onClick={() => { setSuccess(false); setDescricao(''); setCategoria(''); setAtivo(''); setImagem(null); }}
        className="mt-8 px-6 py-3 bg-white/10 text-white text-sm font-bold rounded-none border border-white/10"
      >
        Novo Pedido
      </button>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 pb-28">
      <h2 className="text-xl font-black text-white mb-6">Novo Pedido</h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Localização (Propriedade) */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Localização *</label>
          <div className="relative">
            <select
              value={propertyId}
              onChange={e => setPropertyId(e.target.value)}
              className="w-full px-4 py-4 bg-white/[0.04] border border-white/10 rounded-none text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 appearance-none"
            >
              <option value="">Selecionar propriedade...</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.endereco}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
        </div>

        {/* Categoria */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tipo de Problema *</label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIAS.map(c => (
              <button key={c} type="button" onClick={() => setCategoria(c)}
                className={`py-3 px-4 rounded-none text-xs font-bold border transition-all text-left ${categoria === c ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'bg-white/[0.03] border-white/8 text-gray-400'
                  }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Ativo */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Equipamento Afetado</label>
          <div className="relative">
            <select
              value={ativo}
              onChange={e => setAtivo(e.target.value)}
              className="w-full px-4 py-4 bg-white/[0.04] border border-white/10 rounded-none text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 appearance-none"
            >
              <option value="">Selecionar equipamento (Opcional)</option>
              {ativos.filter(a => !propertyId || a.property_id === propertyId).map(a => (
                <option key={a.id} value={a.id}>{a.nome}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
        </div>

        {/* Descrição */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Descrição do Problema *</label>
          <textarea
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            rows={4}
            placeholder="Descreva o problema com o máximo de detalhe possível..."
            className="w-full px-4 py-4 bg-white/[0.04] border border-white/10 rounded-none text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30 placeholder-gray-700"
          />
        </div>

        {/* Photo */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Foto do Problema</label>
          {imagem ? (
            <div className="relative">
              <img src={imagem} alt="Preview" className="w-full h-40 object-cover rounded-none border border-emerald-500/20" />
              <button type="button" onClick={() => setImagem(null)} className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-none flex items-center justify-center text-white text-xs">✕</button>
            </div>
          ) : (
            <button type="button" onClick={handlePhoto}
              className="w-full py-8 border-2 border-dashed border-white/10 rounded-none flex flex-col items-center gap-2 text-gray-600 hover:border-emerald-500/30 hover:text-emerald-500 transition-all"
            >
              <Camera size={24} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Adicionar Foto</span>
            </button>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-none text-xs text-red-400">{error}</div>
        )}

        <motion.button
          type="submit"
          disabled={loading || !descricao || !categoria || !propertyId}
          whileTap={{ scale: 0.97 }}
          className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-black text-sm uppercase tracking-widest rounded-none flex items-center justify-center gap-2"
        >
          {loading ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-none animate-spin" /> : <><Send size={16} /> Enviar Pedido</>}
        </motion.button>
      </form>
    </div>
  );
}

