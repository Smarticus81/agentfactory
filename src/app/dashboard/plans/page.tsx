"use client";

import DashboardLayout from '@/components/dashboard-layout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Zap, Shield, Star, Mic } from 'lucide-react';
import { useState } from 'react';

const plans = [
  {
    id: 'lite',
    name: 'Lite',
    price: 0,
    billing: 'Free forever',
    description: 'Get started with basic voice assistant features',
    voicePipeline: 'Basic STT ↔ LLM ↔ TTS (turn-based)',
    features: [
      '60 voice minutes/month',
      'Turn-based voice (no barge-in)',
      'No wake-word',
      '300 email summaries/month',
      '30 email sends/month',
      '1 routine/day',
      'Basic calendar integration',
      'Community support'
    ],
    limitations: [
      'No streaming voice',
      'No wake words',
      'Limited voice minutes'
    ],
    buttonText: 'Current Plan',
    disabled: true,
    icon: Mic
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 19,
    billing: '/month',
    description: 'Advanced features with streaming voice and barge-in',
    voicePipeline: 'Streaming STT with interruptible TTS',
    features: [
      '300 voice minutes/month',
      'Streaming voice with barge-in',
      'Automatic turn detection',
      '2,000 email summaries/month',
      '200 email sends/month',
      '3 routines/day',
      'Full calendar orchestration',
      'Priority support',
      'Gmail & Outlook integration'
    ],
    popular: true,
    buttonText: 'Upgrade to Pro',
    icon: Zap
  },
  {
    id: 'pro_plus',
    name: 'Pro+',
    price: 39,
    billing: '/month',
    description: 'Wake words and enhanced voice capabilities',
    voicePipeline: 'Pro features + Wake-word detection',
    features: [
      'Everything in Pro',
      'Custom wake words ("Hey Assistant")',
      'On-device wake detection',
      '500 voice minutes/month',
      '5 routines/day',
      'Advanced RAG over documents',
      'Family member profiles',
      'Multi-calendar sync'
    ],
    buttonText: 'Upgrade to Pro+',
    icon: Star
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 99,
    billing: '/month',
    description: 'Enterprise-grade with Realtime API and premium TTS',
    voicePipeline: 'OpenAI Realtime + Expressive TTS',
    features: [
      '2,000 voice minutes/month',
      'OpenAI Realtime multimodal',
      'Expressive/low-latency TTS',
      'Voice cloning (with consent)',
      'Unlimited email operations',
      '10 routines/day',
      'White-label options',
      'API access',
      'Dedicated support',
      'Custom integrations'
    ],
    enterprise: true,
    buttonText: 'Contact Sales',
    icon: Shield
  }
];

const usageMeters = [
  { name: 'Voice Minutes', unit: 'minutes', icon: Mic },
  { name: 'Email Sends', unit: 'emails', icon: Zap },
  { name: 'RAG Queries', unit: 'queries', icon: Star },
  { name: 'Calendar Events', unit: 'events', icon: Shield }
];

