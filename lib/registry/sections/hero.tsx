import * as React from 'react';
import { Button } from '../button';
import { Badge } from '../badge';

export interface HeroSectionProps {
  badgeText?: string;
  title?: string;
  highlightedText?: string;
  subtitle?: string;
  primaryActionText?: string;
  onPrimaryAction?: () => void;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
}

export function HeroSection({
  badgeText = '⚡ Next-Gen Website Compiler',
  title = 'Turn Any Web Page into',
  highlightedText = 'Production React Code',
  subtitle = 'Zero lock-in. Compile any public website into clean, modular, and maintainable Next.js, Astro, Svelte, or Vue projects.',
  primaryActionText = 'Start Free Export',
  onPrimaryAction,
  secondaryActionText = 'Explore Documentation',
  onSecondaryAction,
}: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32 bg-[#0d0e12] text-center px-4 sm:px-6 lg:px-8">
      {/* Glow Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-[#ff6363]/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative mx-auto max-w-4xl space-y-6">
        {badgeText && (
          <div className="inline-flex justify-center">
            <Badge variant="secondary" className="px-3.5 py-1 text-xs border border-[#2a2c34]">
              {badgeText}
            </Badge>
          </div>
        )}

        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl sm:leading-[1.15]">
          {title}{' '}
          <span className="bg-gradient-to-r from-[#ff6363] via-[#ff8f8f] to-amber-300 bg-clip-text text-transparent">
            {highlightedText}
          </span>
        </h1>

        <p className="mx-auto max-w-2xl text-base sm:text-lg text-[#8a8b8d] leading-relaxed">{subtitle}</p>

        <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
          <Button size="lg" variant="glow" onClick={onPrimaryAction}>
            {primaryActionText}
          </Button>
          {secondaryActionText && (
            <Button size="lg" variant="outline" onClick={onSecondaryAction}>
              {secondaryActionText}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
