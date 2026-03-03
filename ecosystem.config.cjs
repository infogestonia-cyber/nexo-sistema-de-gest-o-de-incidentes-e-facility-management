// Ficheiro de configuração do PM2 para o Nexo SGFM
// ─────────────────────────────────────────────────────────
// COMANDOS NO SERVIDOR:
//   Primeiro deploy:  pm2 start ecosystem.config.cjs --env production
//   Reiniciar:        pm2 restart nexo-sgfm
//   Parar:            pm2 stop nexo-sgfm
//   Ver logs:         pm2 logs nexo-sgfm --lines 100
//   Guardar config:   pm2 save
//   Iniciar no boot:  pm2 startup  (depois seguir as instruções)
// ─────────────────────────────────────────────────────────

module.exports = {
    apps: [
        {
            name: "nexo-sgfm",

            // Usa tsx para executar TypeScript directamente sem compilar
            script: "node",
            args: "--import tsx/esm server.ts",

            instances: 1,
            exec_mode: "fork",
            autorestart: true,
            watch: false,
            max_memory_restart: "512M",

            // Aguardar 5 segundos antes de considerar que o processo arrancou com sucesso
            min_uptime: "5s",
            // Máximo de restarts em 15 minutos antes de parar de tentar
            max_restarts: 10,

            env_production: {
                NODE_ENV: "production",
                PORT: 3000,

                // ── VARIÁVEIS OBRIGATÓRIAS ──────────────────────────────────────
                // Descomente e preencha estas variáveis no servidor:
                //
                // JWT_SECRET: "mude-para-uma-chave-secreta-muito-forte-e-unica",
                // ADMIN_PASSWORD: "palavra-passe-forte-do-administrador",
                //
                // ── VARIÁVEIS DO SUPABASE (opcional se usar autenticação Supabase)
                // VITE_SUPABASE_URL: "https://xxxxxxxxxxxx.supabase.co",
                // VITE_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                // SUPABASE_SERVICE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                // ────────────────────────────────────────────────────────────────
            },

            // Configuração de logs
            log_date_format: "YYYY-MM-DD HH:mm:ss",
            error_file: "./logs/nexo-error.log",
            out_file: "./logs/nexo-out.log",
            merge_logs: true,
        },
    ],
};