export default function PlansPage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const currentPlan = 'lite'; // TODO: Get from user profile

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-h1 font-bold text-text-primary dark:text-text-primary-dark mb-2">
            Plans & Pricing
          </h1>
          <p className="text-body text-text-secondary dark:text-text-secondary-dark">
            Choose the plan that fits your family's needs. Upgrade or downgrade anytime.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center">
          <div className="bg-panel rounded-pill p-1 flex items-center gap-1">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2 rounded-pill text-body font-medium transition-all ${
                billingPeriod === 'monthly' 
                  ? 'bg-accent text-white' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-6 py-2 rounded-pill text-body font-medium transition-all ${
                billingPeriod === 'yearly' 
                  ? 'bg-accent text-white' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Yearly (Save 20%)
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const isCurrentPlan = plan.id === currentPlan;
            const yearlyPrice = plan.price * 12 * 0.8; // 20% discount
            const displayPrice = billingPeriod === 'yearly' && plan.price > 0 
              ? Math.round(yearlyPrice / 12) 
              : plan.price;
            
            return (
              <div
                key={plan.id}
                className={`relative ${plan.popular ? 'scale-105' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <span className="badge badge-accent">Most Popular</span>
                  </div>
                )}
                
                <Card className={`h-full ${plan.popular ? 'ring-2 ring-accent' : ''} ${plan.enterprise ? 'bg-gradient-to-br from-panel to-accent-light' : ''}`}>
                  <div className="p-6 space-y-6">
                    {/* Plan Header */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-h3 font-semibold text-text-primary dark:text-text-primary-dark">
                          {plan.name}
                        </h3>
                        <plan.icon className="w-5 h-5 text-accent" />
                      </div>
                      <div className="flex items-baseline gap-1 mb-2">
                        <span className="text-h1 font-bold text-text-primary dark:text-text-primary-dark">
                          ${displayPrice}
                        </span>
                        <span className="text-body text-text-secondary dark:text-text-secondary-dark">
                          {plan.billing}
                        </span>
                      </div>
                      {billingPeriod === 'yearly' && plan.price > 0 && (
                        <p className="text-small text-accent">
                          Save ${Math.round(plan.price * 12 * 0.2)}/year
                        </p>
                      )}
                      <p className="text-small text-text-secondary dark:text-text-secondary-dark mt-2">
                        {plan.description}
                      </p>
                    </div>

                    {/* Voice Pipeline */}
                    <div className="p-3 bg-accent-light rounded-lg">
                      <p className="text-small font-medium text-accent">Voice Pipeline:</p>
                      <p className="text-small text-text-secondary mt-1">{plan.voicePipeline}</p>
                    </div>

                    {/* Features */}
                    <ul className="space-y-3">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                          <span className="text-small text-text-secondary dark:text-text-secondary-dark">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* Limitations (for free plan) */}
                    {plan.limitations && (
                      <div className="pt-4 border-t border-hairline">
                        <p className="text-small font-medium text-text-secondary mb-2">Limitations:</p>
                        <ul className="space-y-2">
                          {plan.limitations.map((limitation, idx) => (
                            <li key={idx} className="text-small text-text-secondary opacity-60">
                              • {limitation}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* CTA Button */}
                    <Button
                      className={`w-full ${isCurrentPlan ? 'btn-ghost' : plan.enterprise ? 'btn-primary' : 'btn-primary'}`}
                      disabled={plan.disabled}
                    >
                      {isCurrentPlan ? 'Current Plan' : plan.buttonText}
                    </Button>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Usage Meters Section */}
        <div className="mt-12">
          <h2 className="text-h2 font-semibold text-text-primary dark:text-text-primary-dark mb-6">
            Usage-Based Billing
          </h2>
          <p className="text-body text-text-secondary dark:text-text-secondary-dark mb-6">
            All usage is tracked and billed through Stripe Meters. You only pay for what you use.
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {usageMeters.map((meter) => (
              <Card key={meter.name} className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent-light rounded-lg flex items-center justify-center">
                    <meter.icon className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-medium text-text-primary dark:text-text-primary-dark">
                      {meter.name}
                    </h4>
                    <p className="text-small text-text-secondary dark:text-text-secondary-dark">
                      per {meter.unit}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Enterprise CTA */}
        <div className="card-featured mt-12">
          <div className="card-featured-inner text-center">
            <h3 className="text-h2 font-semibold text-text-primary dark:text-text-primary-dark mb-2">
              Need a custom solution?
            </h3>
            <p className="text-body text-text-secondary dark:text-text-secondary-dark mb-6">
              Get enterprise features, dedicated support, and custom integrations.
            </p>
            <Button className="btn-primary">
              Contact Sales
            </Button>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-12">
          <h2 className="text-h2 font-semibold text-text-primary dark:text-text-primary-dark mb-6">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            <Card className="p-6">
              <h4 className="font-medium text-text-primary dark:text-text-primary-dark mb-2">
                What's the difference between voice pipelines?
              </h4>
              <p className="text-body text-text-secondary dark:text-text-secondary-dark">
                Lite uses turn-based voice (you speak, then the assistant responds). Pro adds streaming with barge-in (you can interrupt). Pro+ adds wake-word detection. Premium uses OpenAI's Realtime API for the lowest latency.
              </p>
            </Card>
            <Card className="p-6">
              <h4 className="font-medium text-text-primary dark:text-text-primary-dark mb-2">
                Can I change plans anytime?
              </h4>
              <p className="text-body text-text-secondary dark:text-text-secondary-dark">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and billing is prorated.
              </p>
            </Card>
            <Card className="p-6">
              <h4 className="font-medium text-text-primary dark:text-text-primary-dark mb-2">
                How does usage-based billing work?
              </h4>
              <p className="text-body text-text-secondary dark:text-text-secondary-dark">
                We track your usage (voice minutes, emails, etc.) and bill through Stripe Meters. Each plan includes generous allowances, and you're only charged for overages.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}