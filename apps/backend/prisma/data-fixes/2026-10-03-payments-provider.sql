-- Pagos registrados antes de integrar Wompi: eran simulados y su plan ya se aplicó.
UPDATE payment_transactions
SET provider = 'simulated',
    status = 'SIMULATED',
    plan_applied_at = COALESCE(plan_applied_at, paid_at, created_at)
WHERE provider_transaction_id IS NULL AND status IN ('APPROVED', 'SIMULATED');
