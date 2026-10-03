-- 1. Nuevo cupo del plan gratuito: 5 comprobantes con imagen al mes (antes 10).
UPDATE subscriptions SET monthly_limit = 5 WHERE plan = 'free';

-- 2. Fechas guardadas con barras por la IA (ej. 2025/10/29) → formato ISO 2025-10-29.
UPDATE expenses
SET expense_date = to_char(to_date(expense_date, 'YYYY/MM/DD'), 'YYYY-MM-DD'),
    status = 'borrador'
WHERE expense_date ~ '^\d{4}/\d{1,2}/\d{1,2}$';

-- 3. Inicializar el contador de gastos escritos con los ya registrados en el periodo vigente.
UPDATE subscriptions s
SET manual_usage = (
  SELECT count(*) FROM expenses e
  WHERE e.user_id = s.user_id AND e.document_type = 'manual' AND e.created_at >= s.current_period_start
)
WHERE s.user_id IS NOT NULL;
