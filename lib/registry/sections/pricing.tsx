import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../card';
import { Button } from '../button';
import { Badge } from '../badge';

export interface PricingTier {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  isPopular?: boolean;
  ctaText: string;
  onSelect?: () => void;
}

export function PricingSection({ tiers }: { tiers: PricingTier[] }) {
  return (
    <section className="py-20 bg-[#0d0e12] px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-12 text-center">
        <div className="space-y-4">
          <Badge variant="secondary">Simple & Transparent</Badge>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Honest Developer Pricing</h2>
          <p className="text-[#8a8b8d] max-w-xl mx-auto text-sm">
            Pay only for what you compile. No monthly subscriptions or hidden vendor locks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {tiers.map((tier, idx) => (
            <Card
              key={idx}
              className={`relative flex flex-col justify-between ${
                tier.isPopular ? 'border-[#ff6363] shadow-lg shadow-[#ff6363]/10 ring-1 ring-[#ff6363]' : ''
              }`}
            >
              {tier.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="default" className="shadow-md">
                    Most Popular
                  </Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle>{tier.name}</CardTitle>
                <CardDescription>{tier.description}</CardDescription>
                <div className="pt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white">{tier.price}</span>
                  {tier.period && <span className="text-xs text-[#8a8b8d]">{tier.period}</span>}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs font-semibold text-[#8a8b8d] uppercase tracking-wider">What's included</p>
                <ul className="space-y-2 text-xs text-[#e1e2e5]">
                  {tier.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-center gap-2">
                      <span className="text-emerald-400">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={tier.isPopular ? 'glow' : 'outline'}
                  onClick={tier.onSelect}
                >
                  {tier.ctaText}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
