import React from 'react';
import { CheckCircle2, Volume2 } from 'lucide-react';
import {
  KYORUGI_MATCH_SEQUENCE,
  POOMSAE_DEMO_SEQUENCE,
} from '../data/techniques';
import {
  DojoArenaMode,
  LiveBiomechanics,
  TechniqueDefinition,
} from '../types/taekwondo';

interface TechniqueDeckProps {
  arenaMode: DojoArenaMode;
  onArenaModeChange: (mode: DojoArenaMode) => void;
  techniques: TechniqueDefinition[];
  selectedTechnique: TechniqueDefinition;
  onSelectTechnique: (tech: TechniqueDefinition) => void;
  normTime: number;
  scrubTime: number | null;
  onScrub: (t: number | null) => void;
  onSpeakPhase: (text: string) => void;
  biomechanics: LiveBiomechanics;
  practicedIds: string[];
  onTogglePracticed: (id: string) => void;
}

export const TechniqueDeck: React.FC<TechniqueDeckProps> = ({
  arenaMode,
  onArenaModeChange,
  techniques,
  selectedTechnique,
  onSelectTechnique,
  normTime,
  scrubTime,
  onScrub,
  onSpeakPhase,
  biomechanics,
  practicedIds,
  onTogglePracticed,
}) => {
  const displayTime = scrubTime !== null ? scrubTime : normTime;
  const activePhase =
    selectedTechnique.phases.find(
      (p) => displayTime >= p.startT && displayTime <= p.endT,
    ) ?? selectedTechnique.phases[0];
  const isPracticed = practicedIds.includes(selectedTechnique.id);

  if (arenaMode === 'kyorugi') {
    return (
      <div className="mt-6 rounded-2xl border border-slate-800 bg-[#0B111E] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-xs font-semibold text-cyan-400">
              Virtual Kyorugi Sparring Demonstration
            </p>
            <h3 className="mt-1 font-display text-xl font-bold text-white">
              Live 4-Exchange Scoring Sequence (Cheong vs. Hong)
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onArenaModeChange('technique')}
            className="min-h-[38px] rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-slate-200 hover:text-white"
          >
            Back to Technique Lab
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {KYORUGI_MATCH_SEQUENCE.map((ex, i) => (
            <div
              key={ex.id}
              className="rounded-xl border border-slate-800 bg-[#070B12] p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono tabular-nums">Exchange 0{i + 1}</span>
                  <span
                    className={
                      ex.scoringFighter === 'blue' ? 'text-sky-400 font-semibold' : 'text-rose-400 font-semibold'
                    }
                  >
                    {ex.scoringZone}
                  </span>
                </div>
                <h4 className="mt-1.5 font-display text-base font-bold text-white">
                  {ex.title}
                </h4>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">
                  {ex.commentary}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSpeakPhase(ex.commentary)}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
              >
                <Volume2 className="h-3.5 w-3.5" />
                <span>Hear Commentary</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (arenaMode === 'poomsae') {
    return (
      <div className="mt-6 rounded-2xl border border-slate-800 bg-[#0B111E] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-xs font-semibold text-emerald-400">
              Virtual Poomsae Demonstration Sequence
            </p>
            <h3 className="mt-1 font-display text-xl font-bold text-white">
              Taegeuk Foundations — 5-Step Continuous Pattern
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onArenaModeChange('technique')}
            className="min-h-[38px] rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-slate-200 hover:text-white"
          >
            Back to Technique Lab
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {POOMSAE_DEMO_SEQUENCE.map((step) => (
            <div
              key={step.id}
              className="rounded-xl border border-slate-800 bg-[#070B12] p-4 flex flex-col justify-between"
            >
              <div>
                <div className="text-xs font-mono text-cyan-400 tabular-nums">
                  Step 0{step.stepNumber}
                </div>
                <h4 className="mt-1 font-display text-base font-bold text-white">
                  {step.koreanCallout}
                </h4>
                <div className="text-xs text-slate-400">{step.englishName}</div>
                <div className="mt-1.5 text-xs text-slate-300">{step.stance}</div>
              </div>
              <button
                type="button"
                onClick={() => onSpeakPhase(step.voiceCue)}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
              >
                <Volume2 className="h-3.5 w-3.5" />
                <span>Hear Cue</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      {/* One-Tap Technique Selector Strip */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="font-display text-sm font-semibold text-slate-300">
            Tap Any Technique — 3D Instructor Demonstrates with Voice &amp; Holographic Trail
          </h2>
          <span className="text-xs text-slate-400 tabular-nums">
            {practicedIds.length} of {techniques.length} practiced
          </span>
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible lg:pb-0">
          {techniques.map((tech) => {
            const active = tech.id === selectedTechnique.id;
            const done = practicedIds.includes(tech.id);
            return (
              <button
                key={tech.id}
                type="button"
                onClick={() => onSelectTechnique(tech)}
                className={`min-w-[190px] lg:min-w-0 min-h-[64px] flex flex-col justify-between rounded-xl border p-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                  active
                    ? 'border-emerald-500/80 bg-[#101C2E] text-white'
                    : 'border-slate-800 bg-[#0B111E] text-slate-300 hover:border-slate-700 hover:bg-[#0F172A]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 w-full">
                  <span className="text-xs font-medium text-cyan-400 whitespace-nowrap truncate">
                    {tech.koreanName}
                  </span>
                  {done && (
                    <CheckCircle2
                      className="h-3.5 w-3.5 text-emerald-400 shrink-0"
                      aria-label="Practiced"
                    />
                  )}
                </div>
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <span className="font-display text-sm font-semibold truncate">
                    {tech.name}
                  </span>
                  <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">
                    {tech.category}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Biomechanics Scrubber + Live Joint Telemetry + Coaching Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 rounded-2xl border border-slate-800/90 bg-[#0B111E] p-5 sm:p-6">
        <div className="lg:col-span-7 flex flex-col justify-between space-y-5">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{selectedTechnique.beltTier}</span>
                  <span aria-hidden="true">·</span>
                  <span>Target: {selectedTechnique.targetZone}</span>
                  <span aria-hidden="true">·</span>
                  <span>Contact: {selectedTechnique.powerFocus}</span>
                </div>
                <h3 className="mt-1 font-display text-2xl font-bold text-white">
                  {selectedTechnique.name} ({selectedTechnique.koreanName})
                </h3>
              </div>

              <button
                type="button"
                onClick={() => onTogglePracticed(selectedTechnique.id)}
                className={`min-h-[40px] inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  isPracticed
                    ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300'
                    : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-emerald-500/60 hover:text-white'
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{isPracticed ? 'Practiced' : 'Mark Practiced'}</span>
              </button>
            </div>

            <p className="mt-2.5 text-sm leading-relaxed text-slate-300">
              {selectedTechnique.description}
            </p>
          </div>

          {/* Interactive Timeline Phase Scrubber */}
          <div className="rounded-xl border border-slate-800 bg-[#070B12] p-4">
            <div className="flex items-center justify-between gap-3 mb-2">
              <label
                htmlFor="phase-scrubber"
                className="text-xs font-semibold text-slate-200"
              >
                Phase Inspector: {activePhase.label} ({activePhase.koreanLabel})
              </label>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs tabular-nums text-cyan-400">
                  {Math.round(displayTime * 100)}%
                </span>
                {scrubTime !== null && (
                  <button
                    type="button"
                    onClick={() => onScrub(null)}
                    className="text-xs font-medium text-emerald-400 hover:text-emerald-300 underline"
                  >
                    Resume Loop
                  </button>
                )}
              </div>
            </div>

            <input
              id="phase-scrubber"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={displayTime}
              onChange={(e) => onScrub(parseFloat(e.target.value))}
              className="holo-range w-full"
            />

            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {selectedTechnique.phases.map((phase) => {
                const isCurrent = activePhase.id === phase.id;
                const midPoint = (phase.startT + phase.endT) / 2;
                return (
                  <button
                    key={phase.id}
                    type="button"
                    onClick={() => {
                      onScrub(Number(midPoint.toFixed(2)));
                      onSpeakPhase(`${phase.label}. ${phase.summary} ${phase.cue}`);
                    }}
                    className={`min-h-[42px] rounded-lg border px-2.5 py-2 text-left transition-colors ${
                      isCurrent
                        ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-200'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-semibold truncate">{phase.label}</div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {phase.koreanLabel}
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="mt-3 text-xs text-slate-300">
              <span className="font-semibold text-cyan-300">{activePhase.label}:</span>{' '}
              {activePhase.summary} <span className="text-slate-400">Cue: {activePhase.cue}</span>
            </p>
          </div>

          {/* Live Calculated Joint Biomechanics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-800/80 bg-[#070B12] p-3">
              <div className="text-xs text-slate-400">Joint Extension</div>
              <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-white">
                {biomechanics.kneeAngleDeg}°
              </div>
            </div>
            <div className="rounded-xl border border-slate-800/80 bg-[#070B12] p-3">
              <div className="text-xs text-slate-400">Hip Rotation</div>
              <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-cyan-300">
                {biomechanics.hipRotationDeg}°
              </div>
            </div>
            <div className="rounded-xl border border-slate-800/80 bg-[#070B12] p-3">
              <div className="text-xs text-slate-400">Strike Height</div>
              <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-emerald-400">
                {biomechanics.strikeHeightCm} cm
              </div>
            </div>
            <div className="rounded-xl border border-slate-800/80 bg-[#070B12] p-3">
              <div className="text-xs text-slate-400">Posture Balance</div>
              <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-amber-400">
                {biomechanics.balanceScorePct}%
              </div>
            </div>
          </div>
        </div>

        {/* Right: Youth Tip, Checkpoints & Mistake Correction */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4 border-t lg:border-t-0 lg:border-l border-slate-800/80 pt-5 lg:pt-0 lg:pl-6">
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
              <h4 className="text-xs font-semibold text-emerald-300">
                Junior &amp; Youth Athlete Tip
              </h4>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-200">
                {selectedTechnique.youthTip}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-300 mb-2.5">
                Form Checkpoints
              </h4>
              <ul className="space-y-2">
                {selectedTechnique.keyCheckpoints.map((point, idx) => (
                  <li
                    key={point}
                    className="flex items-start gap-2.5 text-sm text-slate-300"
                  >
                    <span className="font-mono text-xs font-semibold text-cyan-400 mt-0.5 tabular-nums">
                      0{idx + 1}.
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-amber-500/25 bg-amber-950/15 p-3.5">
            <h4 className="text-xs font-semibold text-amber-300">
              Common Mistake to Avoid
            </h4>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              {selectedTechnique.commonMistake}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
