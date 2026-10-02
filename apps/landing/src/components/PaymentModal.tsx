'use client';

import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  CreditCard,
  Building,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { PRICING_PLANS, SubscriptionPlanId, COLOMBIAN_BANKS } from '@/lib/plans';
import { formatCOP } from '@/lib/utils';

interface PaymentModalProps {
  planId: SubscriptionPlanId | null;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ planId, onClose }) => {
  const [paymentMethod, setPaymentMethod] = useState<'pse' | 'card' | 'nequi'>('pse');
  const [selectedBank, setSelectedBank] = useState<string>('Bancolombia');
  const [personType, setPersonType] = useState<'natural' | 'juridica'>('natural');

  // Customer form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('573001234567');
  const [docNumber, setDocNumber] = useState('');

  // Card fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  // State
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);

  if (!planId) return null;

  const plan = PRICING_PLANS.find((p) => p.id === planId) || PRICING_PLANS[1];

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const cleanPhone = phone.replace(/\D/g, '');
      if (!cleanPhone || cleanPhone.length < 10) {
        throw new Error('Por favor ingresa un número de teléfono de WhatsApp válido de 10 dígitos.');
      }

      // Call Backend Checkout API
      const res = await fetch('/api/v1/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: cleanPhone,
          plan: plan.id,
          paymentMethod,
          customerName: fullName || 'Cliente None System',
          customerEmail: email || 'cliente@none-system.com',
          customerDocNumber: docNumber || '1020304050',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error procesando el pago en la pasarela.');
      }

      setSuccessData(data.data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión con la pasarela de pagos.');
    } finally {
      setLoading(false);
    }
  };

  const backofficeUrl = process.env.NEXT_PUBLIC_BACKOFFICE_URL || 'http://localhost:3000';
  const whatsappUrl = `https://wa.me/573009999999?text=Hola%2C%20acabo%20de%20activar%20mi%20${encodeURIComponent(plan.name)}%20para%20el%20n%C3%BAmero%20${phone}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-surface-border bg-surface-card p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 rounded-full p-2 text-slate-400 hover:bg-surface-elevated hover:text-white transition-colors"
          aria-label="Cerrar modal de pago"
        >
          <X className="h-5 w-5" />
        </button>

        {!successData ? (
          <div>
            {/* Modal Header */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-400 mb-1">
                <Lock className="h-3.5 w-3.5" /> Pasarela de Pagos Segura (Colombia)
              </div>
              <h3 className="text-2xl font-black text-white">Finalizar Suscripción</h3>
              <p className="text-xs text-slate-400 mt-1">
                Estás adquiriendo el <strong className="text-white">{plan.name}</strong> por{' '}
                <strong className="text-emerald-400">{formatCOP(plan.priceCOP)} COP / mes</strong>.
              </p>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Payment Method Selector */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              <button
                type="button"
                onClick={() => setPaymentMethod('pse')}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition-all ${
                  paymentMethod === 'pse'
                    ? 'border-brand-400 bg-brand-500/15 text-white shadow-glow'
                    : 'border-surface-border bg-surface-base/80 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Building className="h-5 w-5 text-brand-400" />
                <span>PSE</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition-all ${
                  paymentMethod === 'card'
                    ? 'border-brand-400 bg-brand-500/15 text-white shadow-glow'
                    : 'border-surface-border bg-surface-base/80 text-slate-400 hover:border-slate-700'
                }`}
              >
                <CreditCard className="h-5 w-5 text-brand-400" />
                <span>Tarjeta</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('nequi')}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition-all ${
                  paymentMethod === 'nequi'
                    ? 'border-brand-400 bg-brand-500/15 text-white shadow-glow'
                    : 'border-surface-border bg-surface-base/80 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Smartphone className="h-5 w-5 text-brand-400" />
                <span>Nequi Push</span>
              </button>
            </div>

            {/* Payment Form */}
            <form onSubmit={handleSubmitPayment} className="space-y-4">
              {/* WhatsApp Phone (Crucial) */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Número de WhatsApp para el Bot <span className="text-brand-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">+57</span>
                  <input
                    type="tel"
                    required
                    placeholder="300 123 4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-surface-border bg-surface-base pl-12 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Este es el número que tendrá habilitado el cupo de {plan.monthlyLimit} comprobantes.
                </p>
              </div>

              {/* Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Diego Villa"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-surface-border bg-surface-base px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    required
                    placeholder="diego@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-surface-border bg-surface-base px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* PSE Specific Fields */}
              {paymentMethod === 'pse' && (
                <div className="space-y-3 pt-2 border-t border-surface-border">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Banco Colombiano</label>
                    <select
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                      className="w-full rounded-xl border border-surface-border bg-surface-base px-3 py-2 text-xs text-white focus:border-brand-400 focus:outline-none"
                    >
                      {COLOMBIAN_BANKS.map((b) => (
                        <option key={b} value={b} className="bg-slate-900 text-white">
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Tipo de Persona</label>
                      <select
                        value={personType}
                        onChange={(e) => setPersonType(e.target.value as any)}
                        className="w-full rounded-xl border border-surface-border bg-surface-base px-3 py-2 text-xs text-white focus:border-brand-400 focus:outline-none"
                      >
                        <option value="natural" className="bg-slate-900">Persona Natural</option>
                        <option value="juridica" className="bg-slate-900">Persona Jurídica (NIT)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Cédula o NIT</label>
                      <input
                        type="text"
                        required
                        placeholder="1020304050"
                        value={docNumber}
                        onChange={(e) => setDocNumber(e.target.value)}
                        className="w-full rounded-xl border border-surface-border bg-surface-base px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Credit Card Specific Fields */}
              {paymentMethod === 'card' && (
                <div className="space-y-3 pt-2 border-t border-surface-border">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Número de Tarjeta</label>
                    <input
                      type="text"
                      required
                      placeholder="4500 •••• •••• 1234"
                      maxLength={19}
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full rounded-xl border border-surface-border bg-surface-base px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Expiración (MM/AA)</label>
                      <input
                        type="text"
                        placeholder="12/28"
                        maxLength={5}
                        value={cardExp}
                        onChange={(e) => setCardExp(e.target.value)}
                        className="w-full rounded-xl border border-surface-border bg-surface-base px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">CVC / CVV</label>
                      <input
                        type="password"
                        placeholder="123"
                        maxLength={4}
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value)}
                        className="w-full rounded-xl border border-surface-border bg-surface-base px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Nequi Specific Fields */}
              {paymentMethod === 'nequi' && (
                <div className="rounded-xl border border-surface-border bg-surface-base p-4 text-xs text-slate-300 leading-relaxed">
                  📲 Al presionar confirmar, te enviaremos una notificación push a tu App Nequi para autorizar el débito inmediato de <strong className="text-white">{formatCOP(plan.priceCOP)} COP</strong>.
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3.5 text-sm font-bold text-white shadow-glowGreen transition-all hover:from-emerald-400 hover:to-teal-400 active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Conectando con la pasarela...</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    <span>Pagar {formatCOP(plan.priceCOP)} COP y Activar Cupo</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 mt-2">
                <ShieldCheck className="h-3.5 w-3.5 text-brand-400" />
                <span>Transacción encriptada con cifrado SSL de 256 bits.</span>
              </div>
            </form>
          </div>
        ) : (
          /* Payment Approved Celebration Screen */
          <div className="text-center py-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-glowGreen mb-4 animate-bounce">
              <CheckCircle2 className="h-9 w-9" />
            </div>

            <h3 className="text-2xl font-black text-white">¡Pago Aprobado con Éxito!</h3>
            <p className="text-xs text-slate-300 mt-2 max-w-sm mx-auto">
              Tu <strong className="text-white">{plan.name}</strong> ha sido activado y vinculado a tu número de WhatsApp.
            </p>

            {/* Receipt Summary Card */}
            <div className="my-6 rounded-2xl border border-surface-border bg-surface-base p-4 text-left font-mono text-xs space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>Referencia:</span>
                <span className="text-white font-bold">{successData.transaction?.reference}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Número WhatsApp:</span>
                <span className="text-white">+{successData.transaction?.customer?.phone}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Cupo Activado:</span>
                <span className="text-emerald-400 font-bold">{plan.monthlyLimit} facturas / mes</span>
              </div>
              <div className="flex justify-between text-slate-400 pt-2 border-t border-slate-800">
                <span>Total Cobrado:</span>
                <span className="text-brand-300 font-extrabold text-sm">
                  {formatCOP(successData.transaction?.amountCOP || plan.priceCOP)} COP
                </span>
              </div>
            </div>

            {/* Next Steps Buttons */}
            <div className="flex flex-col gap-3">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3.5 text-sm font-bold text-white shadow-glowGreen transition-all hover:scale-[1.02]"
              >
                <span>Abrir WhatsApp y Enviar mi Primera Factura</span>
                <ArrowRight className="h-4 w-4" />
              </a>

              <a
                href={backofficeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border border-surface-border bg-surface-elevated py-3 text-xs font-semibold text-slate-300 hover:text-white hover:border-brand-500 transition-colors"
              >
                <span>Ir al Backoffice para Ver mis Gastos</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
