-- Adicionar colunas em falta na tabela de incidentes para suportar origem e custos de mão-de-obra
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS criado_por UUID REFERENCES profiles(id);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS custo_estimado NUMERIC DEFAULT 0;

-- Garantir que o estado padrão seja 'Aberto' para novos registos
ALTER TABLE incidents ALTER COLUMN estado SET DEFAULT 'Aberto';

-- Atualizar registos existentes que possam estar com estado 'Novo' para 'Aberto' para consistência
UPDATE incidents SET estado = 'Aberto' WHERE estado = 'Novo';

-- Corrigir relacionamento entre incident_labor e profiles (caso falte no Supabase)
-- Se a constraint já existir, o comando abaixo falhará graciosamente ou será ignorado conforme o ambiente
ALTER TABLE incident_labor DROP CONSTRAINT IF EXISTS incident_labor_user_id_fkey;
ALTER TABLE incident_labor ADD CONSTRAINT incident_labor_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);

COMMENT ON COLUMN incidents.criado_por IS 'ID do utilizador (profile) que criou o incidente';
COMMENT ON COLUMN incidents.custo_estimado IS 'Valor estimado da mão-de-obra para a intervenção';
