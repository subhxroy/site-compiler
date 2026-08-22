import * as React from 'react';
import { Accordion, AccordionItem } from '../accordion';

export interface FaqItem {
  question: string;
  answer: string;
}

export function FaqSection({ items }: { items: FaqItem[] }) {
  return (
    <section className="py-20 bg-[#0d0e12] px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Frequently Asked Questions</h2>
          <p className="text-[#8a8b8d] text-sm">Everything you need to know about compilation, licenses, and AST engines.</p>
        </div>

        <Accordion>
          {items.map((item, idx) => (
            <AccordionItem key={idx} title={item.question}>
              {item.answer}
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
