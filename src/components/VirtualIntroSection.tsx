import React, { useState } from 'react';
import { COMPARISON_ROWS, VIRTUAL_TAEKWONDO_PILLARS } from '../data/techniques';

interface VirtualIntroSectionProps {
  onLaunchHoloDojo: () => void;
}

export const VirtualIntroSection: React.FC<VirtualIntroSectionProps> = ({
  onLaunchHoloDojo,
}) => {
  const [focusView, setFocusView] = useState<'both' | 'virtual' | 'traditional'>('both');

  return (
    <section
      id="virtual-intro"
      className="py-16 sm:py-20 border-t border-slate-800/70"
    >
      <div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-wide text-emerald-400">
              Pakistan Taekwondo Federation · Virtual Taekwondo Onboarding
            </p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-white">
              What Is Virtual Taekwondo?
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-300">
              Recognized in the Olympic Esports pathway and championed by the Pakistan Taekwondo
              Federation, Virtual Taekwondo pairs motion-tracking sensors with 3D holographic
              coaching so athletes master speed, balance, and precision without physical collision.
            </p>
          </div>

          <button
            type="button"
            onClick={onLaunchHoloDojo}
            className="min-h-[44px] self-start lg:self-auto rounded-lg border border-cyan-500/50 bg-cyan-500/10 px-5 py-2.5 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-colors whitespace-nowrap shrink-0"
          >
            Test Techniques in Holo-Dojo
          </button>
        </div>

        {/* 4 Onboarding Pillars */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {VIRTUAL_TAEKWONDO_PILLARS.map((pillar) => (
            <div
              key={pillar.step}
              className="rounded-2xl border border-slate-800 bg-[#0B111E] p-5 flex flex-col justify-between"
            >
              <div>
                <span className="font-mono text-xs font-semibold text-cyan-400 tabular-nums">
                  {pillar.step}.
                </span>
                <h3 className="mt-2 font-display text-lg font-bold text-white">
                  {pillar.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  {pillar.summary}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Interactive Traditional vs. Virtual Comparison */}
        <div className="mt-10 rounded-2xl border border-slate-800 bg-[#0B111E] p-5 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
            <div>
              <h3 className="font-display text-xl font-bold text-white">
                Traditional Sparring vs. Virtual Taekwondo
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Compare how Virtual Taekwondo complements traditional mat training across PTF clubs.
              </p>
            </div>

            <div className="inline-flex items-center rounded-lg bg-[#070B12] p-1 border border-slate-800 self-start">
              {(
                [
                  { id: 'both', label: 'Side by Side' },
                  { id: 'virtual', label: 'Virtual Focus' },
                  { id: 'traditional', label: 'Traditional Focus' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFocusView(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    focusView === tab.id
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 divide-y divide-slate-800/80">
            {COMPARISON_ROWS.map((row) => (
              <div
                key={row.dimension}
                className="py-4 grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-6 items-start"
              >
                <div className="md:col-span-3 font-display text-sm font-semibold text-white">
                  {row.dimension}
                </div>
                {focusView !== 'virtual' && (
                  <div
                    className={`${
                      focusView === 'both' ? 'md:col-span-4' : 'md:col-span-9'
                    } text-sm text-slate-400`}
                  >
                    <span className="text-xs font-semibold text-slate-500 block mb-0.5">
                      Traditional Kyorugi
                    </span>
                    {row.traditional}
                  </div>
                )}
                {focusView !== 'traditional' && (
                  <div
                    className={`${
                      focusView === 'both' ? 'md:col-span-5' : 'md:col-span-9'
                    } text-sm text-slate-200`}
                  >
                    <span className="text-xs font-semibold text-cyan-400 block mb-0.5">
                      Virtual Taekwondo
                    </span>
                    {row.virtual}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
