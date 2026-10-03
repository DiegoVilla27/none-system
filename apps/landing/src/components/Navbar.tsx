'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sparkles, MessageCircle, ExternalLink, Menu, X, ArrowRight } from 'lucide-react';
import { WHATSAPP_START_URL } from '@/lib/contact';

interface NavbarProps {
  onOpenCheckout?: (planId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenCheckout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const backofficeUrl = process.env.NEXT_PUBLIC_BACKOFFICE_URL || 'http://localhost:3000';
  const whatsappUrl = WHATSAPP_START_URL;

  const navLinks = [
    { label: 'Cómo Funciona', href: '#como-funciona' },
    { label: 'Demostración IA', href: '#demo' },
    { label: '¿Por qué pagar?', href: '#por-que-pagar' },
    { label: 'Calculadora ROI', href: '#calculadora-roi' },
    { label: 'Planes', href: '#planes' },
    { label: 'FAQ', href: '#faq' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-surface-border/80 bg-surface-base/80 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="group flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-surface-card border border-brand-500/30 shadow-glow transition-all duration-300 group-hover:scale-105 group-hover:border-brand-400">
            <Sparkles className="h-5 w-5 text-brand-400 transition-transform group-hover:rotate-12" />
            <div className="absolute inset-0 rounded-xl bg-brand-500/10 blur-sm group-hover:bg-brand-500/20" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
              none<span className="text-brand-400 font-black">.system</span>
              <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-brand-300 border border-brand-500/20 uppercase">
                IA Colombia
              </span>
            </span>
            <span className="text-[11px] text-slate-400 -mt-0.5">Control contable por WhatsApp</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-7">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-300 transition-colors hover:text-brand-400"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {/* Link to Backoffice */}
          <a
            href={backofficeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-surface-border px-3.5 py-2 text-xs font-semibold text-slate-300 transition-all hover:border-slate-600 hover:bg-surface-card hover:text-white"
          >
            <span>Ir al Backoffice</span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          </a>

          {/* WhatsApp Primary CTA */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-xs font-bold text-white shadow-glowGreen transition-all hover:from-emerald-400 hover:to-teal-400 hover:scale-[1.02] active:scale-95"
          >
            <MessageCircle className="h-4 w-4" />
            <span>Probar Gratis en WhatsApp</span>
          </a>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="rounded-lg p-2 text-slate-400 hover:bg-surface-card hover:text-white lg:hidden"
          aria-label="Abrir menú"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="border-b border-surface-border bg-surface-card/95 px-4 py-6 backdrop-blur-xl lg:hidden">
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-medium text-slate-200 hover:text-brand-400"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-4 flex flex-col gap-3 pt-4 border-t border-surface-border">
              <a
                href={backofficeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg border border-surface-border py-2.5 text-sm font-semibold text-slate-200 hover:bg-surface-elevated"
              >
                Acceder al Backoffice
                <ExternalLink className="h-4 w-4 text-slate-400" />
              </a>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2.5 text-sm font-bold text-white shadow-glowGreen"
              >
                <MessageCircle className="h-4 w-4" />
                Probar Gratis en WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
