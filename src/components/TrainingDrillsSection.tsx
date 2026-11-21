import React, { useEffect, useState } from 'react';
import { CheckCircle2, Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import {
  AthleteProgress,
  TechniqueDefinition,
  TrainingDrill,
} from '../types/taekwondo';
import { audioEngine } from '../utils/audioEngine';

interface TrainingDrillsSectionProps {
  drills: TrainingDrill[];
  techniques: TechniqueDefinition[];
  progress: AthleteProgress;
  onSyncTechnique: (techniqueId: string, scrollTop?: boolean) => void;
  onCompleteDrill: (drill: TrainingDrill, repsAdded: number) => void;
  onLogRep: () => void;
}

export const TrainingDrillsSection: React.FC<TrainingDrillsSectionProps> = ({
  drills,
  techniques,
  progress,
  onSyncTechnique,
  onCompleteDrill,
  onLogRep,
}) => {
  const [selectedDrillId, setSelectedDrillId] = useState<string>(drills[0].id);
  const [stepIndex, setStepIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(drills[0].steps[0].durationSec);
  const [sessionReps, setSessionReps] = useState(0);
  const [justFinished, setJustFinished] = useState(false);

  const selectedDrill =
    drills.find((d) => d.id === selectedDrillId) ?? drills[0];
  const currentStep = selectedDrill.steps[stepIndex] ?? selectedDrill.steps[0];
  const currentTechnique =
    techniques.find((t) => t.id === currentStep.techniqueId) ?? techniques[0];

  const selectDrill = (drill: TrainingDrill) => {
    setSelectedDrillId(drill.id);
    setStepIndex(0);
    setRunning(false);
    setSecondsLeft(drill.steps[0].durationSec);
    setSessionReps(0);
    setJustFinished(false);
    onSyncTechnique(drill.steps[0].techniqueId, false);
  };

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (stepIndex + 1 < selectedDrill.steps.length) {
            const nextIdx = stepIndex + 1;
            const nextStep = selectedDrill.steps[nextIdx];
            setStepIndex(nextIdx);
            onSyncTechnique(nextStep.techniqueId, false);
            audioEngine.playDrillCue(false);
            return nextStep.durationSec;
          } else {
            setRunning(false);
            setJustFinished(true);
            audioEngine.playDrillCue(true);
            const totalStepReps = selectedDrill.steps.reduce(
              (acc, s) => acc + s.reps,
              0,
            );
            onCompleteDrill(selectedDrill, Math.max(sessionReps, totalStepReps));
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [
    running,
    stepIndex,
    selectedDrill,
    onSyncTechnique,
    onCompleteDrill,
    sessionReps,
  ]);

  const handleStartPause = () => {
    if (justFinished) {
      setStepIndex(0);
      setSecondsLeft(selectedDrill.steps[0].durationSec);
      setSessionReps(0);
      setJustFinished(false);
      onSyncTechnique(selectedDrill.steps[0].techniqueId, false);
      setRunning(true);
      audioEngine.playDrillCue(false);
      return;
    }
    if (!running) {
      onSyncTechnique(currentStep.techniqueId, false);
      audioEngine.playDrillCue(false);
    }
    setRunning((r) => !r);
  };

  const handleNextStep = () => {
    if (stepIndex + 1 < selectedDrill.steps.length) {
      const nextIdx = stepIndex + 1;
      setStepIndex(nextIdx);
      setSecondsLeft(selectedDrill.steps[nextIdx].durationSec);
      onSyncTechnique(selectedDrill.steps[nextIdx].techniqueId, false);
      audioEngine.playDrillCue(false);
    } else {
      setRunning(false);
      setJustFinished(true);
      setSecondsLeft(0);
      audioEngine.playDrillCue(true);
      const totalStepReps = selectedDrill.steps.reduce((acc, s) => acc + s.reps, 0);
      onCompleteDrill(selectedDrill, Math.max(sessionReps, totalStepReps));
    }
  };

  const handleReset = () => {
    setRunning(false);
    setStepIndex(0);
    setSecondsLeft(selectedDrill.steps[0].durationSec);
    setSessionReps(0);
    setJustFinished(false);
  };

  const handleCountRep = () => {
    setSessionReps((r) => r + 1);
    onLogRep();
    audioEngine.playImpactSnap();
  };

  return (
    <section
      id="training-drills"
      className="py-16 sm:py-20 border-t border-slate-800/70"
    >
      <div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-wide text-emerald-400">
              Guided Virtual Training Circuits
            </p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-white">
              Interactive Drill Coach
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-300">
              Follow timed Taekwondo circuits synchronized with the 3D Holo-Dojo instructor. Log
              repetitions, track your belt readiness, and practice safe scoring rhythm at home or
              at your PTF club.
            </p>
          </div>

          {/* Athlete Progress Strip */}
          <div className="grid grid-cols-3 gap-4 rounded-xl border border-slate-800 bg-[#0B111E] px-5 py-3.5 shrink-0">
            <div>
              <div className="text-xs text-slate-400">Drills Done</div>
              <div className="font-mono text-lg font-semibold tabular-nums text-emerald-400">
                {progress.completedDrills.length} / {drills.length}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Reps Logged</div>
              <div className="font-mono text-lg font-semibold tabular-nums text-cyan-300">
                {progress.totalRepsLogged}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Active Min</div>
              <div className="font-mono text-lg font-semibold tabular-nums text-white">
                {progress.totalMinutesTrained}
              </div>
            </div>
          </div>
        </div>

        {/* Drill Selector & Live Coach Console */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left: Drill List */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            {drills.map((drill) => {
              const isSelected = drill.id === selectedDrill.id;
              const isCompleted = progress.completedDrills.includes(drill.id);
              return (
                <button
                  key={drill.id}
                  type="button"
                  onClick={() => selectDrill(drill)}
                  className={`rounded-2xl border p-5 text-left transition-colors ${
                    isSelected
                      ? 'border-emerald-500/80 bg-[#101C2E]'
                      : 'border-slate-800 bg-[#0B111E] hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                    <span>
                      {drill.level} · {drill.durationMin} min
                    </span>
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 font-medium text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Completed
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1.5 font-display text-lg font-bold text-white">
                    {drill.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                    {drill.summary}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Right: Active Guided Drill Console */}
          <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-[#0B111E] p-6 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-800">
                <div>
                  <span className="text-xs font-medium text-cyan-400">
                    Step {stepIndex + 1} of {selectedDrill.steps.length} · {selectedDrill.beltFocus}
                  </span>
                  <h3 className="mt-1 font-display text-2xl font-bold text-white">
                    {currentTechnique.name} ({currentTechnique.koreanName})
                  </h3>
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-400">Step Timer</div>
                  <div className="font-mono text-3xl font-bold tabular-nums text-emerald-400">
                    00:{String(secondsLeft).padStart(2, '0')}
                  </div>
                </div>
              </div>

              {/* Current Coaching Prompt */}
              <div className="mt-5 rounded-xl border border-slate-800 bg-[#070B12] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-300">
                    Target Goal: {currentStep.reps} crisp repetitions
                  </span>
                  <button
                    type="button"
                    onClick={() => onSyncTechnique(currentStep.techniqueId, true)}
                    className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 underline"
                  >
                    Watch in 3D Holo-Dojo
                  </button>
                </div>
                <p className="mt-2 text-base font-medium text-white">
                  {currentStep.focusPrompt}
                </p>
              </div>

              {/* Step Sequence Timeline */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {selectedDrill.steps.map((st, idx) => {
                  const tech =
                    techniques.find((t) => t.id === st.techniqueId) ?? techniques[0];
                  const active = idx === stepIndex && !justFinished;
                  const done = idx < stepIndex || justFinished;
                  return (
                    <button
                      key={`${st.techniqueId}-${idx}`}
                      type="button"
                      onClick={() => {
                        setStepIndex(idx);
                        setSecondsLeft(st.durationSec);
                        setJustFinished(false);
                        onSyncTechnique(st.techniqueId, false);
                      }}
                      className={`rounded-xl border p-3 text-left transition-colors ${
                        active
                          ? 'border-cyan-500/70 bg-cyan-500/10'
                          : done
                            ? 'border-emerald-500/40 bg-emerald-500/5'
                            : 'border-slate-800 bg-[#070B12]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-mono tabular-nums">0{idx + 1}</span>
                        <span className="tabular-nums">{st.reps} reps</span>
                      </div>
                      <div className="mt-1 font-display text-sm font-semibold text-white truncate">
                        {tech.name}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Drill Controls & Rep Logger */}
            <div className="mt-6 pt-5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleStartPause}
                  className="min-h-[44px] inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition-colors whitespace-nowrap shrink-0"
                >
                  {running ? (
                    <>
                      <Pause className="h-4 w-4" />
                      <span>Pause Drill</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      <span>{justFinished ? 'Restart Drill' : 'Start Drill'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleNextStep}
                  className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:text-white transition-colors whitespace-nowrap shrink-0"
                >
                  <SkipForward className="h-4 w-4" />
                  <span>Next Step</span>
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="min-h-[44px] inline-flex items-center justify-center rounded-lg border border-slate-800 bg-slate-900 px-3 text-slate-300 hover:text-white transition-colors"
                  aria-label="Reset drill timer"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-slate-400 tabular-nums">
                  Session Reps: <strong className="text-white">{sessionReps}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleCountRep}
                  className="min-h-[44px] rounded-lg border border-cyan-500/50 bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/25 transition-colors whitespace-nowrap shrink-0"
                >
                  + Log Rep
                </button>
              </div>
            </div>

            {justFinished && (
              <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-950/25 px-4 py-3 text-sm text-emerald-200">
                Drill complete! Your PTF Virtual Academy training progress has been saved.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
