import * as React from 'react';
import { Card, CardContent } from '../card';

export interface TestimonialItem {
  quote: string;
  author: string;
  role: string;
  company?: string;
  avatarUrl?: string;
}

export function TestimonialsSection({ testimonials }: { testimonials: TestimonialItem[] }) {
  return (
    <section className="py-20 bg-[#0d0e12] px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Loved by Front-End Engineers</h2>
          <p className="text-[#8a8b8d] text-sm">See how developers use SiteCompiler to scaffold projects in seconds.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, idx) => (
            <Card key={idx} className="bg-[#111318] border-[#2a2c34]">
              <CardContent className="p-6 space-y-4">
                <p className="text-xs text-[#e1e2e5] italic leading-relaxed">"{t.quote}"</p>
                <div className="flex items-center gap-3 pt-2">
                  <div className="h-9 w-9 rounded-full bg-[#17191f] border border-[#2a2c34] flex items-center justify-center font-bold text-xs text-[#ff6363]">
                    {t.author.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">{t.author}</h4>
                    <p className="text-[11px] text-[#8a8b8d]">
                      {t.role} {t.company && `at ${t.company}`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
