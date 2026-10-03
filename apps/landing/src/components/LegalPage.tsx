import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Footer } from '@/components/Footer';
import { POLICY_EFFECTIVE_DATE, POLICY_VERSION } from '@/lib/legal';

interface LegalPageProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

/** Plantilla de lectura para documentos legales. */
export const LegalPage: React.FC<LegalPageProps> = ({ title, subtitle, children }) => (
  <div className="min-h-screen bg-surface-base text-slate-100 flex flex-col">
    <header className="border-b border-surface-border bg-surface-card/60">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-sm font-bold text-white">
          <Sparkles className="h-4 w-4 text-brand-400" />
          none<span className="text-brand-400">.system</span>
        </Link>
        <Link href="/" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" /> Volver al inicio
        </Link>
      </div>
    </header>

    <main className="flex-1">
      <article className="mx-auto max-w-3xl px-4 sm:px-6 py-12 text-sm leading-relaxed text-slate-300 [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-white [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:font-semibold [&_h3]:text-slate-100 [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-1.5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-brand-300 [&_a]:underline [&_strong]:text-white">
        <h1 className="text-3xl font-black text-white">{title}</h1>
        <p className="mt-2 text-xs text-slate-500">
          {subtitle} · Versión {POLICY_VERSION} · Vigente desde el {POLICY_EFFECTIVE_DATE}
        </p>
        {children}
      </article>
    </main>

    <Footer />
  </div>
);
