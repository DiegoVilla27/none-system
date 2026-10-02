import '@testing-library/jest-dom/vitest';
import { beforeAll, afterEach, afterAll, vi } from 'vitest';
import { server } from './mocks/server';
import { resetMockDatabase } from './mocks/handlers';

// Iniciar servidor MSW antes de todas las pruebas
beforeAll(() => {
  server.listen();
});

// Limpiar handlers y BD simulada tras cada prueba
afterEach(() => {
  server.resetHandlers();
  resetMockDatabase();
  vi.clearAllMocks();
});

// Cerrar servidor MSW al finalizar suite
afterAll(() => {
  server.close();
});

// Mock de APIs del navegador en JSDOM
if (typeof window !== 'undefined') {
  window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  window.URL.revokeObjectURL = vi.fn();
  window.alert = vi.fn();
  window.confirm = vi.fn(() => true);

  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
  });
}

// Mock de Next.js Navigation
export const mockPush = vi.fn();
export const mockBack = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => ({ id: 'exp-test-01' }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));
