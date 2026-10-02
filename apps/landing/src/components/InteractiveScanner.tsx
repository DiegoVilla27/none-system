'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  FileText,
  DollarSign,
  Tag,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';
import { formatCOP } from '@/lib/utils';

interface ReceiptScenario {
  id: string;
  tabLabel: string;
  tag: string;
  sourceType: string;
  merchant: string;
  nit: string;
  date: string;
  category: string;
  subtotal: number;
  tax: number;
  taxLabel: string;
  total: number;
  paymentMethod: string;
  confidence: number;
  documentSnippet: {
    title: string;
    sub: string;
    items: { desc: string; val: number }[];
    authNote: string;
  };
  whatsappReply: string;
}

const SCENARIOS: ReceiptScenario[] = [
  {
    id: 'exito',
    tabLabel: '🛒 Factura Éxito (IVA 19%)',
    tag: 'Gran Superficie',
    sourceType: 'Factura Electrónica DIAN',
    merchant: 'ALMACENES ÉXITO S.A.',
    nit: '890.900.608-9',
    date: '15/10/2026 - 14:22',
    category: 'Suministros y Abarrotes',
    subtotal: 119748,
    tax: 22752,
    taxLabel: 'IVA (19%)',
    total: 142500,
    paymentMethod: 'Tarjeta Débito Bancolombia',
    confidence: 99.8,
    documentSnippet: {
      title: 'ALMACENES ÉXITO S.A.',
      sub: 'NIT: 890.900.608-9 · Factura No. SEC-829104',
      items: [
        { desc: 'Resma Papel Carta Reprograf', val: 24500 },
        { desc: 'Café Grano Especial Juan Valdez', val: 38900 },
        { desc: 'Elementos Aseo & Desinfección', val: 56348 },
      ],
      authNote: 'CUFE: 8f4b...3a9c · Autorización DIAN 1876402',
    },
    whatsappReply:
      '🧾 *Comprobante Registrado con Éxito*\n\n' +
      '🏪 *Comercio:* ALMACENES ÉXITO S.A.\n' +
      '🆔 *NIT:* 890.900.608-9\n' +
      '💰 *Total:* $142.500 COP\n' +
      '📊 *IVA (19%):* $22.752 COP\n' +
      '🏷️ *Categoría:* Suministros\n' +
      '💳 *Medio:* Débito Bancolombia\n\n' +
      '✅ *Saldo restante:* 48 / 50 comprobantes este mes.',
  },
  {
    id: 'nequi',
    tabLabel: '📱 Transferencia Nequi / Bancolombia',
    tag: 'Transferencia Bancaria',
    sourceType: 'Comprobante de Transferencia',
    merchant: 'TRANSPORTE Y LOGÍSTICA EXPRESS',
    nit: '901.345.876-1',
    date: '15/10/2026 - 09:15',
    category: 'Fletes y Mensajería',
    subtotal: 280000,
    tax: 0,
    taxLabel: 'Exento (Transferencia)',
    total: 280000,
    paymentMethod: 'Nequi Cuenta Ahorros',
    confidence: 99.4,
    documentSnippet: {
      title: '¡Transferencia Exitosa! - Nequi',
      sub: 'Comprobante M-9482710 · De Celular a Celular',
      items: [
        { desc: 'Envío de encomiendas lote Bogotá-Medellín', val: 280000 },
      ],
      authNote: 'Referencia Bancaria: REF-99382104',
    },
    whatsappReply:
      '🧾 *Transferencia Registrada*\n\n' +
      '🏪 *Comercio / Destino:* LOGÍSTICA EXPRESS\n' +
      '🆔 *Referencia:* REF-99382104\n' +
      '💰 *Total:* $280.000 COP\n' +
      '🏷️ *Categoría:* Fletes y Mensajería\n' +
      '💳 *Medio:* Nequi\n\n' +
      '✅ Tu contador ya puede ver este comprobante en el Backoffice.',
  },
  {
    id: 'restaurante',
    tabLabel: '🍽️ Restaurante (Impoconsumo 8%)',
    tag: 'Restaurante / Cafetería',
    sourceType: 'Tirilla POS Registradora',
    merchant: 'RESTAURANTE EL PORTÓN CRIOLLO',
    nit: '900.562.112-4',
    date: '14/10/2026 - 19:40',
    category: 'Alimentación y Viáticos',
    subtotal: 81481,
    tax: 6519,
    taxLabel: 'Impoconsumo (8%)',
    total: 88000,
    paymentMethod: 'Efectivo / POS',
    confidence: 98.9,
    documentSnippet: {
      title: 'EL PORTÓN CRIOLLO S.A.S.',
      sub: 'NIT: 900.562.112-4 · Ticket #09281',
      items: [
        { desc: '2 Almuerzos Ejecutivos Especiales', val: 56000 },
        { desc: '2 Jugos Naturales en Agua', val: 18000 },
        { desc: '1 Porción Postre Tres Leches', val: 7481 },
      ],
      authNote: 'Impuesto Nacional al Consumo 8% incluido según Art. 512-1 E.T.',
    },
    whatsappReply:
      '🧾 *Consumo Restaurante Registrado*\n\n' +
      '🏪 *Comercio:* EL PORTÓN CRIOLLO\n' +
      '🆔 *NIT:* 900.562.112-4\n' +
      '💰 *Total:* $88.000 COP\n' +
      '📊 *Impoconsumo (8%):* $6.519 COP\n' +
      '🏷️ *Categoría:* Alimentación\n\n' +
      '💡 Deducción comercial archivada automáticamente.',
  },
];

