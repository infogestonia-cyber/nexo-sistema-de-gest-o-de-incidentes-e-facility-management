import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import os from "os";

import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { rateLimit } from "express-rate-limit";
import type { Request, Response, NextFunction } from "express";
import { MaintenanceScheduler } from "./server-maintenance-scheduler.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://cjatwytjglubwhydmtxn.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_GqcBiP6hTOMf8ertftVawA_0ig2Xc8X";
// Service Role Key necessária para criar utilizadores via Admin API
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// Cliente admin só é criado se a Service Role Key estiver definida
const supabaseAdmin = SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

console.log(`[Supabase] URL: "${SUPABASE_URL}"`);
console.log(`[Supabase] Admin Client: ${supabaseAdmin ? 'ATIVO' : 'INATIVO (Service Key em falta)'}`);
if (!SUPABASE_SERVICE_KEY) {
  console.warn("[WARNING] SUPABASE_SERVICE_KEY não encontrada. Algumas operações do portal do cliente podem falhar por RLS.");
} else {
  console.log(`[Supabase] Service Key Prefix: ${SUPABASE_SERVICE_KEY.substring(0, 10)}...`);
}

const JWT_SECRET = process.env.JWT_SECRET || "gestpro-secret-key-2025";
// Palavra-passe do administrador local (configurável via variável de ambiente)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
console.log(`[Server] Starting in ${process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);

// Logging Utility - Forcing path to project root
const LOG_DIR = path.join(__dirname, "logs");
if (!fs.existsSync(LOG_DIR)) {
  console.log(`[Server] Creating log directory at: ${LOG_DIR}`);
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const logFilePath = path.join(LOG_DIR, "server.log");
const logToFile = (type: "INFO" | "ERROR" | "DEBUG" | "WARNING", message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${type}] ${message} ${data ? JSON.stringify(data) : ""}\n`;
  fs.appendFileSync(logFilePath, logEntry);
  if (type === "ERROR") console.error(logEntry);
  else console.log(logEntry);
};

// DEV HELPERS: Handle local developer users (ID 000... doesn't exist in Supabase auth.users)
const DEV_ADMIN_ID = "00000000-0000-0000-0000-000000000000";
const userAuditPayload = (id: any) => {
  if (!id) return {};
  const cleanId = id.toString().trim().toLowerCase();
  if (cleanId === DEV_ADMIN_ID) return {};
  return { user_id: id };
};
const safeUserId = (id: any) => {
  if (!id) return null;
  const cleanId = id.toString().trim().toLowerCase();
  return cleanId === DEV_ADMIN_ID ? null : id;
};

