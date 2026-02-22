import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";

import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("facility_management.db");
const JWT_SECRET = process.env.JWT_SECRET || "gestpro-secret-key-2025";
console.log(`[Server] Starting in ${process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);


// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    perfil TEXT CHECK(perfil IN ('Administrador', 'Gestor', 'Técnico', 'Visualizador')) NOT NULL,
    estado TEXT DEFAULT 'Ativo'
  );

  CREATE TABLE IF NOT EXISTS properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT UNIQUE NOT NULL,
    endereco TEXT NOT NULL,
    inquilino TEXT,
    referencia_interna TEXT
  );

  CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    categoria TEXT NOT NULL,
    property_id INTEGER,
    localizacao_detalhada TEXT,
    data_instalacao TEXT,
    probabilidade_falha TEXT CHECK(probabilidade_falha IN ('Baixa', 'Média', 'Alta')),
    sinais_alerta TEXT,
    FOREIGN KEY (property_id) REFERENCES properties(id)
  );

  CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    property_id INTEGER,
    asset_id INTEGER,
    categoria TEXT NOT NULL,
    descricao TEXT NOT NULL,
    severidade TEXT CHECK(severidade IN ('Baixa', 'Médio', 'Alto', 'Crítico')),
    estado TEXT CHECK(estado IN ('Aberto', 'Atribuído', 'Em progresso', 'Em validação', 'Resolvido', 'Fechado')) DEFAULT 'Aberto',
    responsavel_id INTEGER,
    sla_resposta_limite DATETIME,
    sla_resolucao_limite DATETIME,
    data_resposta DATETIME,
    data_resolucao DATETIME,
    FOREIGN KEY (property_id) REFERENCES properties(id),
    FOREIGN KEY (asset_id) REFERENCES assets(id),
    FOREIGN KEY (responsavel_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS incident_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    incident_id INTEGER,
    user_id INTEGER,
    descricao_acao TEXT NOT NULL,
    data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (incident_id) REFERENCES incidents(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS maintenance_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER,
    tipo TEXT NOT NULL,
    periodicidade TEXT NOT NULL,
    proxima_data TEXT,
    responsavel_id INTEGER,
    custo_estimado REAL,
    FOREIGN KEY (asset_id) REFERENCES assets(id),
    FOREIGN KEY (responsavel_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS maintenance_executions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER,
    data_execucao DATETIME DEFAULT CURRENT_TIMESTAMP,
    executor_id INTEGER,
    notas TEXT,
    custo_real REAL,
    FOREIGN KEY (plan_id) REFERENCES maintenance_plans(id),
    FOREIGN KEY (executor_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS planning_5y (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item TEXT NOT NULL,
    ano INTEGER NOT NULL,
    trimestre INTEGER NOT NULL,
    observacoes TEXT
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    lida INTEGER DEFAULT 0,
    data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Seed Admin User
const adminExists = db.prepare("SELECT * FROM users WHERE email = ?").get("admin@nexo.com");
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync("admin123", 10);
  db.prepare("INSERT INTO users (nome, email, password, perfil) VALUES (?, ?, ?, ?)").run(
    "Administrador Sistema",
    "admin@nexo.com",
    hashedPassword,
    "Administrador"
  );
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, { cors: { origin: "*" } });

  app.use(express.json());

  const activeUsers = new Map();

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

  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Não autorizado" });
    try {
      req.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch (e) {
      res.status(401).json({ error: "Token inválido" });
    }
  };

  app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }
    const token = jwt.sign({ id: user.id, perfil: user.perfil, nome: user.nome }, JWT_SECRET);
    res.json({ token, user: { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil } });
  });

  // User Management
  app.get("/api/users", authenticate, (req, res) => res.json(db.prepare("SELECT id, nome, email, perfil, estado FROM users").all()));

  // Notifications
  app.get("/api/notifications", authenticate, (req, res) => {
    const userId = (req as any).user.id;
    res.json(db.prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY data_hora DESC LIMIT 20").all(userId));
  });

  app.post("/api/notifications/read", authenticate, (req, res) => {
    const userId = (req as any).user.id;
    db.prepare("UPDATE notifications SET lida = 1 WHERE user_id = ?").run(userId);
    res.json({ success: true });
  });

  const createNotification = (userId: number, titulo: string, mensagem: string) => {
    db.prepare("INSERT INTO notifications (user_id, titulo, mensagem) VALUES (?, ?, ?)").run(userId, titulo, mensagem);
    io.emit("notification", { userId, titulo, mensagem });
  };

  app.post("/api/users", authenticate, (req, res) => {
    const { nome, email, password, perfil } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    try {
      const result = db.prepare("INSERT INTO users (nome, email, password, perfil) VALUES (?, ?, ?, ?)").run(nome, email, hashedPassword, perfil);
      res.json({ id: result.lastInsertRowid });
    } catch (e) {
      res.status(400).json({ error: "Email já existe" });
    }
  });

  app.get("/api/dashboard", authenticate, (req, res) => {
    res.json({
      totalIncidents: db.prepare("SELECT COUNT(*) as count FROM incidents").get() as any,
      totalAssets: db.prepare("SELECT COUNT(*) as count FROM assets").get() as any,
      criticalAssets: db.prepare("SELECT COUNT(*) as count FROM assets WHERE probabilidade_falha = 'Alta'").get() as any,
      byStatus: db.prepare("SELECT estado, COUNT(*) as count FROM incidents GROUP BY estado").all(),
      bySeverity: db.prepare("SELECT severidade, COUNT(*) as count FROM incidents GROUP BY severidade").all(),
      byCategory: db.prepare("SELECT categoria, COUNT(*) as count FROM incidents GROUP BY categoria").all(),
      recentIncidents: db.prepare(`
        SELECT i.*, p.endereco as property_name 
        FROM incidents i 
        JOIN properties p ON i.property_id = p.id 
        ORDER BY i.data_hora DESC LIMIT 5
      `).all(),
      slaCompliance: db.prepare(`
        SELECT 
          CASE 
            WHEN COUNT(*) = 0 THEN 100 
            ELSE ROUND(AVG(CASE WHEN data_resolucao <= sla_resolucao_limite THEN 100.0 ELSE 0.0 END), 1) 
          END as sla 
        FROM incidents 
        WHERE data_resolucao IS NOT NULL
      `).get().sla,
    });
  });

  app.get("/api/properties", authenticate, (req, res) => res.json(db.prepare("SELECT * FROM properties").all()));
  app.post("/api/properties", authenticate, (req, res) => {
    const { codigo, endereco, inquilino, referencia_interna } = req.body;
    const result = db.prepare("INSERT INTO properties (codigo, endereco, inquilino, referencia_interna) VALUES (?, ?, ?, ?)").run(codigo, endereco, inquilino, referencia_interna);
    res.json({ id: result.lastInsertRowid });
  });

  app.get("/api/assets", authenticate, (req, res) => res.json(db.prepare("SELECT a.*, p.endereco as property_name FROM assets a LEFT JOIN properties p ON a.property_id = p.id").all()));
  app.post("/api/assets", authenticate, (req, res) => {
    const { nome, categoria, property_id, localizacao_detalhada, data_instalacao, probabilidade_falha, sinais_alerta } = req.body;
    const result = db.prepare("INSERT INTO assets (nome, categoria, property_id, localizacao_detalhada, data_instalacao, probabilidade_falha, sinais_alerta) VALUES (?, ?, ?, ?, ?, ?, ?)").run(nome, categoria, property_id, localizacao_detalhada, data_instalacao, probabilidade_falha, sinais_alerta);
    res.json({ id: result.lastInsertRowid });
  });

  app.get("/api/incidents", authenticate, (req, res) => res.json(db.prepare(`
    SELECT i.*, p.endereco as property_name, u.nome as responsavel_nome 
    FROM incidents i 
    LEFT JOIN properties p ON i.property_id = p.id 
    LEFT JOIN users u ON i.responsavel_id = u.id
    ORDER BY i.data_hora DESC
  `).all()));

  app.post("/api/incidents", authenticate, (req, res) => {
    const { property_id, asset_id, categoria, descricao, severidade, responsavel_id } = req.body;
    const now = new Date();
    let respHours = 48, resHours = 120;
    if (severidade === 'Crítico') { respHours = 1; resHours = 8; }
    else if (severidade === 'Alto') { respHours = 4; resHours = 24; }
    else if (severidade === 'Médio') { respHours = 24; resHours = 72; }
    const slaResp = new Date(now.getTime() + respHours * 60 * 60 * 1000).toISOString();
    const slaRes = new Date(now.getTime() + resHours * 60 * 60 * 1000).toISOString();
    const result = db.prepare(`
      INSERT INTO incidents (property_id, asset_id, categoria, descricao, severidade, responsavel_id, sla_resposta_limite, sla_resolucao_limite) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(property_id, asset_id, categoria, descricao, severidade, responsavel_id, slaResp, slaRes);

    if (responsavel_id) {
      createNotification(responsavel_id, "Novo Incidente Atribuído", `Foi-lhe atribuído um incidente de severidade ${severidade} em ${categoria}.`);
    }

    res.json({ id: result.lastInsertRowid });
  });

  app.get("/api/incidents/:id", authenticate, (req, res) => {
    const incident = db.prepare("SELECT i.*, p.endereco as property_name FROM incidents i JOIN properties p ON i.property_id = p.id WHERE i.id = ?").get(req.params.id);
    const actions = db.prepare("SELECT a.*, u.nome as user_nome FROM incident_actions a JOIN users u ON a.user_id = u.id WHERE a.incident_id = ? ORDER BY a.data_hora DESC").all(req.params.id);
    res.json({ ...incident, actions });
  });

  app.post("/api/incidents/:id/actions", authenticate, (req, res) => {
    const { descricao_acao, novo_estado } = req.body;
    const userId = (req as any).user.id;
    db.transaction(() => {
      db.prepare("INSERT INTO incident_actions (incident_id, user_id, descricao_acao) VALUES (?, ?, ?)").run(req.params.id, userId, descricao_acao);
      if (novo_estado) {
        const updateFields = ["estado = ?"];
        const params: any[] = [novo_estado];
        if (novo_estado === 'Atribuído' || novo_estado === 'Em progresso') updateFields.push("data_resposta = COALESCE(data_resposta, CURRENT_TIMESTAMP)");
        if (novo_estado === 'Resolvido' || novo_estado === 'Fechado') updateFields.push("data_resolucao = COALESCE(data_resolucao, CURRENT_TIMESTAMP)");
        params.push(req.params.id);
        db.prepare(`UPDATE incidents SET ${updateFields.join(", ")} WHERE id = ?`).run(...params);

        // Notify the reporter or responsible if needed
        const incident = db.prepare("SELECT responsavel_id, categoria FROM incidents WHERE id = ?").get(req.params.id) as any;
        if (incident && incident.responsavel_id && incident.responsavel_id !== userId) {
          createNotification(incident.responsavel_id, "Atualização de Incidente", `O estado do incidente de ${incident.categoria} foi alterado para ${novo_estado}.`);
        }
      }
    })();
    res.json({ success: true });
  });

  // Maintenance Plans
  app.get("/api/maintenance-plans", authenticate, (req, res) => res.json(db.prepare(`
    SELECT m.*, a.nome as asset_name, u.nome as responsavel_nome 
    FROM maintenance_plans m 
    JOIN assets a ON m.asset_id = a.id 
    JOIN users u ON m.responsavel_id = u.id
  `).all()));
  app.post("/api/maintenance-plans", authenticate, (req, res) => {
    console.log("POST /api/maintenance-plans - Body:", req.body);
    const { asset_id, tipo, periodicidade, proxima_data, responsavel_id, custo_estimado } = req.body;

    if (!asset_id || !responsavel_id) {
      return res.status(400).json({ error: "Ativo e Responsável são obrigatórios" });
    }

    try {
      const result = db.prepare("INSERT INTO maintenance_plans (asset_id, tipo, periodicidade, proxima_data, responsavel_id, custo_estimado) VALUES (?, ?, ?, ?, ?, ?)").run(
        parseInt(asset_id),
        tipo,
        periodicidade,
        proxima_data,
        parseInt(responsavel_id),
        parseFloat(custo_estimado) || 0
      );

      createNotification(parseInt(responsavel_id), "Novo Plano de Manutenção", `Foi-lhe atribuída a manutenção ${tipo} para o ativo ID ${asset_id}.`);

      res.json({ id: result.lastInsertRowid });
    } catch (e) {
      console.error("Erro ao criar plano de manutenção:", e);
      res.status(500).json({ error: "Erro interno ao criar plano" });
    }
  });

  app.get("/api/planning-5y", authenticate, (req, res) => res.json(db.prepare("SELECT * FROM planning_5y ORDER BY ano, trimestre").all()));
  app.post("/api/planning-5y", authenticate, (req, res) => {
    const { item, ano, trimestre, observacoes } = req.body;
    db.prepare("INSERT INTO planning_5y (item, ano, trimestre, observacoes) VALUES (?, ?, ?, ?)").run(item, ano, trimestre, observacoes);
    res.json({ success: true });
  });

  // Placeholder status check for system intelligence
  app.get("/api/system/status", authenticate, (req, res) => {
    res.json({ status: "Operacional", modules: ["Incidentes", "Ativos", "Manutenção"] });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
    app.get("*", async (req, res, next) => {
      // Don't serve index.html for API or asset requests
      if (req.originalUrl.startsWith('/api') || req.originalUrl.includes('.')) {
        return next();
      }
      try {
        let template = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) return next();
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(3000, "0.0.0.0", () => console.log(`Nexo - SGFM running on http://localhost:3000`));
}

startServer();
