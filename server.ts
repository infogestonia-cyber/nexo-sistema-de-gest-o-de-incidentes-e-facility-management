import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";

import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";

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

const JWT_SECRET = process.env.JWT_SECRET || "gestpro-secret-key-2025";
// Palavra-passe do administrador local (configurável via variável de ambiente)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
console.log(`[Server] Starting in ${process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, { cors: { origin: "*" } });

  // CORS: permitir pedidos de qualquer origem (necessário em produção)
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());

  const activeUsers = new Map();

  // --- LOCAL FALLBACK MEMORY (in case Supabase tables aren't created yet) ---
  const localNotifications: any[] = [];
  const localAssetInspections: any[] = [];
  const localMaintenanceUpdates: Record<string, any> = {};

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
    if (process.env.NODE_ENV !== 'production') {
      req.user = { id: '00000000-0000-0000-0000-000000000000', perfil: 'Administrador', nome: 'Admin Local' };
      return next();
    }
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Não autorizado" });
    try {
      req.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch (e) {
      res.status(401).json({ error: "Token inválido" });
    }
  };

  app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
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
      return res.json({
        token,
        user: { id: '00000000-0000-0000-0000-000000000000', nome: 'Administrador Sistema', email: 'admin@nexo.com', perfil: 'Administrador' }
      });
    }

    // Autenticação via Supabase para outros utilizadores
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError || !authData.user) {
        return res.status(401).json({ error: "Credenciais inválidas" });
      }
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', authData.user.id).single();
      if (!profile) return res.status(401).json({ error: "Perfil não encontrado no sistema" });
      const token = jwt.sign(
        { id: profile.id, perfil: profile.perfil, nome: profile.nome },
        JWT_SECRET,
        { expiresIn: '8h' }
      );
      res.json({ token, user: { id: profile.id, nome: profile.nome, email: profile.email, perfil: profile.perfil } });
    } catch (err) {
      console.error('[Login] Erro ao autenticar:', err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.get("/api/users", authenticate, async (req, res) => {
    const { data } = await supabase.from('profiles').select('id, nome, email, perfil, estado');
    res.json(data || []);
  });

  app.get("/api/notifications", authenticate, async (req, res) => {
    const userId = (req as any).user.id;
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20);
    if (error) {
      // Return local fallback
      return res.json(localNotifications.filter(n => n.user_id === userId).reverse().slice(0, 20));
    }
    res.json(data || []);
  });

  app.post("/api/notifications/read", authenticate, async (req, res) => {
    const userId = (req as any).user.id;
    const { error } = await supabase.from('notifications').update({ lida: true }).eq('user_id', userId);
    if (error) {
      localNotifications.filter(n => n.user_id === userId).forEach(n => n.lida = true);
    }
    res.json({ success: true });
  });

  const createNotification = async (userId: string, titulo: string, mensagem: string) => {
    const notif = { id: crypto.randomUUID(), user_id: userId, titulo, mensagem, lida: false, created_at: new Date().toISOString() };
    const { error } = await supabase.from('notifications').insert([notif]);
    if (error) {
      localNotifications.push(notif);
    }
    io.emit("notification", { userId, titulo, mensagem });
  };


  app.post("/api/users", authenticate, async (req, res) => {
    const { nome, email, password, perfil } = req.body;
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email, password
    });

    if (authError || !authData.user) {
      return res.status(400).json({ error: authError?.message || "Erro ao criar utilizador" });
    }

    await supabase.from('profiles').insert([{
      id: authData.user.id,
      nome, email, perfil
    }]);

    res.json({ id: authData.user.id });
  });

  app.get("/api/dashboard", authenticate, async (req, res) => {
    const { count: totalIncidents } = await supabase.from('incidents').select('*', { count: 'exact', head: true });
    const { count: totalAssets } = await supabase.from('assets').select('*', { count: 'exact', head: true });
    const { count: criticalAssets } = await supabase.from('assets').select('*', { count: 'exact', head: true }).eq('probabilidade_falha', 'Alta');

    // Process list locally
    const { data: incidents } = await supabase.from('incidents').select('*, properties(endereco)');

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

    res.json({
      totalIncidents: { count: totalIncidents || 0 },
      totalAssets: { count: totalAssets || 0 },
      criticalAssets: { count: criticalAssets || 0 },
      byStatus: formatCounts(byStatus, 'estado'),
      bySeverity: formatCounts(bySeverity, 'severidade'),
      byCategory: formatCounts(byCategory, 'categoria'),
      recentIncidents: (incidents || []).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5).map((i: any) => ({ ...i, property_name: i.properties?.endereco })),
      slaCompliance: resolvedCount === 0 ? 100 : Math.round((slaComplianceCount / resolvedCount) * 100 * 10) / 10,
    });
  });

  app.get("/api/properties", authenticate, async (req, res) => {
    const { data } = await supabase.from('properties').select('*');
    res.json(data || []);
  });

  app.post("/api/properties", authenticate, async (req, res) => {
    const { codigo, endereco, inquilino, referencia_interna } = req.body;
    const { data } = await supabase.from('properties').insert([{ codigo, endereco, inquilino, referencia_interna }]).select('id').single();
    res.json({ id: data?.id });
  });

  app.get("/api/assets", authenticate, async (req, res) => {
    const { data } = await supabase.from('assets').select('*, properties(endereco)');
    const mapped = (data || []).map((a: any) => ({ ...a, property_name: a.properties?.endereco }));
    res.json(mapped);
  });

  app.post("/api/assets", authenticate, async (req, res) => {
    const { nome, categoria, property_id, localizacao_detalhada, data_instalacao, probabilidade_falha, sinais_alerta } = req.body;
    const { data } = await supabase.from('assets').insert([{ nome, categoria, property_id, localizacao_detalhada, data_instalacao, probabilidade_falha, sinais_alerta }]).select('id').single();
    res.json({ id: data?.id });
  });

  // ─── Asset Inspections (Manual Inspection System) ─────────────────────────
  app.get("/api/asset-inspections", authenticate, async (req, res) => {
    const asset_id = req.query.asset_id as string;
    let query = supabase.from('asset_inspections').select('*, profiles!inspector_id(nome)').order('data_inspecao', { ascending: false });
    if (asset_id) query = query.eq('asset_id', asset_id);
    const { data, error } = await query;
    if (error) {
      // Local fallback
      let fallbacks = localAssetInspections;
      if (asset_id) fallbacks = fallbacks.filter(i => i.asset_id === asset_id);
      return res.json(fallbacks.sort((a, b) => new Date(b.data_inspecao).getTime() - new Date(a.data_inspecao).getTime()));
    }
    const mapped = (data || []).map((i: any) => ({ ...i, inspector_nome: i.profiles?.nome }));
    res.json(mapped);
  });

  app.post("/api/asset-inspections", authenticate, async (req, res) => {
    const { asset_id, data_inspecao, condicao_geral, anomalias_detectadas, descricao_anomalias, accoes_imediatas, requer_manutencao, componentes_verificados, observacoes, inspector_id } = req.body;
    const payload: any = { asset_id, data_inspecao, condicao_geral, anomalias_detectadas, descricao_anomalias, accoes_imediatas, requer_manutencao, componentes_verificados, observacoes };
    if (inspector_id) payload.inspector_id = inspector_id;
    const { data, error } = await supabase.from('asset_inspections').insert([payload]).select('*').single();
    if (error) {
      // Local fallback
      const localRecord = {
        id: crypto.randomUUID(),
        ...payload,
        inspector_nome: (req as any).user?.nome,
        created_at: new Date().toISOString()
      };
      localAssetInspections.push(localRecord);
      return res.json(localRecord);
    }
    res.json(data);
  });



  app.get("/api/incidents", authenticate, async (req, res) => {
    const { data } = await supabase.from('incidents').select('*, properties(endereco), profiles!responsavel_id(nome)').order('created_at', { ascending: false });
    const mapped = (data || []).map((i: any) => ({ ...i, property_name: i.properties?.endereco, responsavel_nome: i.profiles?.nome }));
    res.json(mapped);
  });

  app.post("/api/incidents", authenticate, async (req, res) => {
    const { property_id, asset_id, categoria, descricao, severidade, responsavel_id } = req.body;
    const now = new Date();
    let respHours = 48, resHours = 120;
    if (severidade === 'Crítico') { respHours = 1; resHours = 8; }
    else if (severidade === 'Alto') { respHours = 4; resHours = 24; }
    else if (severidade === 'Médio') { respHours = 24; resHours = 72; }

    const slaResp = new Date(now.getTime() + respHours * 60 * 60 * 1000).toISOString();
    const slaRes = new Date(now.getTime() + resHours * 60 * 60 * 1000).toISOString();

    const { data } = await supabase.from('incidents').insert([{
      property_id, asset_id, categoria, descricao, severidade, responsavel_id,
      sla_resposta_limite: slaResp, sla_resolucao_limite: slaRes
    }]).select('id').single();

    if (responsavel_id) {
      createNotification(responsavel_id, "Novo Incidente Atribuído", `Foi-lhe atribuído um incidente de severidade ${severidade} em ${categoria}.`);
    }

    res.json({ id: data?.id });
  });

  app.get("/api/incidents/:id", authenticate, async (req, res) => {
    const { data: incident } = await supabase.from('incidents').select('*, properties(endereco)').eq('id', req.params.id).single();
    const { data: actions } = await supabase.from('incident_actions').select('*, profiles(nome)').eq('incident_id', req.params.id).order('created_at', { ascending: false });

    res.json({
      ...incident,
      property_name: (incident?.properties as any)?.endereco,
      actions: (actions || []).map((a: any) => ({ ...a, user_nome: a.profiles?.nome }))
    });
  });

  app.post("/api/incidents/:id/actions", authenticate, async (req, res) => {
    const { descricao_acao, novo_estado } = req.body;
    const userId = (req as any).user.id;

    await supabase.from('incident_actions').insert([{ incident_id: req.params.id, user_id: userId, descricao_acao }]);

    if (novo_estado) {
      let updateData: any = { estado: novo_estado };

      const { data: currentInc } = await supabase.from('incidents').select('data_resposta, data_resolucao, responsavel_id, categoria').eq('id', req.params.id).single();
      if ((novo_estado === 'Atribuído' || novo_estado === 'Em progresso') && (!currentInc || !currentInc.data_resposta)) {
        updateData.data_resposta = new Date().toISOString();
      }
      if ((novo_estado === 'Resolvido' || novo_estado === 'Fechado') && (!currentInc || !currentInc.data_resolucao)) {
        updateData.data_resolucao = new Date().toISOString();
      }

      await supabase.from('incidents').update(updateData).eq('id', req.params.id);

      if (currentInc && currentInc.responsavel_id && currentInc.responsavel_id !== userId) {
        createNotification(currentInc.responsavel_id, "Atualização de Incidente", `O estado do incidente de ${currentInc.categoria} foi alterado para ${novo_estado}.`);
      }
    }

    res.json({ success: true });
  });

  app.get("/api/maintenance-plans", authenticate, async (req, res) => {
    const { data } = await supabase.from('maintenance_plans').select('*, assets(nome), profiles!responsavel_id(nome)');
    const mapped = (data || []).map((m: any) => {
      // Apply local updates if any
      const localUpdate = localMaintenanceUpdates[m.id];
      if (localUpdate) {
        return { ...m, ...localUpdate, asset_name: m.assets?.nome, responsavel_nome: m.profiles?.nome };
      }
      return { ...m, asset_name: m.assets?.nome, responsavel_nome: m.profiles?.nome };
    });
    res.json(mapped);
  });

  app.post("/api/maintenance-plans", authenticate, async (req, res) => {
    const { asset_id, tipo, periodicidade, proxima_data, responsavel_id, custo_estimado, descricao } = req.body;

    if (!asset_id || !responsavel_id) {
      return res.status(400).json({ error: "Ativo e Responsável são obrigatórios" });
    }

    const { data, error } = await supabase.from('maintenance_plans').insert([{
      asset_id, tipo, periodicidade, proxima_data, responsavel_id, custo_estimado: parseFloat(custo_estimado) || 0, descricao
    }]).select('id').single();

    if (error) {
      console.error("Erro ao criar plano:", error);
      return res.status(500).json({ error: "Erro interno ao criar plano" });
    }

    createNotification(responsavel_id, "Novo Plano de Manutenção", `Foi-lhe atribuída a manutenção ${tipo} para o ativo.`);
    res.json({ id: data?.id });
  });

  app.patch("/api/maintenance-plans/:id/complete", authenticate, async (req, res) => {
    const { error } = await supabase.from('maintenance_plans')
      .update({ estado: 'Concluído', data_conclusao: new Date().toISOString() })
      .eq('id', req.params.id);
    if (error) {
      // Local fallback if data_conclusao column is completely missing
      localMaintenanceUpdates[req.params.id] = { estado: 'Concluído', data_conclusao: new Date().toISOString() };
    }
    res.json({ success: true });
  });

  app.delete("/api/maintenance-plans/:id", authenticate, async (req, res) => {
    const { error } = await supabase.from('maintenance_plans').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.get("/api/planning-5y", authenticate, async (req, res) => {
    const { data } = await supabase.from('planning_5y').select('*').order('ano', { ascending: true }).order('trimestre', { ascending: true });
    res.json(data || []);
  });

  app.post("/api/planning-5y", authenticate, async (req, res) => {
    const { item, ano, trimestre, observacoes } = req.body;
    await supabase.from('planning_5y').insert([{ item, ano, trimestre, observacoes }]);
    res.json({ success: true });
  });

  app.get("/api/system/status", authenticate, (req, res) => {
    res.json({ status: "Operacional", modules: ["Incidentes", "Ativos", "Manutenção"] });
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
  } else {
    console.log("[Seed] SUPABASE_SERVICE_KEY não definida. A ignorar seed automático.");
  }

  const distPath = path.join(__dirname, "dist");
  const distExists = fs.existsSync(path.join(distPath, "index.html"));

  if (process.env.NODE_ENV !== "production" && !distExists) {
    // Modo desenvolvimento com Vite middleware (sem build)
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        // Permite todos os hosts externos: ngrok, tunnels, proxies, IP directo
        // Sem isto, Vite 6+ bloqueia pedidos externos = ecra preto
        allowedHosts: true as any,
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
    app.get("*", async (req, res, next) => {
      if (req.originalUrl.startsWith('/api') || req.originalUrl.includes('.')) return next();
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
    // Modo producao: servir ficheiros estaticos da pasta dist/
    if (!distExists) {
      console.error("[Server] AVISO: Pasta dist/ nao encontrada! Execute 'npm run build' primeiro.");
    }
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) return next();
      if (!distExists) {
        return res.status(503).send(`
          <html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#0a0a0a;color:#fff">
            <h1 style="color:#ef4444">Build nao encontrada</h1>
            <p>Execute <code style="background:#1a1a1a;padding:4px 8px;border-radius:4px">npm run build</code> no servidor e reinicie o PM2.</p>
          </body></html>
        `);
      }
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  httpServer.listen(3000, "0.0.0.0", () => console.log(`Nexo - SGFM running on http://localhost:3000`));
}

startServer();
