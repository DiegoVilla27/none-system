'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { InteractiveScanner } from '@/components/InteractiveScanner';
import { BeforeAfter } from '@/components/BeforeAfter';
import { HowItWorks } from '@/components/HowItWorks';
import { RoiCalculator } from '@/components/RoiCalculator';
import { Pricing } from '@/components/Pricing';
import { PaymentModal } from '@/components/PaymentModal';
import { SecurityCompliance } from '@/components/SecurityCompliance';
import { Faq } from '@/components/Faq';
import { Footer } from '@/components/Footer';
import { SubscriptionPlanId } from '@/lib/plans';

export default function LandingPage() {
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<SubscriptionPlanId | null>(null);

  const handleScrollToDemo = () => {
    const el = document.getElementById('demo');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleScrollToPlans = () => {
    const el = document.getElementById('planes');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectPlan = (planId: SubscriptionPlanId) => {
    if (planId === 'gratuito') {
      window.open(
        'https://wa.me/573009999999?text=Hola%2C%20quiero%20empezar%20mi%20prueba%20gratuita%20de%2010%20comprobantes%20con%20None%20System',
        '_blank'
      );
      return;
    }
    setSelectedPlanForCheckout(planId);
  };

  return (
    <div className="min-h-screen bg-surface-base text-slate-100 flex flex-col selection:bg-brand-500/30 selection:text-brand-200">
      {/* Navigation */}
      <Navbar onOpenCheckout={(id) => handleSelectPlan(id as SubscriptionPlanId)} />

      {/* Main Content Sections */}
      <main className="flex-1">
        <Hero onScrollToDemo={handleScrollToDemo} onScrollToPlans={handleScrollToPlans} />
        <InteractiveScanner />
        <BeforeAfter />
        <HowItWorks />
        <RoiCalculator onSelectPlan={handleSelectPlan} />
        <Pricing onSelectPlan={handleSelectPlan} />
        <SecurityCompliance />
        <Faq />
      </main>

      {/* Footer */}
      <Footer />

      {/* Interactive Payment Checkout Modal */}
      {selectedPlanForCheckout && (
        <PaymentModal
          planId={selectedPlanForCheckout}
          onClose={() => setSelectedPlanForCheckout(null)}
        />
      )}
    </div>
  );
}
