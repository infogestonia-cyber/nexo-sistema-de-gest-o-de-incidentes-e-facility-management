-- Update assets table with missing columns for obsolescence and auditing
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS obsoleto BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS data_obsolescencia DATE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_assets_updated_at ON assets;
CREATE TRIGGER update_assets_updated_at
    BEFORE UPDATE ON assets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
