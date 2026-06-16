'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { formatPKR } from '@/lib/format';

type MenuItem = {
  id: string; sku: string; name: string; category: string;
  price: number; description: string | null; image_url: string | null;
  available: boolean; deal_price: number | null; deal_label: string | null;
};

const inputClass = 'w-full bg-[#1a1a1a] border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#E4002B]/50 transition-colors rounded-sm';
const labelClass = 'font-heading text-xs tracking-widest text-white/40 block mb-2';

export function MenuItemEditor({ item }: { item: MenuItem }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName]           = useState(item.name);
  const [price, setPrice]         = useState(String(item.price));
  const [description, setDesc]    = useState(item.description ?? '');
  const [imageUrl, setImageUrl]   = useState(item.image_url ?? '');
  const [isDeal, setIsDeal]       = useState(!!item.deal_price);
  const [dealPrice, setDealPrice] = useState(String(item.deal_price ?? ''));
  const [dealLabel, setDealLabel] = useState(item.deal_label ?? '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split('.').pop();
    const path = `${item.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('menu-images').upload(path, file, { upsert: true });
    if (error) { showToast('Image upload failed: ' + error.message, 'error'); setUploading(false); return; }
    const { data } = supabase.storage.from('menu-images').getPublicUrl(path);
    setImageUrl(data.publicUrl);
    setUploading(false);
    showToast('Image uploaded');
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/menu/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        price: parseInt(price) || item.price,
        description: description.trim() || null,
        image_url: imageUrl || null,
        deal_price: isDeal && dealPrice ? parseInt(dealPrice) : null,
        deal_label: isDeal && dealLabel.trim() ? dealLabel.trim() : null,
      }),
    });
    setSaving(false);
    if (res.ok) { showToast('Saved successfully'); router.refresh(); }
    else showToast('Save failed', 'error');
  }

  return (
    <div className="px-4 sm:px-8 py-8 max-w-2xl">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 font-heading text-xs tracking-widest px-4 py-2 rounded-sm shadow-lg ${
          toastType === 'success' ? 'bg-green-600 text-white' : 'bg-[#E4002B] text-white'
        }`}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/admin/menu')}
          className="font-heading text-xs tracking-widest text-white/30 hover:text-white transition-colors mb-4 block"
        >
          ← MENU
        </button>
        <p className="font-heading text-xs tracking-[0.4em] text-[#E4002B] mb-1">{item.category.toUpperCase()}</p>
        <h1 className="font-heading text-3xl text-white">{item.name}</h1>
        <p className="text-white/20 text-xs mt-1 font-heading tracking-wider">SKU: {item.sku}</p>
      </div>

      {/* Image */}
      <div className="mb-6">
        <p className={labelClass}>ITEM IMAGE</p>
        <div className="relative aspect-video bg-[#1a1a1a] border border-white/10 rounded-sm overflow-hidden mb-3">
          {imageUrl ? (
            <Image src={imageUrl} alt={name} fill className="object-cover" unoptimized />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/20 font-heading text-xs tracking-wider">
              NO IMAGE
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="font-heading text-xs tracking-widest px-4 py-2.5 border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-colors rounded-sm disabled:opacity-40"
        >
          {uploading ? 'UPLOADING…' : 'UPLOAD IMAGE'}
        </button>
        {imageUrl && (
          <button
            onClick={() => setImageUrl('')}
            className="ml-3 font-heading text-xs tracking-widest text-white/20 hover:text-red-400 transition-colors"
          >
            REMOVE
          </button>
        )}
      </div>

      {/* Name */}
      <div className="mb-4">
        <label className={labelClass}>ITEM NAME</label>
        <input value={name} onChange={e => setName(e.target.value)} className={inputClass} />
      </div>

      {/* Price */}
      <div className="mb-4">
        <label className={labelClass}>PRICE (PKR)</label>
        <input type="number" value={price} onChange={e => setPrice(e.target.value)} className={inputClass} min={0} />
      </div>

      {/* Description */}
      <div className="mb-6">
        <label className={labelClass}>DESCRIPTION</label>
        <textarea
          value={description}
          onChange={e => setDesc(e.target.value)}
          rows={3}
          placeholder="Optional description…"
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* Deal toggle */}
      <div className="mb-6 border border-white/5 rounded-sm bg-[#111111] px-5 py-4">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="font-heading text-sm text-white tracking-wider">MARK AS DEAL</p>
            <p className="text-white/30 text-xs mt-0.5">Show this item with a special deal price on the homepage.</p>
          </div>
          <button
            onClick={() => setIsDeal(!isDeal)}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${isDeal ? 'bg-[#E4002B]' : 'bg-white/10'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${isDeal ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
        {isDeal && (
          <div className="mt-4 space-y-3 pt-4 border-t border-white/5">
            <div>
              <label className={labelClass}>DEAL PRICE (PKR)</label>
              <input
                type="number"
                value={dealPrice}
                onChange={e => setDealPrice(e.target.value)}
                placeholder={`Less than ${formatPKR(parseInt(price) || item.price)}`}
                className={inputClass}
                min={0}
              />
            </div>
            <div>
              <label className={labelClass}>DEAL LABEL</label>
              <input
                value={dealLabel}
                onChange={e => setDealLabel(e.target.value)}
                placeholder="e.g. 30% OFF, DEAL OF THE DAY"
                className={inputClass}
              />
            </div>
          </div>
        )}
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-[#E4002B] text-white font-heading text-sm py-4 tracking-widest hover:bg-white hover:text-[#0d0d0d] transition-colors duration-200 disabled:opacity-50 rounded-sm"
      >
        {saving ? 'SAVING…' : 'SAVE CHANGES →'}
      </button>
    </div>
  );
}
