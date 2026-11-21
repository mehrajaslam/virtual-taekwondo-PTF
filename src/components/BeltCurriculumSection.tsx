import React, { useState } from 'react';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import {
  BeltTier,
  TechniqueCategory,
  TechniqueDefinition,
} from '../types/taekwondo';

interface BeltCurriculumSectionProps {
  techniques: TechniqueDefinition[];
  practicedIds: string[];
  onDemonstrateInDojo: (tech: TechniqueDefinition) => void;
}

export const BeltCurriculumSection: React.FC<BeltCurriculumSectionProps> = ({
  techniques,
  practicedIds,
  onDemonstrateInDojo,
}) => {
  const [beltFilter, setBeltFilter] = useState<'ALL' | BeltTier>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | TechniqueCategory>('ALL');

  const filtered = techniques.filter((t) => {
    const matchBelt = beltFilter === 'ALL' || t.beltTier === beltFilter;
    const matchCat = categoryFilter === 'ALL' || t.category === categoryFilter;
    return matchBelt && matchCat;
  });

  return (
    <section
      id="curriculum"
      className="py-16 sm:py-20 border-t border-slate-800/70"
    >
      <div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-wide text-emerald-400">
              Pakistan Taekwondo Federation · Technical Syllabus
            </p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-white">
              Belt Curriculum &amp; Technique Library
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-300">
              Filter foundational kicks, blocks, and strikes by belt rank. Select any card to load
              it straight into the 3D Holo-Dojo for slow-motion skeleton breakdown.
            </p>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-[#0B111E] p-1 border border-slate-800">
              {(['ALL', BeltTier.Beginner, BeltTier.Intermediate, BeltTier.Advanced] as const).map(
                (belt) => (
                  <button
                    key={belt}
                    type="button"
                    onClick={() => setBeltFilter(belt)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      beltFilter === belt
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {belt === 'ALL' ? 'All Belts' : belt}
                  </button>
                ),
              )}
            </div>

            <div className="inline-flex items-center gap-1 rounded-lg bg-[#0B111E] p-1 border border-slate-800 self-start">
              {(
                ['ALL', TechniqueCategory.Kick, TechniqueCategory.Strike, TechniqueCategory.Block] as const
              ).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    categoryFilter === cat
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat === 'ALL' ? 'All Types' : cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Technique Cards Grid */}
        {filtered.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-slate-800 bg-[#0B111E] p-8 text-center">
            <p className="text-sm text-slate-300">
              No techniques match that belt and category combination.
            </p>
            <button
              type="button"
              onClick={() => {
                setBeltFilter('ALL');
                setCategoryFilter('ALL');
              }}
              className="mt-3 text-xs font-semibold text-emerald-400 underline"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {filtered.map((tech) => {
              const practiced = practicedIds.includes(tech.id);
              return (
                <article
                  key={tech.id}
                  className="rounded-2xl border border-slate-800 bg-[#0B111E] p-5 flex flex-col justify-between hover:border-slate-700 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                      <span>
                        {tech.koreanName} · {tech.category}
                      </span>
                      {practiced && (
                        <CheckCircle2
                          className="h-4 w-4 text-emerald-400 shrink-0"
                          aria-label="Practiced"
                        />
                      )}
                    </div>

                    <h3 className="mt-2 font-display text-xl font-bold text-white">
                      {tech.name}
                    </h3>

                    <p className="mt-1 text-xs font-medium text-cyan-400">
                      {tech.beltTier} · {tech.difficulty}
                    </p>

                    <p className="mt-3 text-sm leading-relaxed text-slate-300">
                      {tech.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-400 truncate">
                      {tech.powerFocus}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDemonstrateInDojo(tech)}
                      className="inline-flex min-h-[38px] items-center gap-1 rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-white hover:border-emerald-500/60 hover:text-emerald-300 transition-colors whitespace-nowrap shrink-0"
                    >
                      <span>Holo-Dojo</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
