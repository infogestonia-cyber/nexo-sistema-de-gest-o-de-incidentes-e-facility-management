-- SQL Migration to add the 'approved' column to incident_parts
-- Use this in your Supabase SQL Editor

ALTER TABLE public.incident_parts ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false;

-- Update existing records so that previously added parts are considered approved (they already deducted stock)
UPDATE public.incident_parts SET approved = true WHERE approved IS false;
