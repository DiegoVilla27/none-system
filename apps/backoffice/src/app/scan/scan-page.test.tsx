import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import ScanPage from './page';
import { renderWithProviders } from '@/test/test-utils';
import { mockPush } from '@/test/setup';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';

describe('Página de Escaneo /scan (Prueba de Integración con MSW)', () => {
  it('renderiza la interfaz de escaneo con IA y el uploader de archivos', () => {
    renderWithProviders(<ScanPage />);

    expect(screen.getByText('Digitalización Contable con IA')).toBeInTheDocument();
    expect(screen.getByText('Escanear Nuevo Documento')).toBeInTheDocument();
    expect(screen.getByText('1. Tipo de Comprobante')).toBeInTheDocument();
    expect(screen.getByText('2. Archivo del Soporte (Máx. 5 MB)')).toBeInTheDocument();
  });

  it('procesa el archivo vía OCR de MSW y transiciona al visor lado a lado', async () => {
    renderWithProviders(<ScanPage />);

    const file = new File(['mock content'], 'factura-exito.pdf', {
      type: 'application/pdf',
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    fireEvent.change(fileInput, { target: { files: [file] } });

    // Esperar a que el escaneo termine y se muestre el visor con los datos devueltos por MSW
    await waitFor(
      () => {
        expect(screen.getByDisplayValue('ÉXITO UNICENTRO')).toBeInTheDocument();
        expect(screen.getByDisplayValue('178500')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Debe mostrar el botón de Confirmar y Guardar
    expect(screen.getByRole('button', { name: /Confirmar y Guardar/i })).toBeInTheDocument();
  });

  it('permite editar y guardar los datos escaneados redirigiendo a /expenses', async () => {
    renderWithProviders(<ScanPage />);

    const file = new File(['mock content'], 'factura-exito.pdf', {
      type: 'application/pdf',
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(
      () => {
        expect(screen.getByDisplayValue('ÉXITO UNICENTRO')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Guardar cambios
    const saveButton = screen.getByRole('button', { name: /Confirmar y Guardar/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/expenses');
    });
  });

  it('muestra un mensaje de error amigable cuando el servicio OCR falla y permite reintentar', async () => {
    // Sobrescribir temporalmente el endpoint de escaneo para devolver error 502
    server.use(
      http.post('*/api/v1/expenses/scan', () => {
        return HttpResponse.json(
          {
            success: false,
            error: {
              message:
                'No se pudo extraer la información del documento tras varios intentos con la IA',
            },
          },
          { status: 502 }
        );
      })
    );

    renderWithProviders(<ScanPage />);

    const file = new File(['mock content'], 'recibo_borroso.pdf', {
      type: 'application/pdf',
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Debe mostrar el error amigable en la UI
    await waitFor(() => {
      expect(
        screen.getByText(
          /El servicio de lectura inteligente está experimentando congestión temporal/i
        )
      ).toBeInTheDocument();
    });

    // Debe mostrar el botón de reintentar
    expect(screen.getByRole('button', { name: /Reintentar/i })).toBeInTheDocument();
  });
});
