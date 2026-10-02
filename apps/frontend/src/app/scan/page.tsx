'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/templates/DashboardLayout/DashboardLayout';
import { FileUploader } from '@/components/molecules/FileUploader/FileUploader';
import { SideBySideViewer } from '@/components/organisms/SideBySideViewer/SideBySideViewer';
import { Heading, Text } from '@/components/atoms/Typography/Typography';
import { Button } from '@/components/atoms/Button/Button';
import { MOCK_EXPENSES } from '@/mocks/expense.mocks';
import { Expense, DocumentType } from '@/types/expense.types';
import { Sparkles, RefreshCw } from 'lucide-react';

export default function ScanPage() {
  // Inicia vacío para un nuevo escaneo
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const handleFileSelect = (file: File, type: DocumentType) => {
    setIsScanning(true);

    // Simulación de escaneo visual con la plantilla correspondiente según el tipo seleccionado
    setTimeout(() => {
      const match = type === 'transferencia' ? MOCK_EXPENSES[1] : MOCK_EXPENSES[0];
      const previewUrl = file.type.startsWith('image/')
        ? URL.createObjectURL(file)
        : match.imageUrl;

      setSelectedExpense({
        ...match,
        tipoDocumento: type,
        imageUrl: previewUrl,
        imageOriginalName: file.name,
      });
      setIsScanning(false);
    }, 1000);
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
              onClick={() => setSelectedExpense(null)}
              leftIcon={<RefreshCw className="w-4 h-4 text-brand-400" />}
            >
              Nuevo Escaneo
            </Button>
          )}
        </div>

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
              onSave={(updated) => setSelectedExpense(updated)}
              onCancel={() => setSelectedExpense(null)}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
