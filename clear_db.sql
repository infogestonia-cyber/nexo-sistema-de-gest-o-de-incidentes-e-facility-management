-- Nexo SGFM - Production Cleanup Script
-- WARNING: This script deletes all transactional data. Use with caution.

BEGIN;

-- 1. Clear Maintenance History and Executions
DELETE FROM maintenance_history;
DELETE FROM maintenance_plans;
DELETE FROM pm_schedules;

-- 2. Clear Incidents and Comments
DELETE FROM incident_comments;
DELETE FROM incident_history;
DELETE FROM incidents;

-- 3. Clear Inventory Transactions
DELETE FROM inventory_transactions;
-- Keep inventory items but reset stock to 0 if necessary, or just keep as is.
-- UPDATE inventory_items SET stock_quantity = 0;

-- 4. Clear Notifications
DELETE FROM notifications;

-- 5. Clear Audit Logs (if any)
-- DELETE FROM audit_logs;

COMMIT;

-- Note: Core tables like 'properties', 'assets', 'users', 'profiles', and 'inventory_items' 
-- are preserved as they contain the base configuration for the environment.
