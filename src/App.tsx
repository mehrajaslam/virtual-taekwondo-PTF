import { useCallback, useEffect, useState } from 'react';
import { Camera, MessageSquare, Swords, Layers, Compass } from 'lucide-react';
import { AthleteMonitorPanel } from './components/AthleteMonitorPanel';
import { BeltCurriculumSection } from './components/BeltCurriculumSection';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Footer } from './components/Footer';
import { GlobalRankingSection } from './components/GlobalRankingSection';
import { HoloDojoStage } from './components/HoloDojoStage';
import { Navbar } from './components/Navbar';
import { TechniqueDeck } from './components/TechniqueDeck';
import { TrainingDrillsSection } from './components/TrainingDrillsSection';
import { VirtualIntroSection } from './components/VirtualIntroSection';
import {
  KYORUGI_MATCH_SEQUENCE,
  POOMSAE_DEMO_SEQUENCE,
  TECHNIQUES,
  TRAINING_DRILLS,
} from './data/techniques';
import {
  AthleteProgress,
  DojoArenaMode,
  HoloViewMode,
  InstructorGender,
  LiveBiomechanics,
  PlaybackSpeed,
  TechniqueDefinition,
  TrainingDrill,
} from './types/taekwondo';
import { audioEngine } from './utils/audioEngine';

const PROGRESS_STORAGE_KEY = 'ptf_virtual_tkd_progress_v1';

const DEFAULT_PROGRESS: AthleteProgress = {
  completedDrills: [],
  practicedTechniques: [],
  totalRepsLogged: 0,
  totalMinutesTrained: 0,
};

