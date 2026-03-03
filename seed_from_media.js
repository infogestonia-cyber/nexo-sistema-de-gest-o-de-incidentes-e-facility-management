/**
 * Seed script — inserts real data from src/midia files into Supabase
 * Run: node seed_from_media.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing SUPABASE env vars. Check .env file.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─── DATA FROM FILES ─────────────────────────────────────────────────────────

// From: Plano Exaustivo de Manutencao-template (3).xlsx
// Sheets: JN812-6D, MAO-TSE-TUNG, NIKETCHE18, Planeamento (PETROMOC)
const PROPERTIES = [
    {
        codigo: '2025002',
        endereco: 'Av. Julius Nyerere, nr 812, 6D',
        inquilino: 'Sergio Dinoi',
        referencia_interna: '2025002'
    },
    {
        codigo: '2025003',
        endereco: 'Av. Mao-Tsé-Tung, 11ESQ',
        inquilino: 'Roberto Murrure',
        referencia_interna: '2025003'
    },
    {
        codigo: '2025004',
        endereco: 'Av. Samora Machel/Cond. Nik18',
        inquilino: 'Terceiro',
        referencia_interna: '2025004'
    },
    {
        codigo: '2025001',
        endereco: 'Cliente PETROMOC — Instalações Centrais',
        inquilino: 'PETROMOC',
        referencia_interna: '2025001'
    }
];

// From: Inventario-MODELO.xlsx — Sheet: Geral
// Real assets registered for PETROMOC property
const ASSETS_BY_PROPERTY_CODE = {
    '2025001': [
        {
            nome: 'Máquina de Soldar Portátil INGCO (com máscara)',
            categoria: 'Equipamento',
            localizacao_detalhada: 'Sala de Servidor',
            data_instalacao: '2025-01-07',
            probabilidade_falha: 'Baixa',
            sinais_alerta: 'Verificar integridade da máscara de proteção. Registo fotográfico: petromoc/equipamentos/2025'
        },
        {
            nome: 'Ar Condicionado GREE 12000BTU',
            categoria: 'AVAC',
            localizacao_detalhada: 'Quarto Principal — Frente',
            data_instalacao: '2025-01-07',
            probabilidade_falha: 'Baixa',
            sinais_alerta: 'Unidade usada mas bem conservada e funcional. Nº de Série: 55434443443'
        }
    ]
};

// From: Plano Exaustivo de Manutencao-template (3).xlsx
// Maintenance plans per property
const MAINTENANCE_BY_PROPERTY_CODE = {
    '2025002': [
        { tipo: 'Correctiva', periodicidade: 'Semestral', proxima_data: '2026-03-01', custo_estimado: 10000, categoria: 'CANALIZAÇÃO — Sistema Hidráulico', descricao_acao: 'Substituição de torneiras de esquadria; substituição de bichas flexíveis; desentupimento de POLIBAN. Nota: problema de águas na WC e infiltração na Cozinha.' },
        { tipo: 'Correctiva', periodicidade: 'Anual', proxima_data: '2026-09-01', custo_estimado: 60000, categoria: 'CARPINTARIA — Portas e Rodapé', descricao_acao: 'Reparação de portas e armários. Fase 1 concluída em 18/09/2025.' },
        { tipo: 'Preventiva', periodicidade: 'Trimestral', proxima_data: '2026-03-01', custo_estimado: 0, categoria: 'CANALIZAÇÃO — Tubagem', descricao_acao: 'Inspeção trimestral de tubagem.' },
        { tipo: 'Correctiva', periodicidade: 'Anual', proxima_data: '2026-09-01', custo_estimado: 0, categoria: 'CIVIL — Pintura', descricao_acao: 'Correcção das paredes manchadas, pintura geral. Material: Gesso acabamento SIVAL.' }
    ],
    '2025003': [
        { tipo: 'Correctiva', periodicidade: 'Semestral', proxima_data: '2026-03-01', custo_estimado: 10000, categoria: 'CANALIZAÇÃO — Sistema Hidráulico', descricao_acao: 'Sistema hidráulico — problema de águas na WC e infiltração na Cozinha. Responsável: Fernando & ajudante.' },
        { tipo: 'Preventiva', periodicidade: 'Anual', proxima_data: '2026-01-01', custo_estimado: 7500, categoria: 'CIVIL — Estrutural', descricao_acao: 'Correcção de rachas em paredes, pintura. Responsável: Dickson/Boavida.' },
        { tipo: 'Preventiva', periodicidade: 'Anual', proxima_data: '2026-01-01', custo_estimado: 40000, categoria: 'CARPINTARIA', descricao_acao: 'Substituição de portas, corredores, puxadores. Responsável: equipa de carpintaria.' }
    ],
    '2025004': [
        { tipo: 'Correctiva', periodicidade: 'Semestral', proxima_data: '2026-03-01', custo_estimado: 10000, categoria: 'CANALIZAÇÃO — Sistema Hidráulico', descricao_acao: 'Sistema hidráulico — problema de águas na WC e infiltração na Cozinha. Responsável: Fernando & ajudante.' },
        { tipo: 'Preventiva', periodicidade: 'Anual', proxima_data: '2026-01-01', custo_estimado: 7500, categoria: 'CIVIL — Estrutural', descricao_acao: 'Correcção de rachas. Responsável: Dickson/Boavida.' },
        { tipo: 'Preventiva', periodicidade: 'Anual', proxima_data: '2026-01-01', custo_estimado: 40000, categoria: 'CARPINTARIA', descricao_acao: 'Substituição de portas, corredores, puxadores.' }
    ],
    '2025001': [
        { tipo: 'Preventiva', periodicidade: 'Mensal', proxima_data: '2026-03-01', custo_estimado: 0, categoria: 'AVAC — Medições de Carga', descricao_acao: 'Medições de carga AVAC — 2 horas. Calendarização semanal.' },
        { tipo: 'Preventiva', periodicidade: 'Mensal', proxima_data: '2026-03-15', custo_estimado: 0, categoria: 'AVAC — Testes de Pressão', descricao_acao: 'Sistema de circulação e testes de pressão do AVAC — 4 horas.' }
    ]
};

// From: Plano Exaustivo de Manutencao — Sheet: Planeamento (PETROMOC 5Y)
const PLANNING_5Y = [
    { item: 'Projecto Executivo Arquitectónico', ano: 2026, trimestre: 1, observacoes: 'Prazos de execução aproximados. Após a realização do Ante-Projeto e Projeto Executivo, deverá ser feita actualização deste plano de trabalhos.' },
    { item: 'Preliminares Gerais', ano: 2026, trimestre: 1, observacoes: 'Preparação e mobilização inicial do projecto PETROMOC.' },
    { item: 'Contratação de Empreiteiros e Fiscalização', ano: 2026, trimestre: 1, observacoes: 'Processo de contratação de empreiteiros e equipa de fiscalização.' },
    { item: 'Mobilização de Empreiteiros', ano: 2026, trimestre: 2, observacoes: 'Mobilização no terreno das equipas de construção.' },
    { item: 'Trabalhos Preparatórios', ano: 2026, trimestre: 2, observacoes: 'Preparação do local de obra.' },
    { item: 'Infraestruturas de Distribuição', ano: 2026, trimestre: 2, observacoes: 'Instalação das infraestruturas de distribuição de serviços.' },
    { item: 'Acessos Rodoviários Fase I', ano: 2026, trimestre: 3, observacoes: 'Construção da primeira fase de acessos rodoviários.' },
    { item: 'Acessos Rodoviários Fase II', ano: 2026, trimestre: 4, observacoes: 'Construção da segunda fase de acessos rodoviários.' },
    { item: 'Área Residencial — Construção Moradias Alta Renda', ano: 2027, trimestre: 1, observacoes: 'Construção de moradias de alto padrão.' },
    { item: 'Edifícios de Média e Alta Renda (10 Pisos)', ano: 2027, trimestre: 2, observacoes: 'Construção de edifícios residenciais de 10 pisos.' },
    { item: 'Edifícios de Média Baixa Renda (5 Pisos)', ano: 2027, trimestre: 3, observacoes: 'Construção de edifícios de 5 pisos para rendas médias-baixas.' },
    { item: 'Edifícios de Baixa Renda', ano: 2027, trimestre: 4, observacoes: 'Construção de habitação social.' },
    { item: 'Responsabilidade Social — Orfanatos, Asilo e Creches', ano: 2028, trimestre: 1, observacoes: 'Construção de equipamentos de responsabilidade social.' },
    { item: 'Hospital e Clínica Privada', ano: 2028, trimestre: 2, observacoes: 'Construção de unidade de saúde privada.' },
    { item: 'Escolas e Universidade', ano: 2028, trimestre: 3, observacoes: 'Construção de equipamentos de ensino.' },
    { item: 'Igrejas, Padaria, Mercado e Farmácias', ano: 2028, trimestre: 4, observacoes: 'Construção de equipamentos de comércio e serviços religiosos.' },
    { item: 'Área Comercial — Mall 2 Pisos', ano: 2029, trimestre: 1, observacoes: 'Construção de centro comercial de 2 pisos.' },
    { item: 'Edifícios de Serviços', ano: 2029, trimestre: 2, observacoes: 'Construção de edifícios de escritórios e serviços.' },
    { item: 'Hotel 5 Estrelas, Hotel 3 Estrelas e Casa Moçambique', ano: 2029, trimestre: 3, observacoes: 'Construção do complexo hoteleiro.' },
    { item: 'Centro de Conferências e Palácio de Casamentos', ano: 2029, trimestre: 4, observacoes: 'Construção de espaços para eventos.' },
    { item: 'Rede de Transporte e Distribuição de Energia Eléctrica', ano: 2030, trimestre: 1, observacoes: 'Aquisição de equipamentos e construção da rede eléctrica.' },
    { item: 'Paisagismo e Arborização', ano: 2030, trimestre: 2, observacoes: 'Preparação das áreas verdes, sementeira e arborização.' },
    { item: 'Clube Desportivo', ano: 2030, trimestre: 3, observacoes: 'Construção do complexo desportivo.' },
    { item: 'Terminal de Transportes, Clube e Serviços', ano: 2030, trimestre: 4, observacoes: 'Infraestruturas de transporte e serviços complementares.' },
    { item: 'Fiscalização de Obra e Entrega Final', ano: 2030, trimestre: 4, observacoes: 'Consultoria para fiscalização, acompanhamento e entrega final da obra.' }
];

// ─── SEED FUNCTIONS ───────────────────────────────────────────────────────────

async function getAdminUser() {
    const { data } = await supabase.from('profiles').select('id').eq('email', 'admin@nexo.com').single();
    return data?.id || '00000000-0000-0000-0000-000000000000';
}

async function seedProperties() {
    console.log('\n📍 Inserindo Propriedades...');
    const results = [];
    for (const prop of PROPERTIES) {
        // Check if it already exists
        const { data: existing } = await supabase.from('properties').select('id').eq('codigo', prop.codigo).single();
        if (existing) {
            console.log(`  ⏭️  Propriedade ${prop.codigo} já existe (id: ${existing.id})`);
            results.push({ ...prop, id: existing.id });
            continue;
        }
        const { data, error } = await supabase.from('properties').insert([prop]).select('id').single();
        if (error) {
            console.error(`  ❌ Erro ao inserir ${prop.codigo}:`, error.message);
        } else {
            console.log(`  ✅ Propriedade ${prop.codigo} inserida (id: ${data.id})`);
            results.push({ ...prop, id: data.id });
        }
    }
    return results;
}

async function seedAssets(properties) {
    console.log('\n🔧 Inserindo Ativos (Inventário)...');
    const propMap = {};
    properties.forEach(p => { propMap[p.codigo] = p.id; });

    const assetIdMap = {};

    for (const [codigo, assets] of Object.entries(ASSETS_BY_PROPERTY_CODE)) {
        const property_id = propMap[codigo];
        if (!property_id) { console.log(`  ⚠️  Propriedade ${codigo} não encontrada, pulando ativos.`); continue; }

        for (const asset of assets) {
            const { data: existing } = await supabase.from('assets').select('id').eq('nome', asset.nome).eq('property_id', property_id).single();
            if (existing) {
                console.log(`  ⏭️  Ativo "${asset.nome}" já existe`);
                assetIdMap[asset.nome] = existing.id;
                continue;
            }
            const { data, error } = await supabase.from('assets').insert([{ ...asset, property_id }]).select('id').single();
            if (error) {
                console.error(`  ❌ Erro ao inserir ativo "${asset.nome}":`, error.message);
            } else {
                console.log(`  ✅ Ativo "${asset.nome}" inserido (id: ${data.id})`);
                assetIdMap[asset.nome] = data.id;
            }
        }
    }
    return assetIdMap;
}

async function seedMaintenancePlans(properties, adminId) {
    console.log('\n🛠️  Inserindo Planos de Manutenção...');
    const propMap = {};
    properties.forEach(p => { propMap[p.codigo] = p.id; });

    // Get first asset for each property to associate plans
    const { data: allAssets } = await supabase.from('assets').select('id, property_id');
    const assetByProp = {};
    (allAssets || []).forEach(a => { if (!assetByProp[a.property_id]) assetByProp[a.property_id] = a.id; });

    for (const [codigo, plans] of Object.entries(MAINTENANCE_BY_PROPERTY_CODE)) {
        const property_id = propMap[codigo];
        if (!property_id) { console.log(`  ⚠️  Propriedade ${codigo} não encontrada.`); continue; }

        const asset_id = assetByProp[property_id];

        for (const plan of plans) {
            // Check if plan already exists
            let existingQuery = supabase.from('maintenance_plans').select('id').eq('tipo', plan.tipo).eq('proxima_data', plan.proxima_data);
            if (asset_id) existingQuery = existingQuery.eq('asset_id', asset_id);
            const { data: existing } = await existingQuery.maybeSingle();
            if (existing) { console.log(`  ⏭️  Plano "${plan.categoria}" já existe.`); continue; }

            const insertData = {
                tipo: plan.tipo,
                periodicidade: plan.periodicidade,
                proxima_data: plan.proxima_data,
                custo_estimado: plan.custo_estimado,
                responsavel_id: adminId,
                asset_id: asset_id || null
            };

            const { data, error } = await supabase.from('maintenance_plans').insert([insertData]).select('id').single();
            if (error) {
                console.error(`  ❌ Erro ao inserir plano "${plan.categoria}":`, error.message);
            } else {
                console.log(`  ✅ Plano "${plan.categoria}" inserido (id: ${data.id})`);
            }
        }
    }
}

async function seedPlanning5Y() {
    console.log('\n📅 Inserindo Roteiro Estratégico 5 Anos (PETROMOC)...');
    // Clear existing and reinsert to avoid duplicates
    const { data: existing } = await supabase.from('planning_5y').select('id').limit(1);
    if (existing && existing.length > 0) {
        console.log('  ⏭️  Dados de planning_5y já existem. A verificar itens em falta...');
    }

    for (const item of PLANNING_5Y) {
        const { data: ex } = await supabase.from('planning_5y').select('id').eq('item', item.item).eq('ano', item.ano).eq('trimestre', item.trimestre).single();
        if (ex) { console.log(`  ⏭️  "${item.item}" (${item.ano}/T${item.trimestre}) já existe.`); continue; }

        const { error } = await supabase.from('planning_5y').insert([item]);
        if (error) {
            console.error(`  ❌ Erro ao inserir "${item.item}":`, error.message);
        } else {
            console.log(`  ✅ "${item.item}" (${item.ano}/T${item.trimestre}) inserido.`);
        }
    }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('🚀 Nexo SGFM — Seed de Dados Reais dos Ficheiros de Média');
    console.log('===================================================');

    const adminId = await getAdminUser();
    console.log(`👤 Admin ID: ${adminId}`);

    const properties = await seedProperties();
    await seedAssets(properties);
    await seedMaintenancePlans(properties, adminId);
    await seedPlanning5Y();

    console.log('\n\n✅ Seed concluído! Recarregue a aplicação para ver os dados.');
}

main().catch(e => { console.error('❌ Erro fatal:', e); process.exit(1); });
