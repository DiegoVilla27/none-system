-- Periodos del plan gratuito alineados al mes calendario de Colombia (America/Bogota).
UPDATE subscriptions
SET current_period_start = (date_trunc('month', now() AT TIME ZONE 'America/Bogota') AT TIME ZONE 'America/Bogota') AT TIME ZONE 'UTC',
    current_period_end = ((date_trunc('month', now() AT TIME ZONE 'America/Bogota') + interval '1 month') AT TIME ZONE 'America/Bogota') AT TIME ZONE 'UTC'
WHERE plan = 'free';
