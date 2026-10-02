'use client';

import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { DocumentType } from '@/types/expense.types';
import { validateAndCompressFile } from '@/lib/image-compressor';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  X,
  Loader2,
  Sparkles,
} from 'lucide-react';
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
  /**
   * Porcentaje de progreso de la petición (0 a 100).
   */
  progressPercentage?: number;
  /**
   * Mensaje descriptivo de la etapa actual de procesamiento.
   */
  progressStatus?: string;
  /**
   * Callback para errores de validación de archivo (ej. tamaño > 5MB).
   */
  onError?: (error: string) => void;
  className?: string;
}

/**
 * Componente molecular FileUploader con selector de tipo (Factura vs Transferencia),
 * validación de tamaño máx 5MB, compresión automática en cliente y barra de progreso.
 */
export const FileUploader: React.FC<FileUploaderProps> = ({
  onFileSelect,
  defaultType = 'factura',
  isProcessing = false,
  progressPercentage = 0,
  progressStatus = 'Digitalizando comprobante con IA...',
  onError,
  className,
}) => {
  const [selectedType, setSelectedType] = useState<DocumentType>(defaultType);
  const [dragActive, setDragActive] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    name: string;
    size: string;
    url?: string;
    compressionNote?: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleTypeChange = (type: DocumentType) => {
    if (isProcessing) return;
    setSelectedType(type);
  };

  const handleDrag = (e: React.DragEvent) => {
    if (isProcessing) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = async (rawFile: File) => {
    try {
      // 1. Validar tamaño máx 5MB y comprimir fotos móviles en cliente
      const compressionResult = await validateAndCompressFile(rawFile);
      const fileToUpload = compressionResult.file;

      const sizeKB = (fileToUpload.size / 1024).toFixed(0);
      const sizeMB = (fileToUpload.size / (1024 * 1024)).toFixed(1);
      const formattedSize = fileToUpload.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;

      let url: string | undefined;
      if (fileToUpload.type.startsWith('image/')) {
        url = URL.createObjectURL(fileToUpload);
      }

      setPreviewFile({
        name: rawFile.name,
        size: formattedSize,
        url,
        compressionNote: compressionResult.wasCompressed
          ? `Optimizado -${compressionResult.savedPercentage}%`
          : undefined,
      });

      // 2. Disparar callback
      onFileSelect?.(fileToUpload, selectedType);
    } catch (err) {
      if (onError && err instanceof Error) {
        onError(err.message);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (isProcessing) return;
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
    if (isProcessing) return;
    e.stopPropagation();
    setPreviewFile(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className={cn('w-full flex flex-col gap-4', className)}>
      {/* Selector de Tipo de Documento */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-300 tracking-wide uppercase flex items-center justify-between">
          <span>1. Tipo de Comprobante</span>
          {isProcessing && (
            <span className="text-[11px] font-normal text-slate-500 lowercase">
              (bloqueado durante el escaneo)
            </span>
          )}
        </label>
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-surface-card border border-surface-border">
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => handleTypeChange('factura')}
            className={cn(
              'flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs select-none transition-colors duration-150',
              selectedType === 'factura'
                ? 'bg-surface-elevated text-brand-300 border border-brand-500/40 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 border border-transparent',
              isProcessing && 'opacity-40 cursor-not-allowed pointer-events-none'
            )}
          >
            <FileText className="w-4 h-4 text-brand-400" />
            <span>Factura / Compra</span>
          </button>

          <button
            type="button"
            disabled={isProcessing}
            onClick={() => handleTypeChange('transferencia')}
            className={cn(
              'flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs select-none transition-colors duration-150',
              selectedType === 'transferencia'
                ? 'bg-surface-elevated text-indigo-300 border border-indigo-500/40 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 border border-transparent',
              isProcessing && 'opacity-40 cursor-not-allowed pointer-events-none'
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
          2. Archivo del Soporte (Máx. 5 MB)
        </label>

        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => {
            if (!isProcessing) inputRef.current?.click();
          }}
          className={cn(
            'relative flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed transition-all duration-200 bg-surface-card/60',
            isProcessing
              ? 'border-brand-500/50 bg-brand-500/5 cursor-wait'
              : dragActive
              ? 'border-brand-400 bg-brand-500/10 shadow-glow cursor-pointer'
              : 'border-surface-border hover:border-brand-500/40 hover:bg-surface-card cursor-pointer'
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleChange}
            disabled={isProcessing}
            className="hidden"
          />

          {isProcessing ? (
            /* ================= ESTADO DE PROCESAMIENTO ACTIVO CON PROGRESS BAR ================= */
            <div className="w-full max-w-md flex flex-col items-center gap-4 py-2">
              <div className="relative flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 animate-pulse">
                  <Sparkles className="w-6 h-6 text-brand-300 animate-spin" />
                </div>
              </div>

              <div className="w-full flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-200 font-medium truncate max-w-[280px]">
                    {progressStatus}
                  </span>
                  <span className="font-mono font-bold text-cyan-300">
                    {Math.round(progressPercentage)}%
                  </span>
                </div>

                {/* Barra de Progreso */}
                <div className="w-full h-2 rounded-full bg-surface-elevated overflow-hidden border border-surface-border">
                  <div
                    className="h-full bg-gradient-to-r from-brand-500 via-cyan-400 to-emerald-400 transition-all duration-300 ease-out"
                    style={{ width: `${Math.max(5, Math.min(100, progressPercentage))}%` }}
                  />
                </div>
              </div>

              {previewFile && (
                <div className="text-[11px] text-slate-400 flex items-center gap-2">
                  <span className="truncate max-w-[200px]">{previewFile.name}</span>
                  <span>•</span>
                  <span>{previewFile.size}</span>
                  {previewFile.compressionNote && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px]">
                      {previewFile.compressionNote}
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : previewFile ? (
            /* ================= ARCHIVO SELECCIONADO ================= */
            <div className="flex items-center justify-between w-full max-w-sm p-3 rounded-lg bg-surface-elevated border border-surface-border">
              <div className="flex items-center gap-3 truncate">
                <div className="w-10 h-10 rounded-lg bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 shrink-0">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <div className="text-sm font-medium text-slate-200 truncate">
                    {previewFile.name}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>{previewFile.size}</span>
                    {previewFile.compressionNote && (
                      <span className="text-emerald-400 text-[10px]">
                        {previewFile.compressionNote}
                      </span>
                    )}
                  </div>
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
            /* ================= DROPZONE INICIAL ================= */
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-surface-elevated border border-surface-border flex items-center justify-center text-brand-400 mb-1">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="text-sm font-medium text-slate-200">
                Haz clic para subir o arrastra la foto del soporte
              </div>
              <Text variant="muted" className="text-slate-400 text-xs">
                JPG, PNG, WEBP o PDF hasta 5 MB (fotos móviles se optimizan automáticamente)
              </Text>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
