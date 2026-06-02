const ITEMS = [
  'FREE DELIVERY OVER RS. 2,000',
  'COOKED FRESH TO ORDER',
  'SECURE ONLINE CHECKOUT',
  'CASH ON DELIVERY AVAILABLE',
  'RATED 4.9/5 BY CUSTOMERS',
  'STONE-BAKED PIZZAS',
  '139+ MENU ITEMS',
];

export function PromoMarquee() {
  const track = [...ITEMS, ...ITEMS];
  return (
    <div className="overflow-hidden bg-brand-red py-3 group">
      <div className="motion-keep flex w-max animate-marquee whitespace-nowrap group-hover:[animation-play-state:paused]">
        {track.map((item, i) => (
          <span key={i} className="flex items-center font-heading text-xs tracking-[0.25em] text-white">
            {item}
            <span className="mx-8 text-white/30">◆</span>
          </span>
        ))}
      </div>
    </div>
  );
}