async function startServer() {
  console.log("!!! STARTING SERVER - VERSION DEBUG 1.0 !!!");
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, { cors: { origin: "*" } });

  // Rate Limiter configuration
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Increased for automated testing
    message: { error: "Muitas tentativas de login. Por favor, tente novamente após 15 minutos." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Servir ficheiros estáticos da pasta public (fotos, etc.)
  app.use(express.static('public'));
  
  // CORS: permitir pedidos de qualquer origem (necessário em produção)
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  const activeUsers = new Map();

  // Removed local fallbacks to ensure strict DB usage

  io.on("connection", (socket) => {
    socket.on("join-room", ({ roomId, user }) => {
      socket.join(roomId);
      activeUsers.set(socket.id, { user, roomId });
      io.to(roomId).emit("presence-update", Array.from(activeUsers.values()).filter(u => u.roomId === roomId));
    });
    socket.on("disconnect", () => {
      const u = activeUsers.get(socket.id);
      if (u) {
        activeUsers.delete(socket.id);
        io.to(u.roomId).emit("presence-update", Array.from(activeUsers.values()).filter(active => active.roomId === u.roomId));
      }
    });
  });

  const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Não autorizado" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // Local Admin Bypass - Skip DB validation for the hardcoded local system admin
      if (decoded.id === DEV_ADMIN_ID) {
        (req as any).user = { 
          id: decoded.id, 
          perfil: 'Administrador', 
          nome: 'Administrador Sistema',
          must_change_password: false
        };
        return next();
      }

      // Strict Database Validation - Every request checks user status
      const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', decoded.id).single();
      
      if (error || !profile) {
        logToFile("WARNING", "Segurança: Tentativa de acesso com utilizador inexistente ou eliminado", { userId: decoded.id });
        return res.status(401).json({ error: "Sessão inválida: Utilizador não encontrado" });
      }

      if (profile.estado === 'Inativo') {
        logToFile("WARNING", "Segurança: Acesso negado a utilizador desativado", { userId: decoded.id });
        return res.status(403).json({ error: "A sua conta está desativada. Contacte o administrador." });
      }

      (req as any).user = { 
        id: profile.id, 
        perfil: profile.perfil, 
        nome: profile.nome,
        must_change_password: profile.must_change_password
      };
      next();
    } catch (e) {
      logToFile("DEBUG", "Falha na validação de token JWT", { error: (e as Error).message });
      res.status(401).json({ error: "Sessão expirada ou inválida" });
    }
  };

  // Centralized Remote Logging for Frontend
  app.post("/api/logs/remote", async (req, res) => {
    const { level, message, data, url, userAgent } = req.body;
    const type = (level === 'ERROR' ? 'ERROR' : (level === 'DEBUG' ? 'DEBUG' : 'INFO')) as any;
    logToFile(type, `[FRONTEND] ${message}`, { url, userAgent, ...data });
    res.json({ success: true });
  });

  // app.post("/api/login", authLimiter, async (req, res) => {
  app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;

    try {
      if (!email || !password) {
        logToFile("WARNING", "Tentativa de login sem email ou senha", { email });
        return res.status(400).json({ error: "Email e palavra-passe são obrigatórios" });
      }

      // Administrador local embutido - funciona SEMPRE (dev e produção)
      // Útil quando o Supabase não está acessível ou não tem utilizadores configurados
      if (email === 'admin@nexo.com' && password === ADMIN_PASSWORD) {
        const token = jwt.sign(
          { id: '00000000-0000-0000-0000-000000000000', perfil: 'Administrador', nome: 'Administrador Sistema' },
          JWT_SECRET,
          { expiresIn: '8h' }
        );
        logToFile("INFO", "Login bem-sucedido: Admin local", { email });
        return res.json({
          token,
          user: { id: '00000000-0000-0000-0000-000000000000', nome: 'Administrador Sistema', email: 'admin@nexo.com', perfil: 'Administrador' }
        });
      }

      // Autenticação via Supabase para outros utilizadores
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError || !authData.user) {
        logToFile("WARNING", "Login falhou: Credenciais inválidas", { email, error: authError?.message });
        return res.status(401).json({ error: "Credenciais inválidas" });
      }

      const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', authData.user.id).single();
      if (profileError || !profile) {
        logToFile("ERROR", "Login falhou: Perfil não encontrado", { email, user_id: authData.user.id, error: profileError?.message });
        return res.status(401).json({ error: "Perfil não encontrado no sistema" });
      }

      if (profile.estado === 'Inativo') {
        logToFile("WARNING", "Login rejeitado: Conta inativa", { email, user_id: profile.id });
        return res.status(403).json({ error: "Esta conta foi desativada" });
      }

      const token = jwt.sign(
        { id: profile.id, perfil: profile.perfil, nome: profile.nome, property_id: profile.property_id || null },
        JWT_SECRET,
        { expiresIn: '8h' }
      );

      logToFile("INFO", "Login bem-sucedido", { email, user_id: profile.id, perfil: profile.perfil });
      res.json({ 
        token, 
        user: { 
          id: profile.id, 
          nome: profile.nome, 
          email: profile.email, 
          perfil: profile.perfil,
          must_change_password: profile.must_change_password 
        } 
      });
    } catch (err: any) {
      logToFile("ERROR", "Erro geral ao fazer login", { error: err.message, email });
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.get("/api/me", authenticate, async (req, res) => {
    res.json({ user: (req as any).user });
  });

  app.get("/api/users", authenticate, async (req, res) => {
    const clientToUse = supabaseAdmin || supabase;
    const { data: profiles } = await clientToUse.from('profiles').select('id, nome, email, perfil, estado, property_id, asset_id, must_change_password');
    const { data: clientes } = await clientToUse.from('clientes').select('id, nome, codigo, contrato, orcamento_mensal');

    const combined = [
      ...(profiles || []).map(p => ({ ...p, type: 'user' })),
      ...(clientes || []).map(c => ({
        id: c.id,
        nome: c.nome,
        email: c.codigo, // Usamos o código como identificador visual secundário
        perfil: 'Cliente',
        estado: 'Ativo',
        type: 'client',
        details: { contrato: c.contrato, orcamento: c.orcamento_mensal }
      }))
    ];

    res.json(combined);
  });

  app.get("/api/notifications", authenticate, async (req, res) => {
    const userId = (req as any).user.id;
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  });

  app.post("/api/notifications/read", authenticate, async (req, res) => {
    const userId = (req as any).user.id;
    const { error } = await supabase.from('notifications').update({ lida: true }).eq('user_id', userId);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  const createNotification = async (userId: string, titulo: string, mensagem: string) => {
    const notif = { id: crypto.randomUUID(), user_id: userId, titulo, mensagem, lida: false, created_at: new Date().toISOString() };
    await supabase.from('notifications').insert([notif]);
    io.emit("notification", { userId, titulo, mensagem });
  };


  // =======================================================
  // PORTAL DO CLIENTE — API dedicada
  // =======================================================

  app.post("/api/auth/cliente", authLimiter, async (req, res) => {
    const { codigo, pin } = req.body;
    logToFile("INFO", "Tentativa de login cliente", { codigo, pin_length: pin?.length });
    if (!codigo || !pin) return res.status(400).json({ error: "Código e PIN são obrigatórios" });
    const { data: dbCliente } = await supabaseAdmin.from('clientes').select('*').eq('codigo', codigo).eq('pin', pin).single();
    const cliente = dbCliente;
    if (!cliente) {
      logToFile("WARNING", "Login cliente falhou: Código ou PIN inválidos", { codigo });
      return res.status(401).json({ error: "Código ou PIN inválidos" });
    }
    logToFile("INFO", "Cliente autenticado", { id: cliente.id, nome: cliente.nome });
    const token = jwt.sign(
      { id: cliente.id, nome: cliente.nome, perfil: 'Cliente', codigo: cliente.codigo, property_id: cliente.property_id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, cliente: { id: cliente.id, nome: cliente.nome, codigo: cliente.codigo, contrato: (cliente as any).contrato, orcamento_mensal: (cliente as any).orcamento_mensal, property_id: cliente.property_id } });
  });

  const authenticateCliente = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      logToFile("WARNING", "Acesso Cliente negado: Sem token");
      return res.status(401).json({ error: "Sessão expirada ou não autorizado" });
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded.perfil !== 'Cliente' && decoded.perfil !== 'Administrador') {
        logToFile("WARNING", "Tentativa de acesso não autorizado ao portal de cliente", { perfil: decoded.perfil, userId: decoded.id });
        return res.status(403).json({ error: "Acesso restrito a clientes" });
      }
      (req as any).cliente = decoded;
      next();
    } catch (e: any) { 
      logToFile("DEBUG", "Acesso Cliente falhou: Token inválido ou expirado", { error: e.message });
      res.status(401).json({ error: "Sessão expirada ou inválida" }); 
    }
  };

  app.get("/api/cliente/dashboard", authenticateCliente, async (req, res) => {
    const { id, perfil } = (req as any).cliente;
    let query = supabase.from('incidents').select('*');
    if (perfil !== 'Administrador') {
      query = query.eq('cliente_id', id);
    }
    const { data: ordens, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    const ordensList = ordens || [];
    const totalGasto = ordensList.reduce((acc: number, o: any) => acc + (o.custo_estimado || 0), 0);
    const abertas = ordensList.filter((o: any) => !['Resolvido', 'Fechado'].includes(o.estado)).length;
    const concluidas = ordensList.filter((o: any) => ['Resolvido', 'Fechado'].includes(o.estado)).length;
    const pendentesValidacao = ordensList.filter((o: any) => o.estado === 'Em validação' && !o.validado).length;

    // Gastos mensais simplificados para demonstração dinâmica básica (último mês)
    const meses = ['Anterior', 'Atual'];
    const gastosMensais = [totalGasto * 0.8, totalGasto];

    res.json({ totalGasto, abertas, concluidas, pendentesValidacao, gastosMensais, meses, ultimasOrdens: ordensList.slice(0, 3) });
  });

  app.get("/api/cliente/ordens", authenticateCliente, async (req, res) => {
    const { id, perfil } = (req as any).cliente;
    const { estado } = req.query;
    
    let query = supabase.from('incidents').select('*');
    if (perfil !== 'Administrador') {
      // Filtro estrito: Apenas incidentes de propriedades vinculadas a este cliente
      const { data: props } = await supabase.from('properties').select('id').eq('client_id', id);
      const validPropIds = (props || []).map(p => p.id);
      query = query.in('property_id', validPropIds);
    }
    if (estado && estado !== 'all') query = query.eq('estado', estado);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  });

  app.post("/api/cliente/ordens/:orderId/validar", authenticateCliente, async (req, res) => {
    const { orderId } = req.params;
    const { observacao } = req.body;
    const clienteId = (req as any).cliente?.id;

    try {
      if (!orderId) {
        logToFile("WARNING", "Tentativa de validar ordem sem ID", { cliente_id: clienteId });
        return res.status(400).json({ error: "ID da ordem é obrigatório" });
      }

      const { error } = await supabase.from('incidents').update({ 
        estado: 'Fechado', 
        validado: true, 
        observacao_validacao: observacao, 
        data_validacao: new Date().toISOString() 
      }).eq('id', orderId);

      if (error) {
        logToFile("ERROR", "Erro ao validar ordem de cliente", { error: error.message, order_id: orderId, cliente_id: clienteId });
        return res.status(500).json({ error: "Erro ao validar ordem" });
      }

      logToFile("INFO", "Ordem de cliente validada com sucesso", { order_id: orderId, cliente_id: clienteId });
      res.json({ success: true });
    } catch (error: any) {
      logToFile("ERROR", "Erro geral ao validar ordem de cliente", { error: error.message, order_id: orderId, cliente_id: clienteId });
      res.status(500).json({ error: "Erro ao validar ordem" });
    }
  });

  app.post("/api/cliente/ordens/nova", authenticateCliente, async (req, res) => {
    const clienteId = (req as any).cliente.id;
    const { descricao, categoria, ativo, property_id, imagem } = req.body;

    try {
      if (!descricao || !categoria) {
        logToFile("WARNING", "Tentativa de criar ordem sem descricao ou categoria", { cliente_id: clienteId, property_id });
        return res.status(400).json({ error: "Descrição e Categoria são obrigatórias" });
      }

      logToFile("INFO", "Nova ordem de cliente", { clienteId, categoria, property_id, ativo });

      // Check if 'ativo' is a UUID (asset_id)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ativo);

      const nova: any = {
        id: crypto.randomUUID(),
        descricao: isUuid ? descricao : `${descricao}${ativo ? ` (Equipamento: ${ativo})` : ''}`,
        categoria,
        asset_id: isUuid ? ativo : null,
        estado: 'Aberto',
        severidade: 'Médio',
        custo_estimado: 0,
        tecnico: null,
        data_abertura: new Date().toISOString(),
        validado: false,
        property_id: property_id,
        cliente_id: clienteId,
        imagem_url: null
      };

      // Processar imagem base64
      if (imagem && imagem.startsWith('data:image')) {
        try {
          const matches = imagem.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const fileExtension = matches[1];
            const base64Data = matches[2];
            const fileName = `inc_${nova.id}.${fileExtension}`;
            const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'incidents');
            
            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

            fs.writeFileSync(path.join(uploadDir, fileName), Buffer.from(base64Data, 'base64'));
            nova.imagem_url = `/uploads/incidents/${fileName}`;
            logToFile("INFO", "Imagem guardada localmente", { url: nova.imagem_url, cliente_id: clienteId });
          }
        } catch (err: any) {
          logToFile("ERROR", "Erro ao gravar imagem base64", { err: err.message, cliente_id: clienteId });
        }
      }

      const { data: inserted, error } = await (supabaseAdmin || supabase).from('incidents').insert([nova]).select().single();
      
      if (error) {
        logToFile("ERROR", "Falha ao criar incidente do cliente", { error: error.message, cliente_id: clienteId, categoria });
        return res.status(500).json({ error: `Erro na base de dados: ${error.message}` });
      }

      logToFile("INFO", "Incidente/Ordem de cliente criado com sucesso", { id: inserted?.id, cliente_id: clienteId, categoria });
      io.emit("incident-update", { action: 'create', incidentId: inserted?.id });
      res.json(inserted);
    } catch (err: any) {
      logToFile("ERROR", "Erro geral ao criar ordem de cliente", { error: err.message, cliente_id: clienteId, categoria });
      res.status(500).json({ error: "Erro ao criar ordem" });
    }
  });

  // Endpoint para ler os logs (Debug Aberto temporariamente)
  app.get("/api/admin/logs", async (req, res) => {
    if (fs.existsSync(logFilePath)) {
      const logs = fs.readFileSync(logFilePath, "utf-8");
      res.header("Content-Type", "text/plain");
      res.send(logs);
    } else {
      res.send("Nenhum log encontrado.");
    }
  });

  app.get("/api/cliente/ativos", authenticateCliente, async (req, res) => {
    const { perfil, property_id } = (req as any).cliente;
    const db = supabaseAdmin || supabase;
    let query = db.from('assets').select('*');

    if (perfil !== 'Administrador') {
      if (property_id) {
        query = query.eq('property_id', property_id);
      } else {
        // fallback to properties linked by client_id
        const { data: props } = await db.from('properties').select('id').eq('client_id', (req as any).cliente.id);
        const validPropIds = (props || []).map(p => p.id);
        query = query.in('property_id', validPropIds);
      }
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  });

  app.get("/api/cliente/properties", authenticateCliente, async (req, res) => {
    const { id, perfil, property_id } = (req as any).cliente;
    let query = supabase.from('properties').select('*');

    if (perfil !== 'Administrador') {
      if (property_id) {
        query = query.eq('id', property_id);
      } else {
        query = query.eq('client_id', id);
      }
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  });

  // =======================================================
  // FIM PORTAL DO CLIENTE
  // =======================================================

  app.post("/api/users", authenticate, async (req, res) => {
    const { nome, email, password, perfil, codigo, pin, contrato, orcamento_mensal, property_id } = req.body;
    const userId = (req as any).user?.id;

    try {
      if (!nome || !email) {
        logToFile("WARNING", "Tentativa de criar utilizador com dados obrigatórios faltando", { nome, email, perfil, user_id: userId });
        return res.status(400).json({ error: "Nome e Email são obrigatórios" });
      }

      if (perfil === 'Cliente') {
        // Clientes não usam Auth do Supabase (usam código/pin)
        const clientToUse = supabaseAdmin || supabase;
        const { data, error } = await clientToUse.from('clientes').insert([{
          nome,
          codigo,
          pin,
          contrato,
          orcamento_mensal: parseFloat(orcamento_mensal) || 0,
          property_id
        }]).select('id').single();

        if (error) {
          logToFile("ERROR", "Erro ao criar cliente", { error: error.message, nome, email, user_id: userId });
          return res.status(400).json({ error: error.message });
        }

        logToFile("INFO", "Cliente criado com sucesso", { id: data?.id, nome, email, user_id: userId });
        return res.json({ id: data?.id });
      }

      // Registo de utilizador normal via Auth
      if (!password) {
        logToFile("WARNING", "Tentativa de criar utilizador sem senha", { nome, email, perfil, user_id: userId });
        return res.status(400).json({ error: "Senha é obrigatória" });
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email, password
      });

      if (authError || !authData.user) {
        logToFile("ERROR", "Erro ao criar utilizador na autenticação", { error: authError?.message, nome, email, perfil, user_id: userId });
        return res.status(400).json({ error: authError?.message || "Erro ao criar utilizador" });
      }

      const { error: profileError } = await supabase.from('profiles').insert([{
        id: authData.user.id,
        nome, email, perfil,
        property_id: req.body.property_id || null,
        asset_id: req.body.asset_id || null,
        must_change_password: true,
        estado: 'Ativo'
      }]);

      if (profileError) {
        logToFile("ERROR", "Erro ao criar perfil de utilizador", { error: profileError.message, id: authData.user.id, nome, email, user_id: userId });
        return res.status(400).json({ error: profileError.message });
      }

      logToFile("INFO", "Utilizador criado com sucesso", { id: authData.user.id, nome, email, perfil, user_id: userId });
      res.json({ id: authData.user.id });
    } catch (error: any) {
      logToFile("ERROR", "Erro geral ao criar utilizador", { error: error.message, nome, email, user_id: userId });
      res.status(500).json({ error: "Erro ao criar utilizador" });
    }
  });

  app.patch("/api/users/:id", authenticate, async (req, res) => {
    const { nome, perfil, property_id, asset_id, estado } = req.body;
    const userId = (req as any).user?.id;
    const targetUserId = req.params.id;

    try {
      const { error } = await (supabaseAdmin || supabase)
        .from('profiles')
        .update({ nome, perfil, property_id, asset_id, estado })
        .eq('id', targetUserId);
      
      if (error) {
        logToFile("ERROR", "Erro ao atualizar utilizador", { error: error.message, target_user_id: targetUserId, updated_fields: { nome, perfil, estado }, user_id: userId });
        return res.status(400).json({ error: error.message });
      }

      logToFile("INFO", "Utilizador atualizado com sucesso", { target_user_id: targetUserId, updated_fields: { nome, perfil, estado }, user_id: userId });
      res.json({ success: true });
    } catch (error: any) {
      logToFile("ERROR", "Erro geral ao atualizar utilizador", { error: error.message, target_user_id: targetUserId, user_id: userId });
      res.status(500).json({ error: "Erro ao atualizar utilizador" });
    }
  });

  app.delete("/api/users/:id", authenticate, async (req, res) => {
    const userId = (req as any).user?.id;
    const targetUserId = req.params.id;

    try {
      if (!supabaseAdmin) {
        logToFile("ERROR", "Tentativa de deletar utilizador sem Service Role Key", { target_user_id: targetUserId, user_id: userId });
        return res.status(500).json({ error: "Service Role Key necessária para eliminar utilizadores" });
      }
      
      const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
      if (authErr) {
        logToFile("ERROR", "Erro ao eliminar utilizador da autenticação", { error: authErr.message, target_user_id: targetUserId, user_id: userId });
        return res.status(400).json({ error: authErr.message });
      }
      
      const { error: profileErr } = await supabaseAdmin.from('profiles').delete().eq('id', targetUserId);
      if (profileErr) {
        logToFile("ERROR", "Erro ao eliminar perfil de utilizador", { error: profileErr.message, target_user_id: targetUserId, user_id: userId });
      }

      logToFile("INFO", "Utilizador eliminado com sucesso", { target_user_id: targetUserId, user_id: userId });
      res.json({ success: true });
    } catch (error: any) {
      logToFile("ERROR", "Erro geral ao eliminar utilizador", { error: error.message, target_user_id: targetUserId, user_id: userId });
      res.status(500).json({ error: "Erro ao eliminar utilizador" });
    }
  });

  app.post("/api/users/:id/reset-password", authenticate, async (req, res) => {
    const { newPassword } = req.body;
    const userId = (req as any).user?.id;
    const targetUserId = req.params.id;

    try {
      if (!supabaseAdmin) {
        logToFile("ERROR", "Tentativa de reset de senha sem Service Role Key", { target_user_id: targetUserId, user_id: userId });
        return res.status(500).json({ error: "Service Role Key necessária para reset de senha" });
      }

      if (!newPassword) {
        logToFile("WARNING", "Tentativa de reset de senha sem nova senha", { target_user_id: targetUserId, user_id: userId });
        return res.status(400).json({ error: "Nova senha é obrigatória" });
      }
      
      const { error } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, { password: newPassword });
      if (error) {
        logToFile("ERROR", "Erro ao resetar senha", { error: error.message, target_user_id: targetUserId, user_id: userId });
        return res.status(400).json({ error: error.message });
      }
      
      const { error: profileErr } = await supabaseAdmin.from('profiles').update({ must_change_password: true }).eq('id', targetUserId);
      if (profileErr) {
        logToFile("WARNING", "Erro ao marcar perfil para mudança de senha obrigatória", { error: profileErr.message, target_user_id: targetUserId });
      }

      logToFile("INFO", "Senha de utilizador resetada com sucesso", { target_user_id: targetUserId, user_id: userId });
      res.json({ success: true });
    } catch (error: any) {
      logToFile("ERROR", "Erro geral ao resetar senha", { error: error.message, target_user_id: targetUserId, user_id: userId });
      res.status(500).json({ error: "Erro ao resetar senha" });
    }
  });

  app.post("/api/users/change-password", authenticate, async (req, res) => {
    const { password } = req.body;
    const userId = (req as any).user.id;
    
    try {
      if (!password) {
        logToFile("WARNING", "Tentativa de mudar senha sem nova senha", { user_id: userId });
        return res.status(400).json({ error: "Nova senha é obrigatória" });
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        logToFile("ERROR", "Erro ao mudar senha de utilizador", { error: error.message, user_id: userId });
        return res.status(400).json({ error: error.message });
      }
      
      const { error: profileErr } = await supabase.from('profiles').update({ must_change_password: false }).eq('id', userId);
      if (profileErr) {
        logToFile("WARNING", "Erro ao atualizar perfil após mudança de senha", { error: profileErr.message, user_id: userId });
      }

      logToFile("INFO", "Senha de utilizador alterada com sucesso", { user_id: userId });
      res.json({ success: true });
    } catch (error: any) {
      logToFile("ERROR", "Erro geral ao mudar senha", { error: error.message, user_id: userId });
      res.status(500).json({ error: "Erro ao mudar senha" });
    }
  });

  app.patch("/api/clientes/:id", authenticate, async (req, res) => {
    const { nome, codigo, pin, contrato, orcamento_mensal } = req.body;
    const userId = (req as any).user?.id;
    const clienteId = req.params.id;

    try {
      const { error } = await (supabaseAdmin || supabase)
        .from('clientes')
        .update({ 
          nome, codigo, pin, contrato, 
          orcamento_mensal: parseFloat(orcamento_mensal) || 0 
        })
        .eq('id', clienteId);
      
      if (error) {
        logToFile("ERROR", "Erro ao atualizar cliente", { error: error.message, cliente_id: clienteId, user_id: userId });
        return res.status(400).json({ error: error.message });
      }

      logToFile("INFO", "Cliente atualizado com sucesso", { cliente_id: clienteId, nome, user_id: userId });
      res.json({ success: true });
    } catch (error: any) {
      logToFile("ERROR", "Erro geral ao atualizar cliente", { error: error.message, cliente_id: clienteId, user_id: userId });
      res.status(500).json({ error: "Erro ao atualizar cliente" });
    }
  });

  app.delete("/api/clientes/:id", authenticate, async (req, res) => {
    const userId = (req as any).user?.id;
    const clienteId = req.params.id;

    try {
      const { error } = await (supabaseAdmin || supabase).from('clientes').delete().eq('id', clienteId);
      if (error) {
        logToFile("ERROR", "Erro ao eliminar cliente", { error: error.message, cliente_id: clienteId, user_id: userId });
        return res.status(400).json({ error: error.message });
      }

      logToFile("INFO", "Cliente eliminado com sucesso", { cliente_id: clienteId, user_id: userId });
      res.json({ success: true });
    } catch (error: any) {
      logToFile("ERROR", "Erro geral ao eliminar cliente", { error: error.message, cliente_id: clienteId, user_id: userId });
      res.status(500).json({ error: "Erro ao eliminar cliente" });
    }
  });

  app.get("/api/dashboard", authenticate, async (req, res) => {
    const userId = (req as any).user?.id;

    try {
      const db = supabaseAdmin || supabase;
      const { count: totalIncidents, error: incError } = await db.from('incidents').select('*', { count: 'exact', head: true });
      if (incError) {
        logToFile("ERROR", "Erro ao contar incidentes no dashboard", { error: incError.message, user_id: userId });
      }

      const { count: totalAssets, error: assetError } = await db.from('assets').select('*', { count: 'exact', head: true });
      if (assetError) {
        logToFile("ERROR", "Erro ao contar ativos no dashboard", { error: assetError.message, user_id: userId });
      }

      const { count: criticalAssets, error: critError } = await db.from('assets').select('*', { count: 'exact', head: true }).eq('probabilidade_falha', 'Alta');
      if (critError) {
        logToFile("ERROR", "Erro ao contar ativos críticos no dashboard", { error: critError.message, user_id: userId });
      }

      // Process list locally
      const { data: incidents, error: incDataError } = await supabase.from('incidents').select('*, properties(endereco)');
      if (incDataError) {
        logToFile("ERROR", "Erro ao carregar incidentes para dashboard", { error: incDataError.message, user_id: userId });
      }

      const byStatus: any = {};
      const bySeverity: any = {};
      const byCategory: any = {};
      let slaComplianceCount = 0;
      let resolvedCount = 0;

      (incidents || []).forEach(inc => {
        byStatus[inc.estado] = (byStatus[inc.estado] || 0) + 1;
        bySeverity[inc.severidade] = (bySeverity[inc.severidade] || 0) + 1;
        byCategory[inc.categoria] = (byCategory[inc.categoria] || 0) + 1;

        if (inc.data_resolucao && inc.sla_resolucao_limite) {
          resolvedCount++;
          if (new Date(inc.data_resolucao) <= new Date(inc.sla_resolucao_limite)) {
            slaComplianceCount++;
          }
        }
      });

      const formatCounts = (obj: any, keyName: string) => Object.entries(obj).map(([k, v]) => ({ [keyName]: k, count: v }));

      // NEW: Budget Summary Data
      const { data: clients, error: clientError } = await (supabaseAdmin || supabase).from('clientes').select('id, nome, orcamento_mensal');
      if (clientError) {
        logToFile("WARNING", "Erro ao carregar dados de orçamento no dashboard", { error: clientError.message });
      }

      logToFile("DEBUG", "Dashboard carregado com sucesso", { total_incidents: totalIncidents, total_assets: totalAssets, user_id: userId });

      res.json({
        totalIncidents: { count: totalIncidents || 0 },
        totalAssets: { count: totalAssets || 0 },
        criticalAssets: { count: criticalAssets || 0 },
        byStatus: formatCounts(byStatus, 'estado'),
        bySeverity: formatCounts(bySeverity, 'severidade'),
        byCategory: formatCounts(byCategory, 'categoria'),
        recentIncidents: (incidents || []).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5).map((i: any) => ({ ...i, property_name: i.properties?.endereco })),
        slaCompliance: resolvedCount === 0 ? 100 : Math.round((slaComplianceCount / resolvedCount) * 100 * 10) / 10,
        budgetSummary: clients || []
      });
    } catch (error: any) {
      logToFile("ERROR", "Erro geral ao carregar dashboard", { error: error.message, user_id: userId });
      res.status(500).json({ error: "Erro ao carregar dashboard" });
    }
  });

  app.get("/api/properties", authenticate, async (req, res) => {
    const { data } = await supabase.from('properties').select('*');
    res.json(data || []);
  });

  app.post("/api/properties", authenticate, async (req, res) => {
    const { codigo, endereco, inquilino, referencia_interna } = req.body;
    const userId = (req as any).user?.id;

    try {
      if (!codigo || !endereco) {
        logToFile("WARNING", "Tentativa de criar propriedade com dados obrigatórios faltando", { codigo, endereco, user_id: userId });
        return res.status(400).json({ error: "Código e Endereço são obrigatórios" });
      }

      const { data, error } = await supabase.from('properties').insert([{ codigo, endereco, inquilino, referencia_interna }]).select('id').single();
      
      if (error) {
        logToFile("ERROR", "Erro ao criar propriedade", { error: error.message, codigo, endereco, user_id: userId });
        return res.status(500).json({ error: "Erro ao criar propriedade" });
      }

      logToFile("INFO", "Propriedade criada com sucesso", { id: data?.id, codigo, endereco, user_id: userId });
      res.json({ id: data?.id });
    } catch (error: any) {
      logToFile("ERROR", "Erro geral ao criar propriedade", { error: error.message, codigo, endereco, user_id: userId });
      res.status(500).json({ error: "Erro ao criar propriedade" });
    }
  });

  app.get("/api/assets", authenticate, async (req, res) => {
    const db = supabaseAdmin || supabase;
    const { data, error } = await db.from('assets').select('*, properties(endereco)');
    if (error) {
      logToFile("ERROR", "Falha ao listar ativos", { error: error.message });
      return res.status(500).json({ error: error.message });
    }
    const mapped = (data || []).map((a: any) => ({ ...a, property_name: a.properties?.endereco }));
    res.json(mapped);
  });

  app.post("/api/assets", authenticate, async (req, res) => {
    const { nome, categoria, property_id, localizacao_detalhada, data_instalacao, probabilidade_falha, sinais_alerta, parent_id, obsoleto, data_obsolescencia } = req.body;
    const userId = (req as any).user?.id;
    
    try {
      if (!nome || !categoria) {
        logToFile("WARNING", "Tentativa de criar ativo com dados obrigatórios faltando", { nome, categoria, user_id: userId });
        return res.status(400).json({ error: "Nome e Categoria são obrigatórios" });
      }

      logToFile("INFO", "Tentativa de criar ativo", { nome, property_id, categoria, user_id: userId });

      // Payload base — colunas que sabemos que existem
      const basePayload: any = { 
        nome, 
        categoria, 
        property_id: property_id || null, 
        data_instalacao, 
        probabilidade_falha: probabilidade_falha || 'Baixa',
      };

      // Adicionar campos extras apenas se estiverem preenchidos
      if (localizacao_detalhada) basePayload.localizacao_detalhada = localizacao_detalhada;
      if (sinais_alerta) basePayload.sinais_alerta = sinais_alerta;
      if (parent_id) basePayload.parent_id = parent_id;
      if (obsoleto !== undefined) basePayload.obsoleto = obsoleto;
      if (data_obsolescencia) basePayload.data_obsolescencia = data_obsolescencia;

      const db = supabaseAdmin || supabase;
      
      // Tentar inserção completa
      let { data, error } = await db.from('assets').insert([basePayload]).select('id').single();
      
      // Fallback: Se o erro indicar coluna inexistente (PGRST204)
      if (error && error.code === 'PGRST204') {
        logToFile("WARNING", "Falha de schema ao criar ativo. Tentando payload mínimo.", { error: error.message, nome, categoria, user_id: userId });
        
        const minimalPayload = {
          nome,
          categoria,
          property_id: property_id || null,
          data_instalacao: data_instalacao || new Date().toISOString().split('T')[0],
          probabilidade_falha: probabilidade_falha || 'Baixa'
        };
        
        const retry = await db.from('assets').insert([minimalPayload]).select('id').single();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        logToFile("ERROR", "Falha definitiva ao criar ativo", { error: error.message, code: error.code, nome, categoria, user_id: userId });
        return res.status(500).json({ error: `Erro na base de dados: ${error.message}` });
      }

      logToFile("INFO", "Ativo criado com sucesso", { id: data?.id, nome, categoria, user_id: userId });
      res.json({ id: data?.id });
    } catch (error: any) {
      logToFile("ERROR", "Erro geral ao criar ativo", { error: error.message, nome, categoria, user_id: userId });
      res.status(500).json({ error: "Erro ao criar ativo" });
    }
  });

  // ─── Asset Inspections (Manual Inspection System) ─────────────────────────
  app.get("/api/asset-inspections", authenticate, async (req, res) => {
    const asset_id = req.query.asset_id as string;
    const db = supabaseAdmin || supabase;
    let query = db.from('asset_inspections').select('*, profiles!inspector_id(nome)').order('data_inspecao', { ascending: false });
    if (asset_id) query = query.eq('asset_id', asset_id);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    const mapped = (data || []).map((i: any) => ({ ...i, inspector_nome: i.profiles?.nome }));
    res.json(mapped);
  });

  app.post("/api/asset-inspections", authenticate, async (req, res) => {
    const { asset_id, data_inspecao, condicao_geral, anomalias_detectadas, descricao_anomalias, accoes_imediatas, requer_manutencao, componentes_verificados, observacoes, inspector_id } = req.body;
    const userId = (req as any).user?.id;

    try {
      if (!asset_id || !data_inspecao) {
        logToFile("WARNING", "Tentativa de criar inspeção com dados obrigatórios faltando", { asset_id, data_inspecao, user_id: userId });
        return res.status(400).json({ error: "Ativo e Data são obrigatórios" });
      }

      const payload: any = { asset_id, data_inspecao, condicao_geral, anomalias_detectadas, descricao_anomalias, accoes_imediatas, requer_manutencao, componentes_verificados, observacoes };
      if (inspector_id) payload.inspector_id = safeUserId(inspector_id);

      const db = supabaseAdmin || supabase;
      const { data, error } = await db.from('asset_inspections').insert([payload]).select('*').single();
      
      if (error) {
        logToFile("ERROR", "Erro ao criar inspeção de ativo", { error: error.message, asset_id, data_inspecao, user_id: userId });
        return res.status(500).json({ error: "Erro ao criar inspeção" });
      }

      logToFile("INFO", "Inspeção de ativo criada com sucesso", { id: data?.id, asset_id, data_inspecao, inspector_id, user_id: userId });
      res.json(data);
    } catch (error: any) {
      logToFile("ERROR", "Erro geral ao criar inspeção", { error: error.message, asset_id, user_id: userId });
      res.status(500).json({ error: "Erro ao criar inspeção" });
    }
  });



  app.get("/api/incidents", authenticate, async (req, res) => {
    const { data } = await supabase.from('incidents')
      .select('*, properties(endereco), profiles!responsavel_id(nome), clientes!cliente_id(nome)')
      .order('created_at', { ascending: false });
    const mapped = (data || []).map((i: any) => ({
      ...i,
      property_name: i.properties?.endereco,
      responsavel_nome: i.profiles?.nome,
      cliente_nome: i.clientes?.nome || null
    }));
    res.json(mapped);
  });

  app.post("/api/incidents", authenticate, async (req, res) => {
    const { property_id, asset_id, categoria, descricao, severidade, responsavel_id, custo_estimado } = req.body;
    const userId = (req as any).user.id;
    const now = new Date();

    logToFile("INFO", "Tentativa de criar incidente", { userId, categoria, severidade });

    // Load SLA from DB settings (fallback to hardcoded if not found)
    let respHours = 48, resHours = 120;
    try {
      const sevKey = severidade === 'Crítico' ? 'sla_critico' : severidade === 'Alto' ? 'sla_alto' : severidade === 'Médio' ? 'sla_medio' : 'sla_baixo';
      const { data: slaData } = await supabase.from('system_settings').select('setting_value').eq('setting_key', sevKey).single();
      if (slaData?.setting_value) {
        respHours = slaData.setting_value.resposta_horas ?? respHours;
        resHours = slaData.setting_value.resolucao_horas ?? resHours;
      }
    } catch { /* use defaults */ }

    const slaResp = new Date(now.getTime() + respHours * 60 * 60 * 1000).toISOString();
    const slaRes = new Date(now.getTime() + resHours * 60 * 60 * 1000).toISOString();

    const payload = {
      property_id, asset_id, categoria, descricao, severidade, responsavel_id,
      criado_por: safeUserId(userId),
      custo_estimado: parseFloat(custo_estimado) || 0,
      sla_resposta_limite: slaResp, sla_resolucao_limite: slaRes
    };

    logToFile("DEBUG", "Payload Incidente", payload);

    const { data, error } = await supabase.from('incidents').insert([payload]).select('id').single();

    if (error) {
      logToFile("ERROR", "Erro ao inserir incidente", { error: error.message, code: error.code });
      return res.status(500).json({ error: error.message });
    }

    if (responsavel_id) {
      createNotification(responsavel_id, "Novo Incidente Atribuído", `Foi-lhe atribuído um incidente de severidade ${severidade} em ${categoria}.`);
    }

    io.emit("incident-update", { action: 'create', incidentId: data?.id });
    res.json({ id: data?.id });
  });

  app.get("/api/incidents/:id", authenticate, async (req, res) => {
    const userId = (req as any).user?.id;
    const incidentId = req.params.id;

    try {
      const { data: incident, error: incError } = await supabase.from('incidents')
        .select('*, properties(endereco), profiles!responsavel_id(nome), clientes!cliente_id(nome)')
        .eq('id', incidentId)
        .single();

      if (incError) {
        logToFile("ERROR", "Erro ao carregar detalhe de incidente", { error: incError.message, incident_id: incidentId, user_id: userId });
        return res.status(500).json({ error: "Erro ao carregar incidente" });
      }

      if (!incident) {
        logToFile("WARNING", "Incidente não encontrado", { incident_id: incidentId, user_id: userId });
        return res.status(404).json({ error: "Incidente não encontrado" });
      }

      let criado_por_nome = null;
      if (incident?.criado_por) {
        const { data: creator } = await supabase.from('profiles').select('nome').eq('id', incident.criado_por).single();
        if (creator) criado_por_nome = creator.nome;
      }

      const { data: actions, error: actionsError } = await supabase.from('incident_actions').select('*, profiles(nome)').eq('incident_id', incidentId).order('created_at', { ascending: true });

      if (actionsError) {
        logToFile("WARNING", "Erro ao carregar ações de incidente (continuando)", { error: actionsError.message, incident_id: incidentId });
      }

      // Preferir nome do cliente (quando existir) caso o autor (criado_por) não seja um perfil do sistema
      const clienteNome = (incident as any)?.clientes?.nome;
      const finalCriadoPorNome = criado_por_nome || clienteNome || 'Cliente / Sistema';

      logToFile("DEBUG", "Incidente carregado com sucesso", { incident_id: incidentId, user_id: userId, estado: incident.estado });

      res.json({
        ...incident,
        property_name: (incident?.properties as any)?.endereco,
        responsavel_nome: (incident?.profiles as any)?.nome,
        criado_por_nome: finalCriadoPorNome,
        actions: (actions || []).map((a: any) => ({ ...a, user_nome: a.profiles?.nome }))
      });
    } catch (error: any) {
      logToFile("ERROR", "Erro geral ao carregar incidente", { error: error.message, incident_id: incidentId, user_id: userId });
      res.status(500).json({ error: "Erro ao carregar incidente" });
    }
  });

  app.post("/api/incidents/:id/actions", authenticate, async (req, res) => {
    let { descricao_acao, novo_estado, responsavel_id } = req.body;
    const userId = (req as any).user.id;
    const incidentId = req.params.id;

    try {
      let updateData: any = {};
      if (novo_estado) updateData.estado = novo_estado;
      if (responsavel_id) updateData.responsavel_id = responsavel_id;

      // Auto-generate audit message when assigning a technician
      let autoLogSuffix = '';
      if (responsavel_id) {
        const { data: techProfile } = await supabase.from('profiles').select('nome').eq('id', responsavel_id).single();
        const { data: assignerProfile } = await supabase.from('profiles').select('nome').eq('id', userId).single();
        autoLogSuffix = ` — Atribuído a: ${techProfile?.nome || 'Técnico'} (por ${assignerProfile?.nome || 'Gestor'})`;
      }

      const finalDesc = ((descricao_acao || '').trim() + autoLogSuffix) || '[Ação registada]';
      const { error: actionError } = await supabase.from('incident_actions').insert([{ incident_id: incidentId, user_id: safeUserId(userId), descricao_acao: finalDesc }]);

      if (actionError) {
        logToFile("ERROR", "Erro ao registar ação de incidente", { error: actionError.message, incident_id: incidentId, user_id: userId });
        return res.status(500).json({ error: "Erro ao registar ação" });
      }

      logToFile("INFO", "Ação de incidente registada com sucesso", { incident_id: incidentId, novo_estado, responsavel_id, user_id: userId });

      if (Object.keys(updateData).length > 0) {
        const { data: currentInc, error: getError } = await supabase.from('incidents').select('data_resposta, data_resolucao, responsavel_id, categoria').eq('id', incidentId).single();
        
        if (getError) {
          logToFile("ERROR", "Erro ao recuperar incidente para atualização", { error: getError.message, incident_id: incidentId });
          return res.status(500).json({ error: "Erro ao recuperar incidente" });
        }

        if (novo_estado) {
          if ((novo_estado === 'Atribuído' || novo_estado === 'Em progresso') && (!currentInc || !currentInc.data_resposta)) {
            updateData.data_resposta = new Date().toISOString();
          }
          if ((novo_estado === 'Resolvido' || novo_estado === 'Fechado') && (!currentInc || !currentInc.data_resolucao)) {
            updateData.data_resolucao = new Date().toISOString();
          }
        }

        const { error: updateError } = await supabase.from('incidents').update(updateData).eq('id', incidentId);
        if (updateError) {
          logToFile("ERROR", "Erro ao atualizar estado do incidente", { error: updateError.message, incident_id: incidentId, new_state: novo_estado });
          return res.status(500).json({ error: "Erro ao atualizar incidente" });
        }

        logToFile("INFO", "Incidente atualizado com sucesso", { incident_id: incidentId, novo_estado, responsavel_id, user_id: userId });

        // Notifications
        if (novo_estado && currentInc && currentInc.responsavel_id && currentInc.responsavel_id !== userId) {
          createNotification(currentInc.responsavel_id, "Atualização de Incidente", `O estado do incidente de ${currentInc.categoria} foi alterado para ${novo_estado}.`);
        }
        if (responsavel_id && responsavel_id !== currentInc?.responsavel_id && responsavel_id !== userId) {
          createNotification(responsavel_id, "Novo Incidente Atribuído", `Foi-lhe atribuído um incidente de ${currentInc?.categoria || 'Manutenção'}.`);
        }
      }

      io.emit("incident-update", { action: 'update', incidentId });
      res.json({ success: true });
    } catch (error: any) {
      logToFile("ERROR", "Erro geral ao adicionar ação a incidente", { error: error.message, incident_id: incidentId, user_id: userId });
      res.status(500).json({ error: "Erro ao processar ação de incidente" });
    }
  });

  // ─── System Settings (SLA etc.) ───────────────────────────────────────────
  app.get("/api/settings", authenticate, async (req, res) => {
    const { data, error } = await supabase.from('system_settings').select('*').order('setting_key');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  });

  app.patch("/api/settings/:key", authenticate, async (req, res) => {
    const userPerfil = (req as any).user.perfil;
    if (userPerfil !== 'Administrador') return res.status(403).json({ error: 'Apenas Administradores podem alterar configurações' });
    const { key } = req.params;
    const { setting_value } = req.body;

    // Upsert: update if exists, otherwise insert
    const { data: existing, error: fetchError } = await supabase.from('system_settings').select('*').eq('setting_key', key).single();
    if (fetchError && fetchError.code !== 'PGRST116') {
      return res.status(500).json({ error: fetchError.message });
    }

    if (existing) {
      const { data, error } = await supabase.from('system_settings')
        .update({ setting_value, updated_at: new Date().toISOString() })
        .eq('setting_key', key).select('*').single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    const { data, error } = await supabase.from('system_settings').insert([{ setting_key: key, setting_value, description: key }]).select('*').single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.get("/api/maintenance-plans", authenticate, async (req, res) => {
    try {
      const { data, error } = await supabase.from('maintenance_plans').select('*, assets(nome), profiles!responsavel_id(nome)');
      if (error) {
        logToFile("ERROR", "Erro ao buscar planos de manutenção", { error: error.message });
        return res.status(500).json({ error: error.message });
      }
      const mapped = (data || []).map((m: any) => {
        return { ...m, asset_name: m.assets?.nome, responsavel_nome: m.profiles?.nome };
      });
      res.json(mapped);
    } catch (error: any) {
      logToFile("ERROR", "Erro geral ao buscar planos de manutenção", { error: error.message });
      res.status(500).json({ error: "Erro ao buscar planos de manutenção" });
    }
  });

  app.post("/api/maintenance-plans", authenticate, async (req, res) => {
    const userId = (req as any).user?.id;
    const { asset_id, tipo, periodicidade, proxima_data, responsavel_id, custo_estimado, descricao } = req.body;

    try {
      if (!asset_id || !responsavel_id) {
        logToFile("WARNING", "Tentativa de criar plano sem ativo/responsável", { asset_id, responsavel_id, userId });
        return res.status(400).json({ error: "Ativo e Responsável são obrigatórios" });
      }

      // Validar que o ativo existe
      const { data: assetExists, error: assetError } = await supabase.from('assets').select('id').eq('id', asset_id).single();
      if (assetError || !assetExists) {
        logToFile("WARNING", "Tentativa de criar plano com ativo inexistente", { asset_id, responsavel_id, userId });
        return res.status(400).json({ error: "Ativo não encontrado no sistema" });
      }

      // Validar que o responsável existe E É UM PERFIL VÁLIDO
      const { data: responsavelExists, error: responsavelError } = await supabase.from('profiles').select('id, nome, perfil').eq('id', responsavel_id).single();
      if (responsavelError || !responsavelExists) {
        logToFile("WARNING", "Tentativa de criar plano com responsável inexistente", { asset_id, responsavel_id, userId });
        return res.status(400).json({ error: "Responsável (Técnico) não encontrado no sistema. Verifique se o utilizador existe e está ativo." });
      }

      // Verificar que o responsável é técnico ou gestor (não cliente)
      if (!['Técnico', 'Gestor', 'Administrador'].includes(responsavelExists.perfil)) {
        logToFile("WARNING", "Tentativa de atribuir plano a utilizador não-técnico", { asset_id, responsavel_id, perfil: responsavelExists.perfil, userId });
        return res.status(400).json({ error: `Apenas Técnicos, Gestores ou Administradores podem ser responsáveis por planos. O utilizador é: ${responsavelExists.perfil}` });
      }

      const { data, error } = await supabase.from('maintenance_plans').insert([{
        asset_id, tipo, periodicidade, proxima_data, responsavel_id, custo_estimado: parseFloat(custo_estimado) || 0, descricao,
        estado: 'Pendente'
      }]).select('id').single();

      if (error) {
        logToFile("ERROR", "Erro ao criar plano de manutenção", { error: error.message, asset_id, tipo, responsavel_id, responsavel_nome: responsavelExists.nome, userId });
        return res.status(500).json({ error: "Erro interno ao criar plano. Por favor tente novamente." });
      }

      logToFile("INFO", "Plano de manutenção criado com sucesso", { id: data?.id, asset_id, tipo, responsavel_id, userId });
      createNotification(responsavel_id, "Novo Plano de Manutenção", `Foi-lhe atribuída a manutenção ${tipo} para o ativo.`);
      res.json({ id: data?.id });
    } catch (error: any) {
      logToFile("ERROR", "Erro geral ao criar plano de manutenção", { error: error.message, asset_id, tipo, userId });
      res.status(500).json({ error: "Erro ao criar plano de manutenção" });
    }
  });

  app.patch("/api/maintenance-plans/:id/complete", authenticate, async (req, res) => {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    try {
      // Verify plan exists first
      const { data: planExists, error: getError } = await supabase.from('maintenance_plans').select('id, estado').eq('id', id).single();
      if (getError || !planExists) {
        logToFile("WARNING", "Tentativa de concluir plano inexistente", { id, user_id: userId });
        return res.status(404).json({ error: "Plano de manutenção não encontrado" });
      }

      const completionDate = new Date().toISOString();
      const updatePayload: any = { completed_at: completionDate };

      // Try updating with different possible column names
      let lastError: any = null;
      let success = false;

      // Try 1: "completed" status
      const { error: err1 } = await supabase.from('maintenance_plans')
        .update({ ...updatePayload, status: 'Concluído' })
        .eq('id', id);
      if (!err1) {
        success = true;
      } else {
        lastError = err1;
      }

      // Try 2: "estado" status if first failed
      if (!success && lastError?.message?.includes("column")) {
        const { error: err2 } = await supabase.from('maintenance_plans')
          .update({ ...updatePayload, estado: 'Concluído' })
          .eq('id', id);
        if (!err2) {
          success = true;
        } else {
          lastError = err2;
        }
      }

      // Try 3: Just mark as completed without status update
      if (!success && lastError?.message?.includes("column")) {
        const { error: err3 } = await supabase.from('maintenance_plans')
          .update(updatePayload)
          .eq('id', id);
        if (!err3) {
          success = true;
        } else {
          lastError = err3;
        }
      }

      if (!success && lastError) {
        logToFile("ERROR", "Erro ao concluir plano de manutenção", { error: lastError.message, id, user_id: userId });
        return res.status(500).json({ error: "Erro ao concluir plano. Verifique o schema da tabela." });
      }

      logToFile("INFO", "Plano de manutenção concluído com sucesso", { id, user_id: userId, completion_time: completionDate });
      res.json({ success: true, completed_at: completionDate });
    } catch (error: any) {
      logToFile("ERROR", "Erro geral ao concluir plano de manutenção", { error: error.message, id, user_id: userId });
      res.status(500).json({ error: "Erro ao concluir plano" });
    }
  });

  app.delete("/api/maintenance-plans/:id", authenticate, async (req, res) => {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    try {
      const { error } = await supabase.from('maintenance_plans').delete().eq('id', id);
      
      if (error) {
        logToFile("ERROR", "Erro ao eliminar plano de manutenção", { error: error.message, id, userId });
        return res.status(500).json({ error: error.message });
      }

      logToFile("INFO", "Plano de manutenção eliminado", { id, userId });
      res.json({ success: true });
    } catch (error: any) {
      logToFile("ERROR", "Erro geral ao eliminar plano de manutenção", { error: error.message, id, userId });
      res.status(500).json({ error: "Erro ao eliminar plano" });
    }
  });

  app.get("/api/planning-5y", authenticate, async (req, res) => {
    const userId = (req as any).user?.id;
    try {
      const { data, error } = await supabase.from('planning_5y').select('*').order('ano', { ascending: true }).order('trimestre', { ascending: true });
      if (error) {
        logToFile("ERROR", "Erro ao buscar planejamento 5 anos", { error: error.message, userId });
        return res.status(500).json({ error: "Erro ao buscar planejamento" });
      }
      logToFile("DEBUG", "Planejamento 5 anos recuperado", { count: data?.length || 0, userId });
      res.json(data || []);
    } catch (error: any) {
      logToFile("ERROR", "Erro geral ao buscar planejamento", { error: error.message, userId });
      res.status(500).json({ error: "Erro ao buscar planejamento" });
    }
  });

  app.post("/api/planning-5y", authenticate, async (req, res) => {
    const { item, ano, trimestre, observacoes } = req.body;
    const userId = (req as any).user?.id;
    try {
      if (!item || !ano || !trimestre) {
        logToFile("WARNING", "Tentativa de criar planejamento com dados obrigatórios faltando", { item, ano, trimestre, userId });
        return res.status(400).json({ error: "Item, Anos e Trimestre são obrigatórios" });
      }
      const { data, error } = await supabase.from('planning_5y').insert([{ item, ano, trimestre, observacoes }]);
      if (error) {
        logToFile("ERROR", "Erro ao criar planejamento 5 anos", { error: error.message, item, ano, trimestre, userId });
        return res.status(500).json({ error: "Erro ao criar planejamento" });
      }
      logToFile("INFO", "Planejamento 5 anos criado com sucesso", { item, ano, trimestre, user_id: userId });
      res.json({ success: true });
    } catch (error: any) {
      logToFile("ERROR", "Erro geral ao criar planejamento", { error: error.message, item, ano, userId });
      res.status(500).json({ error: "Erro ao criar planejamento" });
    }
  });

  app.get('/api/inventory', authenticate, async (req, res) => {
    const mapInventoryItem = (item: any) => ({
      id: item.id,
      nome: item.name ?? item.nome,
      categoria: item.category ?? item.categoria,
      quantidade: item.quantity_on_hand ?? item.quantidade,
      stock_minimo: item.min_quantity ?? item.stock_minimo,
      preco_compra: item.unit_cost ?? item.preco_compra,
      sku: item.sku,
      image_url: item.image_url,
      property_id: item.property_id,
      asset_id: item.asset_id,
      property_name: item.properties?.endereco || 'N/A',
      asset_name: item.assets?.nome || 'N/A'
    });

    const fetchInventory = async (orderBy: string) => {
      return supabase
        .from('inventory')
        .select(`
          *,
          properties:property_id (endereco)
        `)
        .order(orderBy);
    };

    try {
      // First try ordering by the modern English column name, fallback to Portuguese if missing
      const { data, error } = await fetchInventory('name');
      if (error) {
        if (error.message?.includes("Could not find the 'name' column")) {
          const { data: dataFallback, error: errorFallback } = await fetchInventory('nome');
          if (errorFallback) throw errorFallback;
          const flattenedData = (dataFallback || []).map(mapInventoryItem);
          return res.json(flattenedData);
        }
        throw error;
      }

      const flattenedData = (data || []).map(mapInventoryItem);
      res.json(flattenedData);
    } catch (error: any) {
      // If the schema doesn't have asset_id, we still want to return inventory rows without that join
      if (error?.message?.includes("Could not find the 'asset_id' column")) {
        try {
          const { data } = await supabase
            .from('inventory')
            .select(`
              *,
              properties:property_id (endereco)
            `)
            .order('name');

          const flattenedData = (data || []).map(item => ({
            ...mapInventoryItem(item),
            asset_name: 'N/A'
          }));
          return res.json(flattenedData);
        } catch (inner) {
          return res.status(500).json({ error: (inner as any).message });
        }
      }
      res.status(500).json({ error: error.message });
    }
  });

  const safeSupabaseInsert = async (table: string, payload: Record<string, any>, select = 'id'): Promise<{ data: any; error: any }> => {
    const { data, error } = await supabase.from(table).insert([payload]).select(select).single();
    if (!error) return { data, error: null };

    const match = error.message?.match(/Could not find the '([^']+)' column/);
    if (match?.[1]) {
      const missing = match[1];
      logToFile("WARNING", `Campo ${missing} não existe na tabela, ignorado`, { missing, payload });
      const newPayload = { ...payload };
      delete newPayload[missing];
      if (Object.keys(newPayload).length === 0) return { data: null, error };
      return safeSupabaseInsert(table, newPayload, select);
    }

    return { data: null, error };
  };

  const safeSupabaseUpdate = async (table: string, id: string, payload: Record<string, any>): Promise<{ data: any; error: any }> => {
    const { data, error } = await supabase.from(table).update(payload).eq('id', id).select('*').single();
    if (!error) return { data, error: null };

    const match = error.message?.match(/Could not find the '([^']+)' column/);
    if (match?.[1]) {
      const missing = match[1];
      logToFile("WARNING", `Campo ${missing} não existe na tabela, ignorado`, { missing, payload, id });
      const newPayload = { ...payload };
      delete newPayload[missing];
      if (Object.keys(newPayload).length === 0) return { data: null, error };
      return safeSupabaseUpdate(table, id, newPayload);
    }

    return { data: null, error };
  };

  app.post('/api/inventory', authenticate, async (req, res) => {
    const userId = (req as any).user?.id;
    try {
      const { nome, categoria, quantidade, stock_minimo, preco_compra, sku, image_url, property_id, asset_id } = req.body;

      // Map incoming form fields (Portuguese) to the actual inventory table columns
      const payload: Record<string, any> = {};

      if (nome) payload.name = nome;
      if (categoria) payload.category = categoria;
      if (quantidade !== undefined && quantidade !== null && quantidade !== '') payload.quantity_on_hand = parseInt(quantidade);
      if (stock_minimo !== undefined && stock_minimo !== null && stock_minimo !== '') payload.min_quantity = parseInt(stock_minimo);
      if (preco_compra !== undefined && preco_compra !== null && preco_compra !== '') payload.unit_cost = parseFloat(preco_compra);
      if (sku) payload.sku = sku;
      if (image_url) payload.image_url = image_url;
      if (property_id) payload.property_id = property_id;
      if (asset_id) payload.asset_id = asset_id;

      // Ensure required not-null columns are provided
      if (!payload.name) {
        return res.status(400).json({ error: 'O campo nome é obrigatório.' });
      }

      if (Object.keys(payload).length === 0) {
        return res.status(400).json({ error: 'Nenhum campo válido fornecido para o inventário.' });
      }

      // Final insert into the inventory table
      const { data, error } = await safeSupabaseInsert('inventory', payload, 'id');

      if (error) {
        logToFile("ERROR", "Erro ao inserir inventory", { error: error.message, payload, userId });
        return res.status(500).json({ error: error.message });
      }

      logToFile("INFO", "Inventory inserido com sucesso", { id: data?.id, userId, fields: Object.keys(payload) });
      res.json({ id: data?.id });
    } catch (error: any) {
      logToFile("ERROR", "Erro geral no inventory POST", { error: error.message, userId });
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/inventory/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    try {
      const { nome, categoria, quantidade, stock_minimo, preco_compra, sku, image_url, property_id, asset_id } = req.body;
      const payload: Record<string, any> = {};

      if (nome) payload.name = nome;
      if (categoria) payload.category = categoria;
      if (quantidade !== undefined && quantidade !== null && quantidade !== '') payload.quantity_on_hand = parseInt(quantidade);
      if (stock_minimo !== undefined && stock_minimo !== null && stock_minimo !== '') payload.min_quantity = parseInt(stock_minimo);
      if (preco_compra !== undefined && preco_compra !== null && preco_compra !== '') payload.unit_cost = parseFloat(preco_compra);
      if (sku) payload.sku = sku;
      if (image_url) payload.image_url = image_url;
      if (property_id) payload.property_id = property_id;
      if (asset_id) payload.asset_id = asset_id;

      if (Object.keys(payload).length === 0) {
        return res.status(400).json({ error: 'Nenhum campo válido fornecido para atualização.' });
      }

      const { data, error } = await safeSupabaseUpdate('inventory', id, payload);
      if (error) {
        logToFile('ERROR', 'Erro ao atualizar inventory', { error: error.message, id, userId, fields: Object.keys(payload) });
        return res.status(500).json({ error: error.message });
      }

      logToFile('INFO', 'Inventory atualizado com sucesso', { id, userId, fields: Object.keys(payload) });
      io.emit('inventory-update', { part_id: id });
      res.json(data);
    } catch (error: any) {
      logToFile('ERROR', 'Erro geral no inventory PATCH', { error: error.message, id, userId });
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/inventory/:id/stock", authenticate, async (req, res) => {
    const { quantity_change, type } = req.body; // type: 'add' or 'remove'
    const { id } = req.params;
    const userId = (req as any).user?.id;

    // First get current stock
    const { data: item, error: fetchError } = await supabase.from('inventory').select('quantity_on_hand').eq('id', id).single();
    if (fetchError) return res.status(404).json({ error: "Item not found" });

    const currentQuantity = item.quantity_on_hand;
    const newQuantity = type === 'add' ? currentQuantity + quantity_change : currentQuantity - quantity_change;
    const { data: updated, error: updateError } = await supabase.from('inventory').update({ quantity_on_hand: Math.max(0, newQuantity) }).eq('id', id).select('*').single();

    if (updateError) return res.status(500).json({ error: updateError.message });

    logToFile('INFO', 'Stock atualizado', { id, userId, type, quantity_change, previous: currentQuantity, current: updated?.quantity_on_hand });
    io.emit("inventory-update", { part_id: id });
    res.json(updated);
  });

  app.patch("/api/incidents/batch", authenticate, async (req, res) => {
    const { ids, updates } = req.body; // ids: string[], updates: { estado?, severidade? }
    if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "No IDs provided" });

    const { data, error } = await supabase.from('incidents').update(updates).in('id', ids).select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  // ─── Incident Checklists & Parts ────────────────────────────────────────
  app.get("/api/incidents/:id/checklists", authenticate, async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase.from('incident_checklists').select('*').eq('incident_id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  });

  app.post("/api/incidents/:id/checklists", authenticate, async (req, res) => {
    const { id } = req.params;
    const { task_description } = req.body;
    const userId = (req as any).user.id;
    
    logToFile("INFO", "Tentativa de criar checklist", { id, userId, task_description });
    
    const payload = { incident_id: id, task_description, is_completed: false, ...userAuditPayload(userId) };
    logToFile("DEBUG", "Payload Checklist", payload);

    const { data, error } = await supabase.from('incident_checklists').insert([payload]).select('*').single();
    if (error) {
      logToFile("ERROR", "Falha ao gravar checklist", { error: error.message, code: error.code, payload });
      return res.status(500).json({ error: error.message });
    }
    res.json(data);
  });

  app.patch("/api/incidents/:id/checklists/:checklistId", authenticate, async (req, res) => {
    const { is_completed } = req.body;
    const { id, checklistId } = req.params;
    const { data, error } = await supabase.from('incident_checklists').update({ is_completed }).eq('id', checklistId).select('*').single();
    if (error) {
       logToFile("ERROR", "Falha ao atualizar checklist", { error: error.message });
       return res.status(500).json({ error: error.message });
    }
    io.emit("incident-update", { action: 'checklist', incidentId: id });
    res.json(data);
  });

  app.delete("/api/incidents/:id/checklists/:checklistId", authenticate, async (req, res) => {
    const { id, checklistId } = req.params;
    const userId = (req as any).user.id;
    const userPerfil = (req as any).user.perfil;

    // Fetch the item to verify creator and get description
    const { data: item, error: fetchErr } = await supabase.from('incident_checklists').select('user_id, task_description').eq('id', checklistId).single();
    if (fetchErr || !item) return res.status(404).json({ error: 'Tarefa não encontrada' });

    // Only creator, Gestor or Admin can delete
    if (item.user_id !== userId && !['Administrador', 'Gestor'].includes(userPerfil)) {
      return res.status(403).json({ error: 'Sem permissão para eliminar esta tarefa' });
    }

    await supabase.from('incident_checklists').delete().eq('id', checklistId);

    // Audit log entry
    await supabase.from('incident_actions').insert([{
      incident_id: id, user_id: safeUserId(userId),
      descricao_acao: `[✕ Tarefa eliminada] ${item.task_description}`
    }]);

    res.json({ success: true });
  });

  app.get("/api/incidents/:id/parts", authenticate, async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase.from('incident_parts').select('*, inventory(name, unit_cost, sku)').eq('incident_id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  });

  app.post("/api/incidents/:id/parts", authenticate, async (req, res) => {
    const { id } = req.params;
    const { part_id, quantity_used } = req.body;
    const userId = (req as any).user.id;
    const qty = parseInt(quantity_used) || 1;

    logToFile("INFO", "Tentativa de registar material", { id, userId, part_id, qty });

    // Decrease inventory stock
    const { data: part, error: partError } = await supabase.from('inventory').select('quantity_on_hand, name').eq('id', part_id).single();
    if (partError) {
      logToFile("ERROR", "Peça não encontrada no inventário", { part_id });
      return res.status(404).json({ error: "Peça não encontrada no inventário" });
    }

    if (part.quantity_on_hand < qty) {
      logToFile("ERROR", "Stock insuficiente", { part_id, onHand: part.quantity_on_hand, requested: qty });
      return res.status(400).json({ error: "Stock insuficiente" });
    }

    const payload = { incident_id: id, part_id, quantity_used: qty, ...userAuditPayload(userId) };
    logToFile("DEBUG", "Payload Material", payload);

    await supabase.from('inventory').update({ quantity_on_hand: part.quantity_on_hand - qty }).eq('id', part_id);

    const { data, error } = await supabase.from('incident_parts').insert([payload]).select('*, inventory(name, unit_cost, sku)').single();
    if (error) {
       logToFile("ERROR", "Falha ao gravar incident_parts", { error: error.message, code: error.code, payload });
       return res.status(500).json({ error: error.message });
    }

    // Audit log
    await supabase.from('incident_actions').insert([{
      incident_id: id, user_id: safeUserId(userId),
      descricao_acao: `[+ Material registado] ${part.name} x${qty}`
    }]);

    res.json(data);
  });

  app.delete("/api/incidents/:id/parts/:partId", authenticate, async (req, res) => {
    const { id, partId } = req.params;
    const userId = (req as any).user.id;
    const userPerfil = (req as any).user.perfil;

    // Fetch the part entry
    const { data: entry, error: fetchErr } = await supabase.from('incident_parts').select('user_id, part_id, quantity_used, inventory(name)').eq('id', partId).single();
    if (fetchErr || !entry) return res.status(404).json({ error: 'Material não encontrado' });

    // Only creator, Gestor or Admin can delete
    if (entry.user_id !== userId && !['Administrador', 'Gestor'].includes(userPerfil)) {
      return res.status(403).json({ error: 'Sem permissão para eliminar este material' });
    }

    // Restore inventory stock
    const { data: invItem } = await supabase.from('inventory').select('quantity_on_hand').eq('id', entry.part_id).single();
    if (invItem) {
      await supabase.from('inventory').update({ quantity_on_hand: invItem.quantity_on_hand + entry.quantity_used }).eq('id', entry.part_id);
    }

    await supabase.from('incident_parts').delete().eq('id', partId);

    // Audit log
    const partName = (entry as any).inventory?.name || 'Material';
    await supabase.from('incident_actions').insert([{
      incident_id: id, user_id: userId,
      descricao_acao: `[- Material revertido] ${partName} x${entry.quantity_used} (stock restaurado)`
    }]);

    res.json({ success: true });
  });

  // ─── Asset Meter Readings ───────────────────────────────────────────────
  app.get("/api/assets/:id/meter-readings", authenticate, async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase.from('meter_readings').select('*').eq('asset_id', id).order('recorded_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  });

  app.post("/api/assets/:id/meter-readings", authenticate, async (req, res) => {
    const { id } = req.params;
    const { reading_value, unit } = req.body;
    const userId = (req as any).user.id;
    const value = parseFloat(reading_value) || 0;
    const payload = { asset_id: id, reading_value: value, unit, user_id: userId, recorded_at: new Date().toISOString() };

    // Check for PM triggers based on meter reading
    const { data: pmSchedules } = await supabase.from('pm_schedules').select('*').eq('asset_id', id);
    const pmTrigger = (pmSchedules || []).find(s => s.threshold_value && value >= s.threshold_value);

    if (pmTrigger) {
      const incidentPayload = {
        categoria: pmTrigger.categoria || 'Manutenção Corretiva',
        descricao: `[AUTOMÁTICO - TRIGGER] ${pmTrigger.task_description}. Leitura atingiu ${value} ${unit}.`,
        severidade: 'Alto',
        estado: 'Aberto',
        asset_id: id,
        property_id: '1', // Default property
        created_at: new Date().toISOString()
      };
      await supabase.from('incidents').insert([incidentPayload]);
    }

    const { data, error } = await supabase.from('meter_readings').insert([payload]).select('*').single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  // --- Labor Tracking Timer ---
  app.get("/api/incidents/:id/labor", authenticate, async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase.from('incident_labor').select('*, profiles!user_id(nome)').eq('incident_id', id).order('start_time', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    const mapped = (data || []).map((l: any) => ({ ...l, user_nome: l.profiles?.nome || 'Técnico' }));
    res.json(mapped);
  });

  app.post("/api/incidents/:id/timer/start", authenticate, async (req, res) => {
    const { id } = req.params;
    const userId = (req as any).user.id;
    logToFile("INFO", "Iniciar timer", { id, userId });
    const payload = { incident_id: id, ...userAuditPayload(userId), start_time: new Date().toISOString() };
    logToFile("DEBUG", "Payload Timer", payload);

    const { data, error } = await supabase.from('incident_labor').insert([payload]).select('*').single();
    if (error) {
      logToFile("ERROR", "Falha ao iniciar timer", { error: error.message, code: error.code, payload });
      return res.status(500).json({ error: error.message });
    }
    res.json(data);
  });

  app.post("/api/incidents/:id/timer/stop", authenticate, async (req, res) => {
    const { laborId } = req.body;
    const stopTime = new Date().toISOString();

    const { data, error } = await supabase.from('incident_labor').update({ end_time: stopTime }).eq('id', laborId).select('*').single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  // --- Incident Media (Photos) ---
  app.get("/api/incidents/:id/media", authenticate, async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase.from('incident_media').select('*').eq('incident_id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  });

  app.post("/api/incidents/:id/media", authenticate, async (req, res) => {
    const { id } = req.params;
    const { image_url, type } = req.body;
    let finalImageUrl = image_url;

    // Se for base64, gravar localmente
    if (image_url && image_url.startsWith('data:image')) {
       try {
         const matches = image_url.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
         if (matches && matches.length === 3) {
           const fileExtension = matches[1];
           const base64Data = matches[2];
           const fileName = `media_${id}_${crypto.randomUUID().substring(0,8)}.${fileExtension}`;
           const filePath = path.join(process.cwd(), 'public', 'uploads', 'incidents', fileName);
           
           if (!fs.existsSync(path.join(process.cwd(), 'public', 'uploads', 'incidents'))) {
             fs.mkdirSync(path.join(process.cwd(), 'public', 'uploads', 'incidents'), { recursive: true });
           }

           fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
           finalImageUrl = `/uploads/incidents/${fileName}`;
         }
       } catch (err: any) {
         logToFile("ERROR", "Erro ao gravar media base64", { err: err.message });
       }
    }

    const payload = { incident_id: id, image_url: finalImageUrl, type: type || 'outro', uploaded_at: new Date().toISOString() };

    const { data, error } = await supabase.from('incident_media').insert([payload]).select('*').single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.get("/api/system/status", authenticate, (req, res) => {
    res.json({ status: "Operacional", modules: ["Incidentes", "Ativos", "Manutenção", "Inventário", "Automação PM"], adminKey: !!SUPABASE_SERVICE_KEY });
  });

  app.get("/api/debug/ping", (req, res) => {
    logToFile("INFO", "Ping de debug recebido");
    res.json({ pong: true, time: new Date().toISOString(), logFileExists: fs.existsSync(logFilePath) });
  });


  // --- PM Schedules Setup ---
  app.get("/api/pm/schedules", authenticate, async (req, res) => {
    try {
      const { data, error } = await supabase.from('pm_schedules').select('*');
      if (error) {
        // Return empty array instead of 500 to prevent client crash if table is missing
        return res.json([]);
      }
      res.json(data || []);
    } catch (e: any) {
      res.json([]);
    }
  });

  app.post("/api/pm/schedules", authenticate, async (req, res) => {
    const userId = (req as any).user?.id;
    const { asset_id, task_description, frequency_days, threshold_value, categoria } = req.body;

    try {
      // Validation
      if (!asset_id || !task_description) {
        logToFile("WARNING", "Tentativa de criar agendamento sem ativo/descrição", { asset_id, task_description, user_id: userId });
        return res.status(400).json({ error: "Ativo e Descrição da Tarefa são obrigatórios" });
      }

      // Verify asset exists
      const { data: assetExists, error: assetError } = await supabase.from('assets').select('id').eq('id', asset_id).single();
      if (assetError || !assetExists) {
        logToFile("WARNING", "Tentativa de criar agendamento com ativo inexistente", { asset_id, user_id: userId });
        return res.status(400).json({ error: "Ativo não encontrado no sistema" });
      }

      const payload = {
        asset_id,
        task_description,
        frequency_days: frequency_days ? parseInt(frequency_days) : null,
        threshold_value: threshold_value ? parseInt(threshold_value) : null,
        categoria: categoria || 'Preventiva',
        created_by: safeUserId(userId),
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase.from('pm_schedules').insert([payload]).select('*').single();
      
      if (error) {
        logToFile("ERROR", "Erro ao criar agendamento de automação", { error: error.message, asset_id, task_description, user_id: userId });
        return res.status(500).json({ error: "Erro ao criar agendamento" });
      }

      logToFile("INFO", "Agendamento de automação criado com sucesso", { id: data?.id, asset_id, frequency_days, categoria, user_id: userId });
      res.json(data);
    } catch (error: any) {
      logToFile("ERROR", "Erro geral ao criar agendamento de automação", { error: error.message, asset_id, user_id: userId });
      res.status(500).json({ error: "Erro ao criar agendamento" });
    }
  });

  // Periodic check for Time-based PM (Simulation)
  setInterval(async () => {
    const now = new Date();
    // In a real app, we would query the DB for schedules due today
    /* 
    const { data: schedules } = await supabase.from('pm_schedules').select('*');
    (schedules || []).forEach(async (pm) => {
      // Logic for triggering PMs goes here in production
    });
    */
  }, 3600000); // Check every hour

  // ========================================
  // --- UNIFIED MAINTENANCE MANAGEMENT ENDPOINTS ---
  // These endpoints replace the separate Automation + Maintenance modules
  // ========================================

  // GET: List all maintenance schedules (for tab "Agendamentos")
  app.get("/api/maintenance/schedules", authenticate, async (req, res) => {
    const userId = (req as any).user?.id;
    try {
      logToFile("DEBUG", "Listando agendamentos de manutenção", { user_id: userId });
      
      const { data, error } = await supabase.from('pm_schedules').select('*, assets(nome)');
      if (error?.message?.includes('find the table')) {
        logToFile("INFO", "Tabela pm_schedules não existe ainda");
        return res.json([]);
      }
      if (error) {
        logToFile("ERROR", "Erro ao listar agendamentos", { error: error.message });
        return res.status(500).json({ error: "Erro ao listar agendamentos" });
      }
      
      res.json(data || []);
    } catch (error: any) {
      logToFile("ERROR", "Erro geral ao listar agendamentos", { error: error.message, user_id: userId });
      res.status(500).json({ error: "Erro ao listar agendamentos" });
    }
  });

  // POST: Create a new maintenance schedule
  app.post("/api/maintenance/schedules", authenticate, async (req, res) => {
    const userId = (req as any).user?.id;
    const { asset_id, task_description, frequency_days, threshold_value, categoria } = req.body;

    try {
      // Validation
      if (!asset_id || !task_description) {
        logToFile("WARNING", "Tentativa de criar agendamento sem dados obrigatórios", { asset_id, task_description, user_id: userId });
        return res.status(400).json({ error: "Ativo e Descrição são obrigatórios" });
      }

      if (!frequency_days && !threshold_value) {
        logToFile("WARNING", "Agendamento sem frequência ou limiar", { asset_id, user_id: userId });
        return res.status(400).json({ error: "Defina uma frequência em dias ou um limiar de uso" });
      }

      // Verify asset exists
      const { data: assetExists, error: assetError } = await supabase.from('assets').select('id').eq('id', asset_id).single();
      if (assetError || !assetExists) {
        logToFile("WARNING", "Tentativa de criar agendamento com ativo inexistente", { asset_id, user_id: userId });
        return res.status(400).json({ error: "Ativo não encontrado no sistema" });
      }

      const payload = {
        asset_id,
        task_description,
        frequency_days: frequency_days ? parseInt(frequency_days) : null,
        threshold_value: threshold_value ? parseInt(threshold_value) : null,
        categoria: categoria || 'Preventiva',
        created_by: safeUserId(userId),
        created_at: new Date().toISOString(),
        is_active: true
      };

      const { data, error } = await supabase.from('pm_schedules').insert([payload]).select('*').single();
      
      if (error) {
        logToFile("ERROR", "Erro ao criar agendamento unificado", { error: error.message, asset_id, user_id: userId });
        return res.status(500).json({ error: "Erro ao criar agendamento" });
      }

      logToFile("INFO", "Agendamento de manutenção unificado criado", { id: data?.id, asset_id, categoria, user_id: userId });
      res.json(data);
    } catch (error: any) {
      logToFile("ERROR", "Erro geral ao criar agendamento", { error: error.message, user_id: userId });
      res.status(500).json({ error: "Erro ao criar agendamento" });
    }
  });

  // GET: List active maintenance executions (for tab "Planos Ativos")
  app.get("/api/maintenance/executions", authenticate, async (req, res) => {
    const userId = (req as any).user?.id;
    try {
      logToFile("DEBUG", "Listando planos de manutenção ativos", { user_id: userId });
      
      const { data, error } = await supabase
        .from('maintenance_plans')
        .select('*, assets(nome), profiles!responsavel_id(nome)')
        .neq('estado', 'Concluído');
      
      if (error) {
        logToFile("ERROR", "Erro ao listar planos ativos", { error: error.message });
        return res.status(500).json({ error: "Erro ao listar planos" });
      }
      
      const mapped = (data || []).map((m: any) => ({
        ...m,
        asset_name: (Array.isArray(m.assets) ? m.assets[0]?.nome : m.assets?.nome) || 'N/A',
        responsavel_nome: (Array.isArray(m.profiles) ? m.profiles[0]?.nome : m.profiles?.nome) || 'N/A'
      }));
      
      res.json(mapped);
    } catch (error: any) {
      logToFile("ERROR", "Erro geral ao listar planos ativos", { error: error.message, user_id: userId });
      res.status(500).json({ error: "Erro ao listar planos" });
    }
  });

  // PATCH: Start a maintenance plan (mark as in progress)
  app.patch("/api/maintenance/executions/:id/start", authenticate, async (req, res) => {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    try {
      logToFile("DEBUG", "Iniciando plano de manutenção", { plan_id: id, user_id: userId });

      // Check if plan exists
      const { data: planExists, error: checkError } = await supabase
        .from('maintenance_plans')
        .select('id')
        .eq('id', id)
        .single();

      if (checkError || !planExists) {
        logToFile("WARNING", "Plano não encontrado", { plan_id: id, user_id: userId });
        return res.status(404).json({ error: "Plano de manutenção não encontrado" });
      }

      const now = new Date().toISOString();
      
      // Update plan status with primary field names
      let result = await supabase
        .from('maintenance_plans')
        .update({ estado: 'Em Progresso', data_inicio: now })
        .eq('id', id);

      if (result.error) {
        logToFile("ERROR", "Erro ao atualizar estado do plano", { plan_id: id, error: result.error.message });
        return res.status(500).json({ error: "Erro ao atualizar plano" });
      }

      logToFile("INFO", "Plano de manutenção iniciado", { plan_id: id, user_id: userId });
      res.json({ success: true, message: "Plano iniciado com sucesso" });
    } catch (error: any) {
      logToFile("ERROR", "Erro geral ao iniciar plano", { plan_id: id, error: error.message, user_id: userId });
      res.status(500).json({ error: "Erro ao iniciar plano" });
    }
  });

  // PATCH: Complete a maintenance plan
  app.patch("/api/maintenance/executions/:id/complete", authenticate, async (req, res) => {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { observations, actual_cost } = req.body;

    try {
      logToFile("DEBUG", "Completando plano de manutenção", { plan_id: id, user_id: userId });

      // Check if plan exists
      const { data: planExists, error: checkError } = await supabase
        .from('maintenance_plans')
        .select('id')
        .eq('id', id)
        .single();

      if (checkError || !planExists) {
        logToFile("WARNING", "Plano não encontrado para conclusão", { plan_id: id, user_id: userId });
        return res.status(404).json({ error: "Plano de manutenção não encontrado" });
      }

      const now = new Date().toISOString();
      const updateData: any = {
        estado: 'Concluído',
        data_conclusao: now,
        observacoes: observations || null
      };

      if (actual_cost) updateData.custo_real = parseFloat(actual_cost);

      // Update with primary field names
      let result = await supabase
        .from('maintenance_plans')
        .update(updateData)
        .eq('id', id);
      

      if (result.error) {
        logToFile("ERROR", "Erro ao completar plano", { plan_id: id, error: result.error.message });
        return res.status(500).json({ error: "Erro ao completar plano" });
      }

      logToFile("INFO", "Plano de manutenção concluído", { plan_id: id, observations, actual_cost, user_id: userId });
      res.json({ success: true, message: "Plano concluído com sucesso" });
    } catch (error: any) {
      logToFile("ERROR", "Erro geral ao completar plano", { plan_id: id, error: error.message, user_id: userId });
      res.status(500).json({ error: "Erro ao completar plano" });
    }
  });

  // GET: List completed maintenance plans - history (for tab "Histórico")
  app.get("/api/maintenance/history", authenticate, async (req, res) => {
    const userId = (req as any).user?.id;
    try {
      logToFile("DEBUG", "Listando histórico de manutenção", { user_id: userId });
      
      const { data, error } = await supabase
        .from('maintenance_plans')
        .select('*, assets(nome), profiles!responsavel_id(nome)')
        .eq('estado', 'Concluído')
        .order('data_conclusao', { ascending: false });
      
      if (error) {
        logToFile("ERROR", "Erro ao listar histórico", { error: error.message });
        return res.status(500).json({ error: "Erro ao listar histórico" });
      }
      
      const mapped = (data || []).map((m: any) => ({
        ...m,
        asset_name: (Array.isArray(m.assets) ? m.assets[0]?.nome : m.assets?.nome) || 'N/A',
        responsavel_nome: (Array.isArray(m.profiles) ? m.profiles[0]?.nome : m.profiles?.nome) || 'N/A'
      }));
      
      res.json(mapped);
    } catch (error: any) {
      logToFile("ERROR", "Erro geral ao listar histórico", { error: error.message, user_id: userId });
      res.status(500).json({ error: "Erro ao listar histórico" });
    }
  });

  // Seed Admin if not exists - this only works if we bypass or use dummy signup
  // Nota: O administrador local (admin@nexo.com) não necessita de entrada no Supabase.
  // O seed abaixo tenta criar o utilizador no Supabase apenas se a Service Role Key estiver configurada.
  if (supabaseAdmin) {
    setTimeout(async () => {
      try {
        const adminEmail = "admin@nexo.com";
        const { data: existing } = await supabaseAdmin.from('profiles').select('id').eq('email', adminEmail).single();
        if (!existing) {
          console.log("[Seed] A criar utilizador administrador no Supabase...");
          const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email: adminEmail,
            password: ADMIN_PASSWORD,
            email_confirm: true
          });
          if (error) {
            console.error("[Seed] Erro ao criar admin:", error.message);
          } else if (data?.user) {
            await supabaseAdmin.from('profiles').insert([{ id: data.user.id, nome: "Administrador Sistema", email: adminEmail, perfil: "Administrador" }]);
            console.log("[Seed] Utilizador administrador criado com sucesso.");
          }
        } else {
          console.log("[Seed] Administrador já existe no Supabase.");
        }
      } catch (e) {
        console.log("[Seed] Erro ignorado:", e);
      }
    }, 3000);
  }

  // --- Seed Asset Categories ---
  setTimeout(async () => {
    try {
      const { data: existing } = await supabase.from('system_settings').select('id').eq('setting_key', 'asset_categories').single();
      if (!existing) {
        console.log("[Seed] A inicializar categorias de ativos...");
        const defaultCategories = ['Civil', 'AVAC', 'Electricidade', 'Segurança', 'Águas e Esgotos'];
        await supabase.from('system_settings').insert([{
          setting_key: 'asset_categories',
          setting_value: defaultCategories,
          description: 'Lista de categorias disponíveis para ativos'
        }]);
      }
    } catch (e) {
      console.log("[Seed] Erro ao inicializar categorias:", e);
    }
  }, 4000);

  // --- Seed Incident Categories ---
  setTimeout(async () => {
    try {
      const { data: existing } = await supabase.from('system_settings').select('id').eq('setting_key', 'incident_categories').single();
      if (!existing) {
        console.log("[Seed] A inicializar categorias de incidentes...");
        const defaultCategories = ['Elétrico', 'Canalização', 'Civil', 'HVAC', 'Segurança', 'Outros'];
        await supabase.from('system_settings').insert([{
          setting_key: 'incident_categories',
          setting_value: defaultCategories,
          description: 'Lista de categorias de problema para incidentes'
        }]);
      }
    } catch (e) {
      console.log("[Seed] Erro ao inicializar categorias de incidentes:", e);
    }
  }, 4200);

  // Modo desenvolvimento com Vite middleware (Sempre ativo agora)
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      allowedHosts: true as any,
    },
    appType: "spa"
  });
  app.use(vite.middlewares);
  // SPA routing: redirect unknown routes to index.html
  app.get('*', async (req, res, next) => {
    // API routes and static assets already handled by vite.middlewares or previous routes
    if (req.originalUrl.startsWith('/api') || req.originalUrl.includes('.')) return next();

    // Serve index.html for SPA routes
    if (req.path === '/' || req.path.startsWith('/cliente') || req.path.startsWith('/tecnico')) {
      try {
        let template = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    } else {
      next(); // Let other middleware or default Vite handling take over
    }
  });

  // Global Error Handler Middleware
  app.use((err: any, req: any, res: any, next: any) => {
    const status = err.status || 500;
    logToFile("ERROR", `Unhandled Exception [${req.method} ${req.url}]`, {
      message: err.message,
      stack: err.stack,
      body: req.body
    });
    res.status(status).json({ error: "Erro interno do servidor", details: process.env.NODE_ENV === 'production' ? null : err.message });
  });

  // Initialize Maintenance Scheduler
  let maintenanceScheduler: MaintenanceScheduler | null = null;

  httpServer.listen(3000, "0.0.0.0", () => {
    console.log(`Nexo - SGFM running on http://localhost:3000`);
    logToFile("INFO", "Servidor Nexo SGFM iniciado e à escuta na porta 3000");

    // Start the maintenance scheduler
    maintenanceScheduler = new MaintenanceScheduler(supabase, logToFile);
    maintenanceScheduler.start();
    logToFile("INFO", "Iniciando Maintenance Scheduler - verificará agendamentos a cada 1 hora");
  });

  // Graceful shutdown handler
  process.on("SIGINT", async () => {
    logToFile("INFO", "Recebido SIGINT - iniciando shutdown gracioso");
    if (maintenanceScheduler) {
      maintenanceScheduler.stop();
      logToFile("INFO", "Maintenance Scheduler parado");
    }
    httpServer.close(() => {
      logToFile("INFO", "Servidor HTTP encerrado");
      process.exit(0);
    });
  });
}

startServer();
