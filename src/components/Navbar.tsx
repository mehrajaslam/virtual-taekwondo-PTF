import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
  onStartTraining: () => void;
}

const NAV_ITEMS = [
  { href: '#holo-dojo', label: 'Holo-Dojo' },
  { href: '#virtual-intro', label: 'Virtual Intro' },
  { href: '#training-drills', label: 'Training Drills' },
  { href: '#global-ranking', label: 'Global Ranking' },
  { href: '#curriculum', label: 'Curriculum' },
];

export const Navbar: React.FC<NavbarProps> = ({ onStartTraining }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="border-b border-slate-800/80 bg-[#070B12]">
      <div className="mx-auto flex h-16 max-w-[1360px] items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single-element Brand Wordmark */}
        <a
          href="#holo-dojo"
          className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-emerald-400"
        >
          PTF Virtual Academy
        </a>

        {/* Zone 2: 4 Clean Single-Line Navigation Links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300"
        >
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="hover:text-white transition-colors underline-offset-8 hover:underline whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-emerald-400"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: 1 Primary Action + Mobile Menu Trigger */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onStartTraining}
            className="hidden sm:inline-flex min-h-[40px] items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-emerald-300"
          >
            Start Training
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="inline-flex md:hidden min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-200 hover:text-white"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-800 bg-[#0B111E] px-4 py-4">
          <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="min-h-[44px] flex items-center rounded-lg px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800/70 hover:text-white transition-colors"
              >
                {item.label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onStartTraining();
              }}
              className="mt-2 min-h-[44px] w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition-colors"
            >
              Start Training
            </button>
          </nav>
        </div>
      )}
    </header>
  );
};
