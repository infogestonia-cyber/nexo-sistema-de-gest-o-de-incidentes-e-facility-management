import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * ErrorBoundary: Captura erros de JavaScript em componentes React
 * e mostra uma mensagem amigável em vez de um ecrã preto.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[ErrorBoundary] Erro capturado:', error, info);
        // Enviar erro para o servidor
        fetch('/api/logs/remote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                level: 'ERROR',
                message: `[CRASH] ${error.message}`,
                data: { stack: error.stack, componentStack: info.componentStack },
                url: window.location.href,
                userAgent: navigator.userAgent
            })
        }).catch(() => { /* ignorar falha no log */ });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '100vh',
                    background: '#0a0f0e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'system-ui, sans-serif',
                    color: '#fff',
                    padding: '24px',
                }}>
                    <div style={{
                        maxWidth: '480px',
                        textAlign: 'center',
                        background: '#111918',
                        border: '1px solid #1f2e2b',
                        borderRadius: '16px',
                        padding: '40px',
                    }}>
                        <div style={{
                            width: '56px', height: '56px',
                            background: '#ef444420',
                            border: '1px solid #ef444440',
                            borderRadius: '12px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 20px',
                            fontSize: '24px'
                        }}>⚠</div>
                        <h1 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: '#fff' }}>
                            Ocorreu um erro inesperado
                        </h1>
                        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '24px', lineHeight: '1.6' }}>
                            {this.state.error?.message || 'Erro desconhecido na aplicação.'}
                        </p>
                        <button
                            onClick={() => {
                                // Limpar dados corrompidos e recarregar
                                localStorage.removeItem('token');
                                localStorage.removeItem('user');
                                window.location.reload();
                            }}
                            style={{
                                background: 'linear-gradient(135deg, #10b981, #0d9488)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '12px 24px',
                                fontSize: '13px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                letterSpacing: '0.05em',
                            }}
                        >
                            Recarregar Aplicação
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
