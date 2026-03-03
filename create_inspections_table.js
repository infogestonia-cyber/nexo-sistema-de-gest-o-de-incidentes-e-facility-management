/**
 * Create the asset_inspections table in Supabase for the Manual Inspection System
 * Run: node create_inspections_table.js
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

// Test if table already exists by trying a select
const { data, error } = await supabase.from('asset_inspections').select('id').limit(1);

if (error && error.code === '42P01') {
    console.log('❌ Table asset_inspections does not exist. Please create it in Supabase dashboard.');
    console.log('\nRun this SQL in your Supabase SQL Editor:\n');
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
  componentes_verificados JSONB DEFAULT '{}',
  observacoes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (disable for development)
ALTER TABLE asset_inspections DISABLE ROW LEVEL SECURITY;
  `);
} else if (error) {
    console.error('Error checking table:', error.message);
} else {
    console.log('✅ Table asset_inspections already exists!');
}
