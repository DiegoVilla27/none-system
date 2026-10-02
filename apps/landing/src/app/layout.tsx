import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'None System | Control Contable y Facturas con IA por WhatsApp (Colombia)',
  description:
    'Digitaliza tus facturas, recibos y transferencias con Inteligencia Artificial vía WhatsApp. Extracción automática de NIT, IVA y total en COP, con conciliación y exportación a Excel para contadores y pymes en Colombia.',
  keywords: [
    'facturas whatsapp colombia',
    'ocr facturas colombia',
    'ia contable colombia',
    'factura electronica dian',
    'control de gastos colombia',
    'gemini contabilidad',
    'bot whatsapp recibos',
    'exportar gastos excel colombia',
  ],
  authors: [{ name: 'None System' }],
  openGraph: {
    title: 'None System | Tus facturas y gastos al día en segundos vía WhatsApp',
    description:
      'Envía una foto o PDF por WhatsApp y nuestra IA extrae NIT, IVA y total en pesos colombianos. Descarga tu libro contable en Excel con 1 clic.',
    type: 'website',
    locale: 'es_CO',
    siteName: 'None System',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-surface-base text-slate-100 antialiased selection:bg-brand-500/30 selection:text-brand-200">
        {children}
      </body>
    </html>
  );
}
