-- Remove a obrigatoriedade da coluna asset_id na tabela inventory
-- Isto permite registar materiais/consumíveis gerais sem os vincular a um ativo específico
ALTER TABLE inventory ALTER COLUMN asset_id DROP NOT NULL;
