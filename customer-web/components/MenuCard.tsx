'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { MenuCard as MenuCardType } from '@/lib/types';
import { formatPKR } from '@/lib/format';
import { imageForItem } from '@/lib/itemImages';
import { AddToCartButton } from './AddToCartButton';

function cardImage(card: MenuCardType): string {
  const dbUrl = 'item' in card ? card.item.image_url : card.base.image_url;
  return imageForItem(card.name, card.category, dbUrl);
}

function isCardAvailable(card: MenuCardType): boolean {
  if (card.kind === 'plain') return card.item.available;
  if (card.kind === 'pizza') return card.sizes.some(s => s.available);
  if (card.kind === 'burger') return card.variants.some(v => v.available);
  return true;
}

export function MenuCard({
  card,
  animateIn = true,
}: {
  card: MenuCardType;
  index?: number;
  animateIn?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const desc = 'item' in card ? card.item.description : card.base.description;
  const img = cardImage(card);
  const available = isCardAvailable(card);

  return (
    <>
      <div
        className={`group flex h-full flex-col bg-surface border border-theme hover:border-brand-red/40 hover:shadow-lg transition-all duration-300 rounded-sm overflow-hidden ${
          animateIn ? 'animate-fade-up stagger' : ''
        } ${!available ? 'opacity-60' : ''}`}
      >
        {/* Image */}
        <button
          onClick={() => setOpen(true)}
          className="relative aspect-[16/10] overflow-hidden bg-card flex-shrink-0"
          aria-label={`Quick view ${card.name}`}
        >
          <Image
            src={img}
            alt={card.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {!available && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="font-heading text-xs tracking-[0.3em] text-white bg-black/70 px-4 py-2 border border-white/20">
                SOLD OUT
              </span>
            </div>
          )}
          {/* Hover overlay — only when available */}
          {available && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center">
              <span className="font-heading text-xs tracking-[0.3em] text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-brand-red px-4 py-2">
                QUICK VIEW
              </span>
            </div>
          )}
        </button>

        {/* Content */}
        <div className="flex flex-1 flex-col p-4">
          <span className="font-heading text-xs tracking-[0.2em] text-brand-red">
            {card.category}
          </span>
          <h3 className="mt-1 font-heading text-lg text-primary leading-tight">{card.name}</h3>
          {desc && (
            <p className="mt-1.5 text-xs text-muted line-clamp-2 leading-relaxed">{desc}</p>
          )}

          <div className="mt-auto pt-4 border-t border-theme">
            {card.kind === 'plain'  && <PlainBody  card={card} />}
            {card.kind === 'pizza'  && <PizzaBody  card={card} />}
            {card.kind === 'burger' && <BurgerBody card={card} />}
          </div>
        </div>
      </div>

      {open && <QuickViewModal card={card} onClose={() => setOpen(false)} />}
    </>
  );
}

function QuickViewModal({ card, onClose }: { card: MenuCardType; onClose: () => void }) {
  const desc = 'item' in card ? card.item.description : card.base.description;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface animate-scale-in overflow-hidden rounded-sm shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 w-9 h-9 flex items-center justify-center bg-card text-muted hover:text-primary hover:bg-brand-red hover:text-white transition-colors duration-200 rounded-sm"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        <div className="relative h-60 overflow-hidden">
          <Image
            src={cardImage(card)}
            alt={card.name}
            fill
            sizes="512px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <span className="font-heading text-xs tracking-[0.3em] text-brand-red">{card.category}</span>
            <h3 className="font-heading text-3xl text-white mt-1">{card.name}</h3>
          </div>
        </div>

        <div className="p-6">
          {desc && <p className="text-sm text-muted leading-relaxed mb-5">{desc}</p>}
          {card.kind === 'plain'  && <PlainBody  card={card} large />}
          {card.kind === 'pizza'  && <PizzaBody  card={card} large />}
          {card.kind === 'burger' && <BurgerBody card={card} large />}
        </div>
      </div>
    </div>
  );
}

function PlainBody({ card, large }: { card: Extract<MenuCardType, { kind: 'plain' }>; large?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`font-heading text-primary ${large ? 'text-3xl' : 'text-2xl'}`}>
        {formatPKR(card.item.price)}
      </span>
      <AddToCartButton
        disabled={!card.item.available}
        line={{ key: card.item.sku, menu_item_id: card.item.id, name: card.item.name, price: card.item.price }}
      />
    </div>
  );
}

function PizzaBody({ card, large }: { card: Extract<MenuCardType, { kind: 'pizza' }>; large?: boolean }) {
  const [idx, setIdx] = useState(0);
  const sel = card.sizes[idx];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {card.sizes.map((s, i) => (
          <button
            key={s.sku}
            onClick={() => setIdx(i)}
            className={`font-heading text-xs px-3 py-1.5 tracking-wider border rounded-sm transition-all duration-150 ${
              i === idx
                ? 'bg-brand-red text-white border-brand-red'
                : 'bg-surface text-muted border-theme hover:border-primary hover:text-primary'
            }`}
          >
            {s.size}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className={`font-heading text-primary ${large ? 'text-3xl' : 'text-2xl'}`}>
          {formatPKR(sel.price)}
        </span>
        <AddToCartButton
          disabled={!sel.available}
          line={{ key: sel.sku, menu_item_id: card.base.id, name: `${card.name} (${sel.label})`, price: sel.price }}
        />
      </div>
    </div>
  );
}

function BurgerBody({ card, large }: { card: Extract<MenuCardType, { kind: 'burger' }>; large?: boolean }) {
  const [idx, setIdx] = useState(0);
  const sel = card.variants[idx];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {card.variants.map((v, i) => (
          <button
            key={v.sku}
            onClick={() => setIdx(i)}
            className={`font-heading text-xs px-3 py-1.5 tracking-wider border rounded-sm transition-all duration-150 ${
              i === idx
                ? 'bg-brand-red text-white border-brand-red'
                : 'bg-surface text-muted border-theme hover:border-primary hover:text-primary'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className={`font-heading text-primary ${large ? 'text-3xl' : 'text-2xl'}`}>
          {formatPKR(sel.price)}
        </span>
        <AddToCartButton
          disabled={!sel.available}
          line={{ key: sel.sku, menu_item_id: card.base.id, name: `${card.name} (${sel.label})`, price: sel.price }}
        />
      </div>
    </div>
  );
}
