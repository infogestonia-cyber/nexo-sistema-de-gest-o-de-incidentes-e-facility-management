-- Adiciona a coluna qr_code à tabela assets
ALTER TABLE assets ADD COLUMN qr_code TEXT UNIQUE;

-- Adiciona a coluna qr_code à tabela inventory (materiais)
ALTER TABLE inventory ADD COLUMN qr_code TEXT UNIQUE;
