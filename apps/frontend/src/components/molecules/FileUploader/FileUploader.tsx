'use client';

import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { DocumentType } from '@/types/expense.types';
import { UploadCloud, FileText, Image as ImageIcon, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/atoms/Button/Button';
import { Text } from '@/components/atoms/Typography/Typography';

export interface FileUploaderProps {
  /**
   * Callback invocado al seleccionar o cambiar el archivo.
   */
  onFileSelect?: (file: File, type: DocumentType) => void;
  /**
   * Tipo de documento seleccionado por defecto.
   */
  defaultType?: DocumentType;
  /**
   * Estado de carga de escaneo con IA.
   */
  isProcessing?: boolean;
  className?: string;
}

/**
 * Componente molecular FileUploader con selector de tipo (Factura vs Transferencia)
 * y zona de arrastre con feedback visual sutil y elegante.
 */
export const FileUploader: React.FC<FileUploaderProps> = ({
  onFileSelect,
  defaultType = 'factura',
  isProcessing = false,
  className,
}) => {
  const [selectedType, setSelectedType] = useState<DocumentType>(defaultType);
  const [dragActive, setDragActive] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ name: string; size: string; url?: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleTypeChange = (type: DocumentType) => {
    setSelectedType(type);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    const sizeKB = (file.size / 1024).toFixed(0);
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    const formattedSize = file.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;

    let url: string | undefined;
    if (file.type.startsWith('image/')) {
      url = URL.createObjectURL(file);
    }

    setPreviewFile({ name: file.name, size: formattedSize, url });
    onFileSelect?.(file, selectedType);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewFile(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className={cn('w-full flex flex-col gap-4', className)}>
      {/* Selector de Tipo de Documento */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-300 tracking-wide uppercase">
          1. Selecciona el Tipo de Comprobante
        </label>
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-surface-card border border-surface-border">
          <button
            type="button"
            onClick={() => handleTypeChange('factura')}
            className={cn(
              'flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-medium transition-all select-none',
              selectedType === 'factura'
                ? 'bg-gradient-to-r from-brand-500/20 to-teal-500/20 text-brand-300 border border-brand-500/50 shadow-glow font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-surface-elevated'
            )}
          >
            <FileText className="w-4 h-4 text-brand-400" />
            <span>Factura / Compra</span>
          </button>

          <button
            type="button"
            onClick={() => handleTypeChange('transferencia')}
            className={cn(
              'flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-medium transition-all select-none',
              selectedType === 'transferencia'
                ? 'bg-gradient-to-r from-indigo-500/20 to-brand-500/20 text-indigo-300 border border-indigo-500/50 shadow-glow font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-surface-elevated'
            )}
          >
            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
            <span>Transferencia / Recaudo</span>
          </button>
        </div>
      </div>

      {/* Dropzone de archivo */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-300 tracking-wide uppercase">
          2. Sube la Foto o PDF
        </label>

        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'relative flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 bg-surface-card/60',
            dragActive
              ? 'border-brand-400 bg-brand-500/10 shadow-glow'
              : 'border-surface-border hover:border-brand-500/40 hover:bg-surface-card',
            isProcessing && 'pointer-events-none opacity-60'
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleChange}
            className="hidden"
          />

          {previewFile ? (
            <div className="flex items-center justify-between w-full max-w-sm p-3 rounded-lg bg-surface-elevated border border-surface-border">
              <div className="flex items-center gap-3 truncate">
                <div className="w-10 h-10 rounded-lg bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 shrink-0">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <div className="text-sm font-medium text-slate-200 truncate">
                    {previewFile.name}
                  </div>
                  <div className="text-xs text-slate-400">{previewFile.size}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={clearFile}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-surface-base"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-surface-elevated border border-surface-border flex items-center justify-center text-brand-400 mb-1 group-hover:scale-105 transition-all">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="text-sm font-medium text-slate-200">
                Haz clic para subir o arrastra la foto del soporte
              </div>
              <Text variant="muted" className="text-slate-400 text-xs">
                Soporta JPG, PNG, WEBP o PDF hasta 10MB
              </Text>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