function loadProgress(): AthleteProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<AthleteProgress>;
    return {
      completedDrills: Array.isArray(parsed.completedDrills) ? parsed.completedDrills : [],
      practicedTechniques: Array.isArray(parsed.practicedTechniques)
        ? parsed.practicedTechniques
        : [],
      totalRepsLogged: typeof parsed.totalRepsLogged === 'number' ? parsed.totalRepsLogged : 0,
      totalMinutesTrained:
        typeof parsed.totalMinutesTrained === 'number' ? parsed.totalMinutesTrained : 0,
    };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export default function App() {
  const [arenaMode, setArenaMode] = useState<DojoArenaMode>('technique');
  const [selectedTechnique, setSelectedTechnique] = useState<TechniqueDefinition>(
    TECHNIQUES[1],
  );
  const [instructor, setInstructor] = useState<InstructorGender>('male');
  const [viewMode, setViewMode] = useState<HoloViewMode>('xray');
  const [showTrail, setShowTrail] = useState(true);
  const [showVisor, setShowVisor] = useState(true);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [isPlaying, setIsPlaying] = useState(true);
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const [normTime, setNormTime] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [liveCaption, setLiveCaption] = useState<string | null>(
    TECHNIQUES[1].voiceIntro,
  );
  const [monitorOpen, setMonitorOpen] = useState(false);

  const [biomechanics, setBiomechanics] = useState<LiveBiomechanics>({
    phaseLabel: TECHNIQUES[1].phases[0].label,
    kneeAngleDeg: 145,
    hipRotationDeg: 20,
    strikeHeightCm: 92,
    limbVelocityMs: 0,
    balanceScorePct: 96,
  });

  const [progress, setProgress] = useState<AthleteProgress>(loadProgress);

  useEffect(() => {
    audioEngine.onSpeechCaption((caption) => {
      if (caption) setLiveCaption(caption);
    });
    return () => audioEngine.onSpeechCaption(null);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Ignore storage quota errors
    }
  }, [progress]);

  const speakText = useCallback(
    (text: string) => {
      setLiveCaption(text);
      if (voiceEnabled) {
        audioEngine.speakCoach(text, instructor);
      }
    },
    [voiceEnabled, instructor],
  );

  const handleToggleVoice = useCallback(() => {
    setVoiceEnabled((prev) => {
      const next = !prev;
      audioEngine.setVoiceEnabled(next);
      return next;
    });
  }, []);

  const handleSpeakCurrent = useCallback(() => {
    if (arenaMode === 'kyorugi') {
      speakText(KYORUGI_MATCH_SEQUENCE[0].commentary);
    } else if (arenaMode === 'poomsae') {
      speakText(POOMSAE_DEMO_SEQUENCE[0].voiceCue);
    } else {
      speakText(selectedTechnique.voiceIntro);
    }
  }, [arenaMode, selectedTechnique, speakText]);

  const handleProgressTick = useCallback((t: number, bio: LiveBiomechanics) => {
    setNormTime(t);
    setBiomechanics(bio);
  }, []);

  const handleSelectTechnique = useCallback(
    (tech: TechniqueDefinition) => {
      setArenaMode('technique');
      setSelectedTechnique(tech);
      setScrubTime(null);
      setIsPlaying(true);
      speakText(tech.voiceIntro);
    },
    [speakText],
  );

  const scrollToHoloDojo = useCallback(() => {
    document.getElementById('holo-dojo')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleSyncTechniqueById = useCallback(
    (techniqueId: string, scrollTop = false) => {
      const found = TECHNIQUES.find((t) => t.id === techniqueId);
      if (found) {
        setArenaMode('technique');
        setSelectedTechnique(found);
        setScrubTime(null);
        setIsPlaying(true);
        speakText(found.voiceIntro);
      }
      if (scrollTop) {
        scrollToHoloDojo();
      }
    },
    [scrollToHoloDojo, speakText],
  );

  const handleTogglePracticed = useCallback((id: string) => {
    setProgress((prev) => {
      const exists = prev.practicedTechniques.includes(id);
      return {
        ...prev,
        practicedTechniques: exists
          ? prev.practicedTechniques.filter((x) => x !== id)
          : [...prev.practicedTechniques, id],
      };
    });
  }, []);

  const handleCompleteDrill = useCallback((drill: TrainingDrill, repsAdded: number) => {
    setProgress((prev) => ({
      ...prev,
      completedDrills: prev.completedDrills.includes(drill.id)
        ? prev.completedDrills
        : [...prev.completedDrills, drill.id],
      totalRepsLogged: prev.totalRepsLogged + repsAdded,
      totalMinutesTrained: prev.totalMinutesTrained + drill.durationMin,
    }));
  }, []);

  const handleLogRep = useCallback(() => {
    setProgress((prev) => ({
      ...prev,
      totalRepsLogged: prev.totalRepsLogged + 1,
    }));
  }, []);

  const handleMergeCloudStats = useCallback((cloudMinutes: number, cloudReps: number) => {
    setProgress((prev) => {
      if (
        cloudMinutes <= prev.totalMinutesTrained &&
        cloudReps <= prev.totalRepsLogged
      ) {
        return prev;
      }
      return {
        ...prev,
        totalMinutesTrained: Math.max(prev.totalMinutesTrained, cloudMinutes),
        totalRepsLogged: Math.max(prev.totalRepsLogged, cloudReps),
      };
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#070B12] text-slate-100">
      <Navbar
        onStartTraining={() => {
          document.getElementById('training-drills')?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      <main className="flex-1">
        {/* Realistic Championship Hero & Signature Holo-Dojo Stage */}
        <section
          id="holo-dojo"
          className="pt-8 pb-16 sm:pt-10 sm:pb-20 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.12)_0%,_rgba(6,182,212,0.06)_38%,_rgba(7,11,18,1)_78%)]"
        >
          <div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-8">
            {/* Hero Header + Arena Mode & Monitor Switcher */}
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-6">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold tracking-wide text-emerald-400">
                  Pakistan Taekwondo Federation · Official Virtual Academy
                </p>
                <h1 className="mt-2 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
                  Train with 3D Holographic Coaches in Real Time
                </h1>
                <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
                  Explore Virtual Taekwondo with voice-guided 3D instructors, X-ray skeleton
                  biomechanics, live athlete camera monitoring, and interactive Kyorugi &amp;
                  Poomsae demonstrations.
                </p>
              </div>

              {/* Arena Mode Tabs & Athlete Camera Monitor Toggle */}
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-slate-800 bg-[#0B111E] p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setArenaMode('technique');
                      setLiveCaption(selectedTechnique.voiceIntro);
                    }}
                    className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      arenaMode === 'technique'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Compass className="h-3.5 w-3.5" />
                    <span>Technique Lab</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setArenaMode('kyorugi');
                      setLiveCaption(KYORUGI_MATCH_SEQUENCE[0].commentary);
                    }}
                    className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      arenaMode === 'kyorugi'
                        ? 'bg-cyan-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Swords className="h-3.5 w-3.5" />
                    <span>Kyorugi Demo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setArenaMode('poomsae');
                      setLiveCaption(POOMSAE_DEMO_SEQUENCE[0].voiceCue);
                    }}
                    className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      arenaMode === 'poomsae'
                        ? 'bg-amber-400 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5" />
                    <span>Poomsae Demo</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setMonitorOpen((m) => !m)}
                  className={`inline-flex min-h-[46px] items-center gap-2 rounded-xl border px-4 py-2 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    monitorOpen
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-200'
                      : 'border-slate-700 bg-[#0B111E] text-white hover:border-cyan-400/70'
                  }`}
                >
                  <Camera className="h-4 w-4 text-cyan-400" />
                  <span>{monitorOpen ? 'Hide My Camera' : 'Athlete Cam Monitor'}</span>
                </button>
              </div>
            </div>

            {/* Interactive 3D Holo-Dojo + Optional Side-by-Side Athlete Posture Monitor */}
            <div
              className={`grid gap-5 ${
                monitorOpen ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'
              }`}
            >
              <div className={monitorOpen ? 'lg:col-span-7' : 'col-span-1'}>
                <HoloDojoStage
                  arenaMode={arenaMode}
                  technique={selectedTechnique}
                  instructor={instructor}
                  onInstructorChange={setInstructor}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  showTrail={showTrail}
                  onShowTrailChange={setShowTrail}
                  showVisor={showVisor}
                  onShowVisorChange={setShowVisor}
                  speed={speed}
                  onSpeedChange={setSpeed}
                  isPlaying={isPlaying}
                  onPlayingChange={setIsPlaying}
                  scrubTime={scrubTime}
                  onScrubTimeChange={setScrubTime}
                  voiceEnabled={voiceEnabled}
                  onToggleVoice={handleToggleVoice}
                  onSpeakCurrent={handleSpeakCurrent}
                  onProgressTick={handleProgressTick}
                />
              </div>

              {monitorOpen && (
                <div className="lg:col-span-5">
                  <AthleteMonitorPanel
                    technique={selectedTechnique}
                    onClose={() => setMonitorOpen(false)}
                  />
                </div>
              )}
            </div>

            {/* Live Coach Voice Subtitle Caption Bar */}
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#0B111E] px-4 py-3">
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <MessageSquare className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  <span className="font-semibold text-emerald-400 mr-1.5">
                    {instructor === 'male' ? 'Coach Tariq:' : 'Coach Ayesha:'}
                  </span>
                  {liveCaption || selectedTechnique.voiceIntro}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSpeakCurrent}
                className="self-start sm:self-auto min-h-[34px] rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-cyan-300 hover:text-white whitespace-nowrap shrink-0"
              >
                Replay Voice
              </button>
            </div>

            {/* 4-Column PTF Virtual Arena Highlights Strip */}
            <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl border border-slate-800/90 bg-[#0B111E] p-4">
                <div className="text-xs text-slate-400">3D Coaches</div>
                <div className="mt-1 font-display text-lg font-bold text-white">
                  Male &amp; Female
                </div>
                <div className="mt-0.5 text-xs text-slate-400">
                  Voice narration per move
                </div>
              </div>
              <div className="rounded-xl border border-slate-800/90 bg-[#0B111E] p-4">
                <div className="text-xs text-slate-400">Virtual Match</div>
                <div className="mt-1 font-display text-lg font-bold text-cyan-300">
                  Kyorugi Sparring
                </div>
                <div className="mt-0.5 text-xs text-slate-400">
                  Electronic Hogu &amp; Headgear
                </div>
              </div>
              <div className="rounded-xl border border-slate-800/90 bg-[#0B111E] p-4">
                <div className="text-xs text-slate-400">Form Sequence</div>
                <div className="mt-1 font-display text-lg font-bold text-emerald-400">
                  Poomsae Patterns
                </div>
                <div className="mt-0.5 text-xs text-slate-400">
                  Korean callouts &amp; stances
                </div>
              </div>
              <div className="rounded-xl border border-slate-800/90 bg-[#0B111E] p-4">
                <div className="text-xs text-slate-400">Self-Check</div>
                <div className="mt-1 font-display text-lg font-bold text-amber-400">
                  Athlete Mirror Cam
                </div>
                <div className="mt-0.5 text-xs text-slate-400">
                  Side-by-side target guides
                </div>
              </div>
            </div>

            {/* One-Tap Technique Selector & Biomechanical Analysis Deck */}
            <TechniqueDeck
              arenaMode={arenaMode}
              onArenaModeChange={setArenaMode}
              techniques={TECHNIQUES}
              selectedTechnique={selectedTechnique}
              onSelectTechnique={handleSelectTechnique}
              normTime={normTime}
              scrubTime={scrubTime}
              onScrub={setScrubTime}
              onSpeakPhase={speakText}
              biomechanics={biomechanics}
              practicedIds={progress.practicedTechniques}
              onTogglePracticed={handleTogglePracticed}
            />
          </div>
        </section>

        {/* Intro to Virtual Taekwondo */}
        <VirtualIntroSection onLaunchHoloDojo={scrollToHoloDojo} />

        {/* Guided Training Drills & Athlete Progress */}
        <TrainingDrillsSection
          drills={TRAINING_DRILLS}
          techniques={TECHNIQUES}
          progress={progress}
          onSyncTechnique={handleSyncTechniqueById}
          onCompleteDrill={handleCompleteDrill}
          onLogRep={handleLogRep}
        />

        {/* Global Ranking Dashboard (Firebase Firestore Sync) */}
        <ErrorBoundary>
          <GlobalRankingSection
            localProgress={progress}
            onMergeCloudStats={handleMergeCloudStats}
          />
        </ErrorBoundary>

        {/* Belt Curriculum & Technique Library */}
        <BeltCurriculumSection
          techniques={TECHNIQUES}
          practicedIds={progress.practicedTechniques}
          onDemonstrateInDojo={(tech) => {
            handleSelectTechnique(tech);
            scrollToHoloDojo();
          }}
        />
      </main>

      <Footer />
    </div>
  );
}
