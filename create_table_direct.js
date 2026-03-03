/**
 * Create asset_inspections table using Supabase's SQL runner
 * Run: node create_table_direct.js
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
    CREATE TABLE IF NOT EXISTS asset_inspections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
      inspector_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
      data_inspecao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      condicao_geral TEXT NOT NULL DEFAULT 'Bom',
      anomalias_detectadas TEXT DEFAULT '',
      descricao_anomalias TEXT DEFAULT '',
      accoes_imediatas TEXT DEFAULT '',
      requer_manutencao BOOLEAN DEFAULT FALSE,
      componentes_verificados TEXT DEFAULT '{}',
      observacoes TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE asset_inspections DISABLE ROW LEVEL SECURITY;
  `
});

if (error) {
    console.error('❌ Error via RPC:', error.message);
    console.log('\n📋 Please run this SQL manually in your Supabase dashboard → SQL Editor:\n');
    console.log(`
CREATE TABLE IF NOT EXISTS asset_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  inspector_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  data_inspecao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  condicao_geral TEXT NOT NULL DEFAULT 'Bom',
  anomalias_detectadas TEXT DEFAULT '',
  descricao_anomalias TEXT DEFAULT '',
  accoes_imediatas TEXT DEFAULT '',
  requer_manutencao BOOLEAN DEFAULT FALSE,
  componentes_verificados TEXT DEFAULT '{}',
  observacoes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE asset_inspections DISABLE ROW LEVEL SECURITY;
  `);
} else {
    console.log('✅ Table created successfully!');
}
