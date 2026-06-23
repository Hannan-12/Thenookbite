'use client';

import { useState } from 'react';
import { ApplyForm } from './ApplyForm';

const POSITIONS = [
  {
    title: 'Cashier',
    type: 'Full-time',
    desc: 'Handle orders on the POS terminal, assist customers, keep the counter running smoothly.',
    icon: '◈',
  },
  {
    title: 'Chef',
    type: 'Full-time',
    desc: 'Prepare TNB signature dishes — burgers, pizzas, pastas and wraps — to consistent quality standards.',
    icon: '◉',
  },
  {
    title: 'Kitchen Helper',
    type: 'Full-time / Part-time',
    desc: 'Support the kitchen team with prep, cleaning, and keeping the kitchen stocked and organised.',
    icon: '◫',
  },
  {
    title: 'Food Packer',
    type: 'Full-time / Part-time',
    desc: 'Pack takeaway and delivery orders accurately and quickly, ensuring every order leaves in perfect condition.',
    icon: '◻',
  },
  {
    title: 'Delivery Rider',
    type: 'Part-time',
    desc: 'Deliver orders on time across Mandi Bahauddin. Own bike required. Fuel allowance provided.',
    icon: '◷',
  },
  {
    title: 'Manager',
    type: 'Full-time',
    desc: 'Oversee daily operations, manage staff, ensure quality and customer satisfaction across shifts.',
    icon: '▦',
  },
  {
    title: 'Cleaner',
    type: 'Full-time',
    desc: 'Maintain cleanliness of the restaurant — dining area, kitchen, and washrooms throughout the day.',
    icon: '◎',
  },
];

const PERKS = [
  { label: 'Free Meals on Shift', icon: '🍔' },
  { label: 'Flexible Hours', icon: '⏰' },
  { label: 'Growth Opportunities', icon: '📈' },
  { label: 'Friendly Team', icon: '🤝' },
];

export default function CareersPage() {
  const [selectedPosition, setSelectedPosition] = useState('');

  function selectAndScroll(title: string) {
    setSelectedPosition(title);
    document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div className="bg-[#0a0a0a] min-h-screen">

      {/* Hero */}
      <section className="relative border-b border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-[#E4002B]/5 pointer-events-none" />
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-20 sm:py-28 relative z-10">
          <p className="font-heading text-xs tracking-[0.4em] text-[#E4002B] mb-3">WE&apos;RE HIRING</p>
          <h1 className="font-heading text-5xl sm:text-7xl text-white leading-none mb-6">
            JOIN THE<br />
            <span className="text-[#E4002B]">TNB</span> TEAM
          </h1>
          <p className="font-body text-white/50 text-lg max-w-xl leading-relaxed mb-8">
            Fast-paced, fun, and growing. We&apos;re looking for passionate people to join the team at The Nook Bite, Mandi Bahauddin.
          </p>
          <a
            href="#apply"
            className="inline-block bg-[#E4002B] text-white font-heading text-sm tracking-widest px-8 py-4 rounded-sm hover:bg-[#c00025] transition-colors"
          >
            APPLY NOW →
          </a>
        </div>
      </section>

      {/* Perks */}
      <section className="border-b border-white/5">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PERKS.map(p => (
              <div key={p.label} className="border border-white/5 bg-white/3 rounded-sm px-4 py-5 text-center">
                <div className="text-2xl mb-2">{p.icon}</div>
                <p className="font-heading text-xs tracking-widest text-white/60">{p.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="border-b border-white/5">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-16">
          <p className="font-heading text-xs tracking-[0.4em] text-[#E4002B] mb-2">OPPORTUNITIES</p>
          <h2 className="font-heading text-3xl text-white mb-10">OPEN POSITIONS</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {POSITIONS.map(pos => (
              <div
                key={pos.title}
                className="border border-white/5 bg-[#111] rounded-sm p-6 flex flex-col hover:border-[#E4002B]/30 transition-colors group"
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="text-[#E4002B] text-xl">{pos.icon}</span>
                  <span className="font-heading text-[10px] tracking-widest text-white/30 border border-white/10 px-2 py-1 rounded-sm">
                    {pos.type}
                  </span>
                </div>
                <h3 className="font-heading text-xl text-white mb-2 group-hover:text-[#E4002B] transition-colors">
                  {pos.title.toUpperCase()}
                </h3>
                <p className="font-body text-sm text-white/40 leading-relaxed flex-1">{pos.desc}</p>
                <button
                  onClick={() => selectAndScroll(pos.title)}
                  className="mt-5 block w-full text-center font-heading text-xs tracking-widest text-[#E4002B] border border-[#E4002B]/30 py-2.5 rounded-sm hover:bg-[#E4002B] hover:text-white transition-colors"
                >
                  APPLY →
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Apply Form */}
      <section id="apply" className="scroll-mt-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

            {/* Left — copy */}
            <div>
              <p className="font-heading text-xs tracking-[0.4em] text-[#E4002B] mb-2">GET IN TOUCH</p>
              <h2 className="font-heading text-4xl text-white mb-4">APPLY NOW</h2>
              <p className="font-body text-white/40 text-sm leading-relaxed mb-8">
                Fill out the form and we&apos;ll contact you on your mobile number if you&apos;re a good fit. No CV required — just show up ready to work hard.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="text-[#E4002B] mt-0.5">◆</span>
                  <div>
                    <p className="font-heading text-sm text-white">NO CV NEEDED</p>
                    <p className="font-body text-xs text-white/30">Just your name, number, and the position you want.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[#E4002B] mt-0.5">◆</span>
                  <div>
                    <p className="font-heading text-sm text-white">WE&apos;LL CALL YOU</p>
                    <p className="font-body text-xs text-white/30">If selected, we&apos;ll reach out within 3 working days.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[#E4002B] mt-0.5">◆</span>
                  <div>
                    <p className="font-heading text-sm text-white">MANDI BAHAUDDIN ONLY</p>
                    <p className="font-body text-xs text-white/30">All positions are based at our restaurant in Mandi Bahauddin.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right — form */}
            <div className="border border-white/5 bg-[#111] rounded-sm p-6 sm:p-8">
              <ApplyForm selectedPosition={selectedPosition} onPositionChange={setSelectedPosition} />
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
