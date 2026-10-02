'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/templates/DashboardLayout/DashboardLayout';
import { FileUploader } from '@/components/molecules/FileUploader/FileUploader';
import { SideBySideViewer } from '@/components/organisms/SideBySideViewer/SideBySideViewer';
import { Heading, Text } from '@/components/atoms/Typography/Typography';
import { Button } from '@/components/atoms/Button/Button';
import { MOCK_EXPENSES } from '@/mocks/expense.mocks';
import { Expense, DocumentType } from '@/types/expense.types';
import { Scan, Sparkles, RefreshCw, FileText, ArrowRightLeft } from 'lucide-react';

export default function ScanPage() {
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(MOCK_EXPENSES[0]);
  const [isScanning, setIsScanning] = useState(false);

  const handleSelectExample = (id: string) => {
    setIsScanning(true);
    setTimeout(() => {
      const found = MOCK_EXPENSES.find((e) => e.id === id) || null;
      setSelectedExpense(found);
      setIsScanning(false);
    }, 600);
  };

  const handleFileSelect = (file: File, type: DocumentType) => {
    setIsScanning(true);
    // Simulación de procesamiento de IA
    setTimeout(() => {
      const match = type === 'transferencia' ? MOCK_EXPENSES[1] : MOCK_EXPENSES[0];
      setSelectedExpense({
        ...match,
        imageOriginalName: file.name,
      });
      setIsScanning(false);
    }, 1200);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-surface-border pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-brand-400" />
              <Text variant="small" className="text-brand-300 font-mono tracking-wider uppercase font-semibold">
                Motor IA Multimodal · Gemini 3.5 Flash
              </Text>
            </div>
            <Heading level={1}>Escaneo y Verificación de Comprobantes</Heading>
            <Text variant="body" className="text-slate-400 mt-1">
              Sube una factura o comprobante bancario para extraer instantáneamente sus datos contables.
            </Text>
          </div>

          {selectedExpense && (
            <Button
              variant="secondary"
              size="md"
              onClick={() => setSelectedExpense(null)}
              leftIcon={<RefreshCw className="w-4 h-4 text-brand-400" />}
            >
              Nuevo Escaneo
            </Button>
          )}
        </div>

        {/* Si no hay comprobante seleccionado, muestra el uploader y atajos de ejemplo */}
        {!selectedExpense ? (
          <div className="max-w-2xl mx-auto w-full flex flex-col gap-6 py-4">
            <FileUploader
              onFileSelect={handleFileSelect}
              isProcessing={isScanning}
            />

            {/* Atajos de ejemplos reales para probar de inmediato sin subir archivos */}
            <div className="flex flex-col gap-3 pt-4 border-t border-surface-border">
              <Text variant="small" className="text-slate-400 font-medium text-center">
                O prueba directamente con los 2 ejemplos reales de Colombia:
              </Text>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleSelectExample('exp-alkomprar-01')}
                  className="flex items-center gap-3 p-3 rounded-xl bg-surface-card border border-surface-border hover:border-cyan-500/50 hover:bg-surface-elevated transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 group-hover:scale-105 transition-transform">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-200">
                      Ejemplo 1: Factura Alkomprar
                    </div>
                    <div className="text-[11px] font-mono text-cyan-300">
                      $ 4.798.950 COP (IVA 19%)
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectExample('exp-wompi-02')}
                  className="flex items-center gap-3 p-3 rounded-xl bg-surface-card border border-surface-border hover:border-indigo-500/50 hover:bg-surface-elevated transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 group-hover:scale-105 transition-transform">
                    <ArrowRightLeft className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-200">
                      Ejemplo 2: Comprobante Wompi
                    </div>
                    <div className="text-[11px] font-mono text-indigo-300">
                      $ 50.000 COP (Funeraria San Vicente)
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Vista Lado a Lado Activa */
          <div className="flex flex-col gap-6">
            {/* Barra rápida de cambio entre ejemplos */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-card border border-surface-border">
              <span className="text-xs text-slate-400">
                Visualizando:{' '}
                <strong className="text-slate-200 font-semibold">{selectedExpense.comercio}</strong>
              </span>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={selectedExpense.id === 'exp-alkomprar-01' ? 'outline' : 'ghost'}
                  onClick={() => handleSelectExample('exp-alkomprar-01')}
                >
                  Ver Factura Alkomprar
                </Button>
                <Button
                  size="sm"
                  variant={selectedExpense.id === 'exp-wompi-02' ? 'outline' : 'ghost'}
                  onClick={() => handleSelectExample('exp-wompi-02')}
                >
                  Ver Comprobante Wompi
                </Button>
              </div>
            </div>

            <SideBySideViewer
              initialExpense={selectedExpense}
              onSave={(updated) => setSelectedExpense(updated)}
              onCancel={() => setSelectedExpense(null)}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
