import React, { useState, useEffect } from 'react';
import { Stage, Layer, Rect, Circle, Text, Group, Line } from 'react-konva';
import { motion } from 'framer-motion';
import { Cpu, Activity, Zap, ShieldAlert, ArrowLeft } from 'lucide-react';

export default function DigitalTwin({ asset, onBack }: { asset: any, onBack: () => void }) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 350 });
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const updateSize = () => {
      const container = document.getElementById('canvas-container');
      if (container) {
        setDimensions({ width: container.offsetWidth, height: 350 });
      }
    };
    window.addEventListener('resize', updateSize);
    updateSize();
    
    const interval = setInterval(() => {
      setRotation(r => (r + 1) % 360);
    }, 50);
    
    return () => {
      window.removeEventListener('resize', updateSize);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="space-y-4 page-enter">
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors font-bold text-[10px] uppercase tracking-widest"
        >
          <ArrowLeft size={14} />
          Voltar ao Portfólio
        </button>
        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-xl border border-white/5">
          <Cpu size={12} className="text-emerald-500" />
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Gémeo Digital Ativo</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-brand-surface rounded-[24px] border border-brand-border overflow-hidden relative" id="canvas-container">
          <div className="absolute top-4 left-4 z-10">
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              Esquema de {asset.nome}
            </h3>
            <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mt-0.5">ID do Ativo: {asset.id.toString().padStart(6, '0')}</p>
          </div>
          
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <div className="bg-white/5 px-2 py-1 rounded-lg flex items-center gap-2 border border-white/5">
              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[9px] font-mono text-white uppercase font-bold">Telemetria Ativa</span>
            </div>
          </div>

          <Stage width={dimensions.width} height={dimensions.height}>
            <Layer>
              {/* Background Grid */}
              {Array.from({ length: 20 }).map((_, i) => (
                <Line
                  key={`v-${i}`}
                  points={[i * 40, 0, i * 40, dimensions.height]}
                  stroke="rgba(255,255,255,0.02)"
                  strokeWidth={1}
                />
              ))}
              {Array.from({ length: 10 }).map((_, i) => (
                <Line
                  key={`h-${i}`}
                  points={[0, i * 40, dimensions.width, i * 40]}
                  stroke="rgba(255,255,255,0.02)"
                  strokeWidth={1}
                />
              ))}

              {/* Main Asset Representation */}
              <Group x={dimensions.width / 2} y={dimensions.height / 2}>
                <Rect
                  width={100}
                  height={100}
                  offsetX={50}
                  offsetY={50}
                  stroke="#10B981"
                  strokeWidth={1.5}
                  cornerRadius={10}
                  fill="rgba(16, 185, 129, 0.03)"
                  rotation={rotation}
                />
                <Circle
                  radius={35}
                  stroke="#3B82F6"
                  strokeWidth={1}
                  dash={[4, 4]}
                  rotation={-rotation * 2}
                />
                <Circle
                  radius={8}
                  fill="#10B981"
                  shadowBlur={8}
                  shadowColor="#10B981"
                />
                
                {/* Data Points */}
                {[0, 90, 180, 270].map((angle, i) => (
                  <Group key={i} rotation={angle + rotation}>
                    <Line
                      points={[50, 0, 80, 0]}
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth={1}
                    />
                    <Circle
                      x={80}
                      y={0}
                      radius={3}
                      fill="#fff"
                    />
                  </Group>
                ))}
              </Group>

              <Text
                x={dimensions.width / 2 - 60}
                y={dimensions.height - 30}
                text="DIAGNÓSTICO DO SISTEMA: NOMINAL"
                fontSize={8}
                fontFamily="JetBrains Mono"
                fill="#10B981"
                letterSpacing={1.5}
              />
            </Layer>
          </Stage>
        </div>

        <div className="space-y-4">
          <div className="bg-brand-surface p-5 rounded-[24px] border border-brand-border">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Telemetria em Direto</h4>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">Temperatura</span>
                  <span className="text-xs font-mono font-bold text-white">42.5°C</span>
                </div>
                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '65%' }}
                    className="bg-emerald-500 h-full"
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">Vibração</span>
                  <span className="text-xs font-mono font-bold text-white">0.04 mm/s</span>
                </div>
                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '20%' }}
                    className="bg-blue-500 h-full"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">Carga de Energia</span>
                  <span className="text-xs font-mono font-bold text-white">88%</span>
                </div>
                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '88%' }}
                    className="bg-amber-500 h-full"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-emerald-500/5 p-5 rounded-[24px] border border-emerald-500/10">
            <div className="flex items-center gap-2 text-emerald-500 mb-2">
              <Zap size={14} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Insight de IA</span>
            </div>
            <p className="text-[11px] text-emerald-100/70 leading-relaxed italic">
              "Padrões de vibração sugerem fadiga de rolamentos. Recomenda-se inspeção em 96 horas."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
