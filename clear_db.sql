-- --- LIMPEZA DE DADOS (CONTEÚDO) PARA PRODUÇÃO ---
-- Este script APENAS elimina as linhas (registos) das tabelas.
-- A estrutura das tabelas (colunas, tipos, etc.) permanece INTACTA.
-- Execute este script no SQL Editor do Supabase.

BEGIN;

-- Bloque robusto que apenas limpa as tabelas que efetivamente existem na base de dados
DO $$ 
DECLARE
    t_name TEXT;
    tables_to_clear TEXT[] := ARRAY[
        'incident_media', 'incident_labor', 'incident_parts', 'incident_checklists', 
        'incident_actions', 'incidents', 'asset_inspections', 'meter_readings', 
        'maintenance_plans', 'pm_schedules', 'planning_5y', 'inventory', 
        'assets', 'properties', 'notifications', 'clientes', 'profiles', 'system_settings'
    ];
BEGIN
    FOREACH t_name IN ARRAY tables_to_clear
    LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t_name) THEN
            EXECUTE 'TRUNCATE TABLE ' || quote_ident(t_name) || ' RESTART IDENTITY CASCADE';
            RAISE NOTICE 'Tabela % limpa.', t_name;
        ELSE
            RAISE NOTICE 'Tabela % não existe, ignorada.', t_name;
        END IF;
    END LOOP;
END $$;

COMMIT;

-- --- FIM DA LIMPEZA ---
-- Reinicie o servidor da aplicação para recriar o admin e as configurações base.
