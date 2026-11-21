import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-[#070B12] py-10">
      <div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <p className="font-display text-base font-bold text-white">
            Pakistan Taekwondo Federation — Virtual Taekwondo Academy
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Interactive 3D Holo-Dojo, youth technique onboarding, and biomechanical training drills.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs text-slate-400">
          <a href="#holo-dojo" className="hover:text-white transition-colors">
            Holo-Dojo
          </a>
          <a href="#virtual-intro" className="hover:text-white transition-colors">
            Virtual Intro
          </a>
          <a href="#training-drills" className="hover:text-white transition-colors">
            Training Drills
          </a>
          <a href="#global-ranking" className="hover:text-white transition-colors">
            Global Ranking
          </a>
          <a href="#curriculum" className="hover:text-white transition-colors">
            Belt Curriculum
          </a>
        </div>
      </div>
    </footer>
  );
};
