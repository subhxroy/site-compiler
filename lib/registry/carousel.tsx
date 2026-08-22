import * as React from 'react';

export interface CarouselProps {
  items: React.ReactNode[];
  autoPlay?: boolean;
  interval?: number;
  className?: string;
}

export function Carousel({ items, autoPlay = true, interval = 3500, className = '' }: CarouselProps) {
  const [current, setCurrent] = React.useState(0);

  React.useEffect(() => {
    if (!autoPlay || items.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % items.length);
    }, interval);
    return () => clearInterval(timer);
  }, [autoPlay, interval, items.length]);

  const prev = () => setCurrent((prev) => (prev - 1 + items.length) % items.length);
  const next = () => setCurrent((prev) => (prev + 1) % items.length);

  if (items.length === 0) return null;

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-[#2a2c34] bg-[#111318] p-4 ${className}`}>
      {/* Slide Content */}
      <div className="relative min-h-[220px] flex items-center justify-center">
        {items.map((item, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-in-out ${
              idx === current ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
            }`}
          >
            {item}
          </div>
        ))}
      </div>

      {/* Nav Controls */}
      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={prev}
          className="rounded-lg border border-[#2a2c34] bg-[#17191f] p-2 text-[#8a8b8d] hover:text-white transition-colors cursor-pointer"
        >
          ←
        </button>

        {/* Dots */}
        <div className="flex space-x-1.5">
          {items.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                idx === current ? 'w-6 bg-[#ff6363]' : 'w-2 bg-[#2a2c34] hover:bg-[#8a8b8d]'
              }`}
            />
          ))}
        </div>

        <button
          onClick={next}
          className="rounded-lg border border-[#2a2c34] bg-[#17191f] p-2 text-[#8a8b8d] hover:text-white transition-colors cursor-pointer"
        >
          →
        </button>
      </div>
    </div>
  );
}
