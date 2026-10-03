-- Corrección de datos tras introducir verificación de número y consentimiento explícito.
-- Ejecutar UNA vez en cada entorno después de `prisma db push`.

-- 1. Cuentas creadas automáticamente por WhatsApp: el número está probado por Meta,
--    pero la autorización de datos nunca se pidió (se presumía por defecto). Se pedirá en el próximo mensaje.
UPDATE users
SET phone_verified = true,
    habeas_data_accepted = false,
    habeas_data_accepted_at = NULL,
    habeas_data_version = NULL,
    habeas_data_channel = NULL
WHERE email LIKE '%@whatsapp.none-system.com';

-- 2. Cuentas web existentes: conservan su autorización (fue otorgada en el registro), canal web.
--    Su número queda SIN verificar hasta que confirmen el código desde el perfil.
UPDATE users SET habeas_data_channel = 'web'
WHERE email NOT LIKE '%@whatsapp.none-system.com' AND habeas_data_accepted = true AND habeas_data_channel IS NULL;

-- 3. Valores legados en inglés → valores del dominio.
UPDATE expenses SET document_type = 'factura' WHERE document_type = 'invoice';
UPDATE expenses SET document_type = 'transferencia' WHERE document_type = 'transfer';
UPDATE expenses SET status = 'confirmado' WHERE status = 'confirmed';
UPDATE expenses SET status = 'borrador' WHERE status = 'draft';
UPDATE expenses SET extraction_confidence = 'alta' WHERE extraction_confidence = 'high';
UPDATE expenses SET extraction_confidence = 'media' WHERE extraction_confidence = 'medium';
UPDATE expenses SET extraction_confidence = 'baja' WHERE extraction_confidence = 'low';
-- Una transferencia no es factura: nunca cumple Art. 771-2
UPDATE expenses SET is_dian_compliant = false WHERE document_type IN ('transferencia', 'manual');
UPDATE subscriptions SET plan = 'empresarial' WHERE plan = 'enterprise';
UPDATE subscriptions SET plan = 'basico' WHERE plan = 'starter';