export const InteractiveScanner: React.FC = () => {
  const [activeScenarioId, setActiveScenarioId] = useState<string>('exito');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [showResult, setShowResult] = useState<boolean>(true);

  const scenario = SCENARIOS.find((s) => s.id === activeScenarioId) || SCENARIOS[0];

  const handleSelectScenario = (id: string) => {
    setActiveScenarioId(id);
    setIsScanning(true);
    setShowResult(false);
  };

  useEffect(() => {
    if (isScanning) {
      const timer = setTimeout(() => {
        setIsScanning(false);
        setShowResult(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isScanning]);

  const handleRescan = () => {
    setIsScanning(true);
    setShowResult(false);
  };

  return (
    <section id="demo" className="py-20 bg-surface-base/90 border-t border-surface-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-300 mb-4">
            <Sparkles className="h-3.5 w-3.5 text-brand-400" />
            Demostración Interactiva en Tiempo Real
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Mira cómo la IA lee recibos colombianos en <span className="text-brand-400">2 segundos</span>
          </h2>
          <p className="mt-4 text-slate-300 text-base sm:text-lg">
            Haz clic en los ejemplos de comprobantes reales en Colombia para ver la extracción automática de datos contables y el mensaje inmediato en WhatsApp.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-8">
          {SCENARIOS.map((s) => {
            const isSelected = s.id === activeScenarioId;
            return (
              <button
                key={s.id}
                onClick={() => handleSelectScenario(s.id)}
                className={`rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-200 border ${
                  isSelected
                    ? 'border-brand-400 bg-brand-500/15 text-brand-200 shadow-glow'
                    : 'border-surface-border bg-surface-card text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {s.tabLabel}
              </button>
            );
          })}
        </div>

        {/* Interactive Viewer Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Column: Simulated Physical Document (Receipt) */}
          <div className="lg:col-span-6 flex flex-col">
            <div className="rounded-2xl border border-surface-border bg-surface-card/80 p-6 flex-1 flex flex-col justify-between relative overflow-hidden backdrop-blur-md">
              {/* Header inside receipt preview */}
              <div className="flex items-center justify-between border-b border-surface-border/60 pb-3 mb-4">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="h-4 w-4 text-brand-400" /> Documento Original Recibido
                </span>
                <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-medium text-slate-300 border border-slate-700">
                  {scenario.sourceType}
                </span>
              </div>

              {/* Physical Receipt Simulation Paper */}
              <div className="relative mx-auto w-full max-w-md rounded-xl bg-slate-900 border border-slate-700/80 p-5 shadow-2xl font-mono text-xs text-slate-200 overflow-hidden">
                {/* Laser scan line when active */}
                {isScanning && (
                  <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-scan z-20 pointer-events-none" />
                )}

                <div className="text-center border-b border-dashed border-slate-700 pb-3">
                  <div className="text-sm font-bold text-white tracking-wider">{scenario.documentSnippet.title}</div>
                  <div className="text-[11px] text-slate-400 mt-1">{scenario.documentSnippet.sub}</div>
                  <div className="text-[10px] text-slate-500 mt-1">{scenario.date} COT</div>
                </div>

                <div className="py-4 space-y-2 border-b border-dashed border-slate-700">
                  {scenario.documentSnippet.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-300 truncate max-w-[240px]">{item.desc}</span>
                      <span className="font-semibold text-slate-100">{formatCOP(item.val)}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 space-y-1 text-[11px]">
                  <div className="flex justify-between text-slate-400">
                    <span>SUBTOTAL:</span>
                    <span>{formatCOP(scenario.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>{scenario.taxLabel}:</span>
                    <span>{formatCOP(scenario.tax)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-800">
                    <span>TOTAL FACTURA:</span>
                    <span className="text-brand-300 font-extrabold">{formatCOP(scenario.total)}</span>
                  </div>
                </div>

                <div className="mt-4 text-[9px] text-center text-slate-500 pt-2 border-t border-dashed border-slate-800">
                  {scenario.documentSnippet.authNote}
                </div>
              </div>

              {/* Action bar below paper */}
              <div className="mt-4 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-surface-border/50">
                <span>Estado de escaneo: {isScanning ? 'Extrayendo con IA...' : 'Listo'}</span>
                <button
                  onClick={handleRescan}
                  disabled={isScanning}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-surface-elevated px-3 py-1.5 text-slate-200 hover:text-white hover:border-brand-500 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                  Escanear de nuevo
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Instant Structured Extraction & WhatsApp Bubble */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            {/* Extracted Data Card */}
            <div className="rounded-2xl border border-brand-500/30 bg-surface-card/90 p-6 backdrop-blur-md relative overflow-hidden flex-1 flex flex-col justify-between">
              <div className="flex items-center justify-between pb-3 border-b border-surface-border">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                    Extracción IA Gemini 2.5 Flash
                  </span>
                </div>
                <span className="text-xs font-mono text-slate-400 bg-surface-elevated px-2.5 py-0.5 rounded border border-surface-border">
                  Confianza: {scenario.confidence}%
                </span>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-2 gap-4 my-4">
                <div className="rounded-xl border border-surface-border bg-surface-base/60 p-3">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-brand-400" />
                    Comercio Detectado
                  </div>
                  <div className="text-sm font-bold text-white mt-1 truncate">{scenario.merchant}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">NIT: {scenario.nit}</div>
                </div>

                <div className="rounded-xl border border-surface-border bg-surface-base/60 p-3">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                    Total Extraído (COP)
                  </div>
                  <div className="text-base font-extrabold text-brand-300 mt-1">
                    {formatCOP(scenario.total)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {scenario.taxLabel}: {formatCOP(scenario.tax)}
                  </div>
                </div>

                <div className="rounded-xl border border-surface-border bg-surface-base/60 p-3">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-cyan-400" />
                    Categoría Asignada
                  </div>
                  <div className="text-xs font-semibold text-white mt-1">{scenario.category}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Automática por IA</div>
                </div>

                <div className="rounded-xl border border-surface-border bg-surface-base/60 p-3">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-amber-400" />
                    Fecha y Medio de Pago
                  </div>
                  <div className="text-xs font-semibold text-white mt-1 truncate">{scenario.paymentMethod}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{scenario.date}</div>
                </div>
              </div>

              {/* WhatsApp Live Reply Preview */}
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4">
                <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-emerald-300">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Respuesta inmediata en tu WhatsApp (en 1.8 segundos):
                </div>
                <pre className="whitespace-pre-wrap font-sans text-xs text-slate-300 leading-relaxed bg-surface-base/80 p-3 rounded-lg border border-surface-border">
                  {scenario.whatsappReply}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
