'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/templates/DashboardLayout/DashboardLayout';
import { FileUploader } from '@/components/molecules/FileUploader/FileUploader';
import { SideBySideViewer } from '@/components/organisms/SideBySideViewer/SideBySideViewer';
import { Heading, Text } from '@/components/atoms/Typography/Typography';
import { Button } from '@/components/atoms/Button/Button';
import { Expense, DocumentType } from '@/types/expense.types';
import { scanExpense, updateExpense } from '@/lib/api';
import { Sparkles, RefreshCw, AlertCircle } from 'lucide-react';

export default function ScanPage() {
  const router = useRouter();
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (file: File, type: DocumentType) => {
    try {
      setIsScanning(true);
      setError(null);
      const scanned = await scanExpense(file, type);
      setSelectedExpense(scanned);
    } catch (err) {
      console.error('OCR Scanning failed:', err);
      setError(err instanceof Error ? err.message : 'Error al procesar el archivo');
    } finally {
      setIsScanning(false);
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
                Motor IA Multimodal · Gemini 3.5 Flash
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

        {/* Mensaje de Error */}
        {error && (
          <div className="p-4 rounded-xl bg-surface-card border border-rose-500/30 flex items-center gap-3 text-rose-300 text-xs">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Zona de Escaneo o Vista Lado a Lado */}
        {!selectedExpense ? (
          <div className="max-w-2xl mx-auto w-full py-4">
            <FileUploader
              onFileSelect={handleFileSelect}
              isProcessing={isScanning}
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
