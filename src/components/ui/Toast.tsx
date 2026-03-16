import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
    message: string | null;
    type?: ToastType;
    onClose: () => void;
}

export function Toast({ message, type = 'success', onClose }: ToastProps) {
    useEffect(() => {
        if (message) {
            const timer = setTimeout(onClose, 4000);
            return () => clearTimeout(timer);
        }
    }, [message, onClose]);

    return (
        <AnimatePresence>
            {message && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="fixed bottom-6 right-6 z-[9999] flex items-center gap-4 w-max max-w-md rounded-none border border-white/10 shadow-[0_20px_40px_-5px_rgba(0,0,0,0.8)] bg-[#1a1f2e] p-4 text-white overflow-hidden"
                >
                    {/* Barra de Progresso Animada */}
                    <motion.div
                        initial={{ width: "100%" }}
                        animate={{ width: 0 }}
                        transition={{ duration: 4, ease: "linear" }}
                        className={`absolute bottom-0 left-0 h-1 ${type === 'error' ? 'bg-rose-500' : 'bg-emerald-500'}`}
                    />

                    <div className="shrink-0">
                        {type === 'error' ? (
                            <div className="w-10 h-10 rounded-none bg-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.3)] flex items-center justify-center">
                                <AlertCircle className="w-5 h-5 text-rose-500" />
                            </div>
                        ) : (
                            <div className="w-10 h-10 rounded-none bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            </div>
                        )}
                    </div>

                    <div className="flex-1 pr-6">
                        <h4 className={`text-sm font-bold uppercase tracking-widest ${type === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {type === 'error' ? 'Erro' : 'Sucesso'}
                        </h4>
                        <p className="text-xs text-slate-300 mt-1 leading-snug font-medium">{message}</p>
                    </div>

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1.5 rounded-none hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

