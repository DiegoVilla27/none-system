import type { Metadata } from 'next';
import './globals.css';
import { QueryProvider } from '@/providers/QueryProvider';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'none-system · Control Contable & Financiero Inteligente en Colombia',
  description:
    'Digitaliza y categoriza automáticamente tus facturas comerciales y comprobantes bancarios (Bancolombia, Wompi, Nequi) con Inteligencia Artificial ultrarrápida en Pesos Colombianos (COP).',
  keywords: [
    'contabilidad colombia',
    'ocr facturas colombia',
    'recaudo bancolombia',
    'wompi comprobante',
    'control de gastos cop',
    'factura electronica dian',
  ],
  authors: [{ name: 'none-system' }],
  openGraph: {
    title: 'none-system · Control Contable con IA en Colombia',
    description:
      'Escanea facturas y transferencias bancarias en menos de 2 segundos. Genera resúmenes mensuales automáticos para WhatsApp.',
    siteName: 'none-system',
    locale: 'es_CO',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-surface-base text-slate-100 font-sans antialiased">
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
