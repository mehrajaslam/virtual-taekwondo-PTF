export enum TechniqueCategory {
  Kick = 'Kick',
  Strike = 'Strike',
  Block = 'Block',
}

export enum BeltTier {
  Beginner = 'White / Yellow Belt',
  Intermediate = 'Green / Blue Belt',
  Advanced = 'Red / Black Belt',
}

export type InstructorGender = 'male' | 'female';
export type HoloViewMode = 'dobok' | 'xray' | 'skeleton';
export type CameraPreset = 'dojo' | 'angle45' | 'side' | 'overhead';
export type PlaybackSpeed = 0.25 | 0.5 | 1;
export type DojoArenaMode = 'technique' | 'kyorugi' | 'poomsae';

export interface TechniquePhase {
  id: string;
  label: string;
  koreanLabel: string;
  startT: number;
  endT: number;
  summary: string;
  cue: string;
}

export type ActiveLimb = 'rightFoot' | 'leftFoot' | 'rightHand' | 'leftHand';

export interface TechniqueDefinition {
  id: string;
  name: string;
  koreanName: string;
  hangul: string;
  category: TechniqueCategory;
  beltTier: BeltTier;
  beltOrder: number;
  difficulty: 'Foundation' | 'Intermediate' | 'Olympic';
  targetZone: string;
  powerFocus: string;
  activeLimb: ActiveLimb;
  trailColor: string;
  voiceIntro: string;
  description: string;
  youthTip: string;
  keyCheckpoints: string[];
  commonMistake: string;
  phases: TechniquePhase[];
}

export interface LiveBiomechanics {
  phaseLabel: string;
  kneeAngleDeg: number;
  hipRotationDeg: number;
  strikeHeightCm: number;
  limbVelocityMs: number;
  balanceScorePct: number;
}

export interface KyorugiExchange {
  id: string;
  title: string;
  attacker: 'blue' | 'red';
  blueTechId: string;
  redTechId: string;
  pointsAwarded: number;
  scoringFighter: 'blue' | 'red';
  scoringZone: string;
  commentary: string;
}

export interface PoomsaeStep {
  id: string;
  stepNumber: number;
  techniqueId: string;
  koreanCallout: string;
  englishName: string;
  stance: string;
  voiceCue: string;
  durationSec: number;
}

export interface DrillStep {
  techniqueId: string;
  reps: number;
  durationSec: number;
  focusPrompt: string;
}

export interface TrainingDrill {
  id: string;
  title: string;
  level: string;
  durationMin: number;
  beltFocus: string;
  summary: string;
  steps: DrillStep[];
}

export interface AthleteProgress {
  completedDrills: string[];
  practicedTechniques: string[];
  totalRepsLogged: number;
  totalMinutesTrained: number;
}
