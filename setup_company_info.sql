-- --- TABELA DE INFORMAÇÕES DA EMPRESA ---
-- Esta tabela armazena os dados que aparecerão nos cabeçalhos dos relatórios.
-- Execute este script no SQL Editor do Supabase.

CREATE TABLE IF NOT EXISTS company_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    endereco TEXT,
    telefone TEXT,
    email TEXT,
    logotipo_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inserir dados iniciais (opcional, pode ser feito via API)
INSERT INTO company_info (nome, endereco, telefone, email)
VALUES ('Platinum Group', 'Av. Mao-Tsé-Tung, 11ESQ, Maputo', '+258 84 000 0000', 'Platinum.info@gmail.com')
ON CONFLICT DO NOTHING;
