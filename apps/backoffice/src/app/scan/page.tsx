'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/templates/DashboardLayout/DashboardLayout';
import { FileUploader } from '@/components/molecules/FileUploader/FileUploader';
import { SideBySideViewer } from '@/components/organisms/SideBySideViewer/SideBySideViewer';
import { Heading, Text } from '@/components/atoms/Typography/Typography';
import { Button } from '@/components/atoms/Button/Button';
import { Expense, DocumentType } from '@/types/expense.types';
import { scanExpense, updateExpense } from '@/lib/api';
import { Sparkles, RefreshCw, AlertCircle, RotateCcw } from 'lucide-react';

export default function ScanPage() {
  const router = useRouter();
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState('Digitalizando comprobante...');
  const [error, setError] = useState<string | null>(null);

  // Guardar referencia para permitir reintentos con un clic
  const lastAttemptRef = useRef<{ file: File; type: DocumentType } | null>(null);

  const startProgressSimulation = () => {
    setScanProgress(15);
    setScanStatus('Preparando y optimizando archivo...');

    const stages = [
      { progress: 35, status: 'Iniciando lectura inteligente con IA...', delay: 600 },
      { progress: 65, status: 'Extrayendo valores, NIT, comercio y fecha...', delay: 1400 },
      { progress: 85, status: 'Estructurando información en Pesos Colombianos (COP)...', delay: 2400 },
      { progress: 94, status: 'Finalizando análisis...', delay: 3500 },
    ];

    const timeouts: NodeJS.Timeout[] = [];
    stages.forEach((stage) => {
      const timeout = setTimeout(() => {
        setScanProgress((prev) => Math.max(prev, stage.progress));
        setScanStatus(stage.status);
      }, stage.delay);
      timeouts.push(timeout);
    });

    return () => timeouts.forEach(clearTimeout);
  };

  const handleFileSelect = async (file: File, type: DocumentType) => {
    lastAttemptRef.current = { file, type };
    setError(null);
    setIsScanning(true);

    const cleanupProgress = startProgressSimulation();

    try {
      const scanned = await scanExpense(file, type);
      cleanupProgress();
      setScanProgress(100);
      setScanStatus('¡Comprobante leído con éxito!');

      // Breve pausa para mostrar el 100% completado antes de pasar al visor
      setTimeout(() => {
        setSelectedExpense(scanned);
        setIsScanning(false);
        setScanProgress(0);
      }, 350);
    } catch (err) {
      cleanupProgress();
      setIsScanning(false);
      setScanProgress(0);
      console.error('OCR Scanning failed:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'No logramos procesar el comprobante. Por favor verifica que la imagen sea legible y vuelve a intentarlo.'
      );
    }
  };

  const handleRetryLastScan = () => {
    if (lastAttemptRef.current) {
      handleFileSelect(lastAttemptRef.current.file, lastAttemptRef.current.type);
    }
  };

  const handleConfirmAndSave = async (updated: Expense) => {
    if (!selectedExpense) return;
    try {
      setError(null);
      await updateExpense(selectedExpense.id, {
        ...updated,
        estado: 'confirmado',
      });

      // Redirigir a la tabla de expenses tras guardar exitosamente
      router.push('/expenses');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el comprobante');
    }
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
                Digitalización Contable con IA
              </Text>
            </div>
            <Heading level={1}>Escanear Nuevo Documento</Heading>
            <Text variant="body" className="text-slate-400 mt-1">
              Sube una factura comercial o comprobante bancario para extraer automáticamente sus datos contables.
            </Text>
          </div>

          {selectedExpense && (
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                setSelectedExpense(null);
                setError(null);
              }}
              leftIcon={<RefreshCw className="w-4 h-4 text-brand-400" />}
            >
              Nuevo Escaneo
            </Button>
          )}
        </div>

        {/* Mensaje de Error Amigable */}
        {error && (
          <div className="p-4 rounded-xl bg-surface-card border border-rose-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start sm:items-center gap-3 text-rose-300">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 sm:mt-0" />
              <span>{error}</span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              {lastAttemptRef.current && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRetryLastScan}
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  className="text-xs"
                >
                  Reintentar
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError(null)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Cerrar
              </Button>
            </div>
          </div>
        )}

        {/* Zona de Escaneo o Vista Lado a Lado */}
        {!selectedExpense ? (
          <div className="max-w-2xl mx-auto w-full py-4">
            <FileUploader
              onFileSelect={handleFileSelect}
              isProcessing={isScanning}
              progressPercentage={scanProgress}
              progressStatus={scanStatus}
              onError={(msg) => setError(msg)}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <SideBySideViewer
              initialExpense={selectedExpense}
              onSave={handleConfirmAndSave}
              onCancel={() => {
                setSelectedExpense(null);
                setError(null);
              }}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
