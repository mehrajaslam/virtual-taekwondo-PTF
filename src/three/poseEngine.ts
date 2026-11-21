import * as THREE from 'three';
import { LiveBiomechanics } from '../types/taekwondo';

export interface JointPose {
  hipPos: [number, number, number];
  pelvisRot: [number, number, number];
  spineRot: [number, number, number];
  chestRot: [number, number, number];
  headRot: [number, number, number];
  lShoulderRot: [number, number, number];
  lElbowRot: [number, number, number];
  rShoulderRot: [number, number, number];
  rElbowRot: [number, number, number];
  lHipRot: [number, number, number];
  lKneeRot: [number, number, number];
  lAnkleRot: [number, number, number];
  rHipRot: [number, number, number];
  rKneeRot: [number, number, number];
  rAnkleRot: [number, number, number];
}

interface Keyframe {
  t: number;
  pose: JointPose;
}

const GUARD_POSE: JointPose = {
  hipPos: [0, 0.9, 0],
  pelvisRot: [0.04, 0.36, 0],
  spineRot: [0.04, -0.15, 0],
  chestRot: [0.04, -0.15, 0],
  headRot: [-0.04, -0.06, 0],
  lShoulderRot: [-0.72, 0.15, 0.24],
  lElbowRot: [-1.62, 0, 0],
  rShoulderRot: [-0.58, -0.15, -0.22],
  rElbowRot: [-1.72, 0, 0],
  lHipRot: [-0.34, 0.08, 0.08],
  lKneeRot: [0.46, 0, 0],
  lAnkleRot: [-0.14, 0, 0],
  rHipRot: [0.24, -0.1, -0.08],
  rKneeRot: [0.36, 0, 0],
  rAnkleRot: [-0.32, 0, 0],
};

function createPose(overrides: Partial<JointPose>): JointPose {
  return {
    ...GUARD_POSE,
    ...overrides,
  };
}

const TECHNIQUE_KEYFRAMES: Record<string, Keyframe[]> = {
  'ap-chagi': [
    { t: 0, pose: GUARD_POSE },
    {
      t: 0.26,
      pose: createPose({
        hipPos: [0, 0.92, 0.04],
        pelvisRot: [-0.06, 0.12, 0],
        spineRot: [0.05, -0.08, 0],
        lShoulderRot: [-0.88, 0.15, 0.28],
        lElbowRot: [-1.75, 0, 0],
        rShoulderRot: [-0.75, -0.15, -0.28],
        rElbowRot: [-1.8, 0, 0],
        lHipRot: [-0.12, 0, 0.04],
        lKneeRot: [0.22, 0, 0],
        lAnkleRot: [-0.1, 0, 0],
        rHipRot: [-1.68, 0, -0.04],
        rKneeRot: [1.85, 0, 0],
        rAnkleRot: [0.35, 0, 0],
      }),
    },
    {
      t: 0.5,
      pose: createPose({
        hipPos: [0, 0.93, 0.1],
        pelvisRot: [-0.18, 0.08, 0],
        spineRot: [-0.08, -0.05, 0],
        headRot: [0.08, 0, 0],
        lShoulderRot: [-0.95, 0.2, 0.3],
        lElbowRot: [-1.78, 0, 0],
        rShoulderRot: [-0.45, -0.2, -0.35],
        rElbowRot: [-1.65, 0, 0],
        lHipRot: [-0.05, 0, 0.04],
        lKneeRot: [0.16, 0, 0],
        lAnkleRot: [-0.08, 0, 0],
        rHipRot: [-1.55, 0, -0.03],
        rKneeRot: [0.08, 0, 0],
        rAnkleRot: [0.42, 0, 0],
      }),
    },
    {
      t: 0.72,
      pose: createPose({
        hipPos: [0, 0.92, 0.04],
        pelvisRot: [-0.06, 0.18, 0],
        rHipRot: [-1.55, 0, -0.04],
        rKneeRot: [1.75, 0, 0],
        lHipRot: [-0.14, 0, 0.05],
        lKneeRot: [0.25, 0, 0],
      }),
    },
    { t: 1, pose: GUARD_POSE },
  ],

  'dollyo-chagi': [
    { t: 0, pose: GUARD_POSE },
    {
      t: 0.28,
      pose: createPose({
        hipPos: [0, 0.91, 0.04],
        pelvisRot: [0.05, 1.32, 0.12],
        spineRot: [0.05, -0.35, 0.14],
        chestRot: [0.04, -0.3, 0.12],
        headRot: [-0.04, -0.62, -0.1],
        lShoulderRot: [-0.85, 0.25, 0.38],
        lElbowRot: [-1.75, 0, 0],
        rShoulderRot: [-0.72, -0.15, -0.4],
        rElbowRot: [-1.85, 0, 0],
        lHipRot: [-0.15, 0.22, 0.06],
        lKneeRot: [0.26, 0, 0],
        lAnkleRot: [-0.1, 0, 0],
        rHipRot: [-1.25, -0.35, -1.2],
        rKneeRot: [1.88, 0, 0],
        rAnkleRot: [0.65, 0, 0],
      }),
    },
    {
      t: 0.5,
      pose: createPose({
        hipPos: [0, 0.93, 0.08],
        pelvisRot: [-0.05, 1.48, 0.18],
        spineRot: [0.04, -0.32, 0.22],
        chestRot: [0.04, -0.25, 0.18],
        headRot: [0.04, -0.78, -0.16],
        lShoulderRot: [-0.9, 0.3, 0.45],
        lElbowRot: [-1.8, 0, 0],
        rShoulderRot: [-0.55, -0.2, -0.5],
        rElbowRot: [-1.7, 0, 0],
        lHipRot: [-0.12, 0.25, 0.05],
        lKneeRot: [0.2, 0, 0],
        lAnkleRot: [-0.08, 0, 0],
        rHipRot: [-1.45, -0.15, -1.15],
        rKneeRot: [0.08, 0, 0],
        rAnkleRot: [0.78, 0, 0],
      }),
    },
    {
      t: 0.72,
      pose: createPose({
        hipPos: [0, 0.91, 0.03],
        pelvisRot: [0.04, 1.15, 0.1],
        headRot: [0, -0.5, -0.08],
        rHipRot: [-1.2, -0.25, -1.0],
        rKneeRot: [1.72, 0, 0],
      }),
    },
    { t: 1, pose: GUARD_POSE },
  ],

  'yeop-chagi': [
    { t: 0, pose: GUARD_POSE },
    {
      t: 0.28,
      pose: createPose({
        hipPos: [0, 0.91, 0.02],
        pelvisRot: [0, 1.46, 0.18],
        spineRot: [0.04, -0.25, 0.24],
        chestRot: [0.02, -0.2, 0.22],
        headRot: [0, -0.88, -0.18],
        lShoulderRot: [-0.8, 0.2, 0.35],
        lElbowRot: [-1.75, 0, 0],
        rShoulderRot: [-0.7, -0.1, -0.35],
        rElbowRot: [-1.85, 0, 0],
        lHipRot: [-0.12, 0.15, 0.05],
        lKneeRot: [0.24, 0, 0],
        rHipRot: [-1.42, 0.15, -0.85],
        rKneeRot: [1.92, 0, 0],
        rAnkleRot: [-0.15, 0, -0.25],
      }),
    },
    {
      t: 0.52,
      pose: createPose({
        hipPos: [0, 0.9, 0.06],
        pelvisRot: [0, 1.54, 0.28],
        spineRot: [0, -0.22, 0.34],
        chestRot: [0, -0.16, 0.28],
        headRot: [0.05, -0.98, -0.25],
        lShoulderRot: [-0.85, 0.25, 0.4],
        lElbowRot: [-1.75, 0, 0],
        rShoulderRot: [-0.6, -0.2, -0.45],
        rElbowRot: [-1.75, 0, 0],
        lHipRot: [-0.08, 0.15, 0.04],
        lKneeRot: [0.18, 0, 0],
        rHipRot: [-0.12, 0.05, -1.62],
        rKneeRot: [0.06, 0, 0],
        rAnkleRot: [-0.25, 0, -0.35],
      }),
    },
    {
      t: 0.74,
      pose: createPose({
        hipPos: [0, 0.91, 0.02],
        pelvisRot: [0, 1.32, 0.16],
        spineRot: [0.02, -0.2, 0.2],
        headRot: [0, -0.75, -0.14],
        rHipRot: [-1.2, 0.1, -0.88],
        rKneeRot: [1.82, 0, 0],
      }),
    },
    { t: 1, pose: GUARD_POSE },
  ],

  'dwit-chagi': [
    { t: 0, pose: GUARD_POSE },
    {
      t: 0.28,
      pose: createPose({
        hipPos: [0, 0.88, 0.02],
        pelvisRot: [0.08, -1.75, 0],
        spineRot: [0.18, -0.35, 0],
        chestRot: [0.14, -0.35, 0],
        headRot: [0, -0.72, 0],
        lShoulderRot: [-0.78, 0.2, 0.28],
        lElbowRot: [-1.7, 0, 0],
        rShoulderRot: [-0.65, -0.2, -0.28],
        rElbowRot: [-1.75, 0, 0],
        lHipRot: [-0.16, 0, 0.05],
        lKneeRot: [0.3, 0, 0],
        rHipRot: [-0.75, 0, -0.08],
        rKneeRot: [1.75, 0, 0],
      }),
    },
    {
      t: 0.52,
      pose: createPose({
        hipPos: [0, 0.89, 0.08],
        pelvisRot: [0.22, -3.12, 0],
        spineRot: [0.48, -0.15, 0],
        chestRot: [0.25, -0.15, 0],
        headRot: [-0.15, -0.68, 0],
        lShoulderRot: [-0.95, 0.25, 0.35],
        lElbowRot: [-1.6, 0, 0],
        rShoulderRot: [-0.85, -0.25, -0.35],
        rElbowRot: [-1.6, 0, 0],
        lHipRot: [-0.15, 0, 0.05],
        lKneeRot: [0.26, 0, 0],
        rHipRot: [1.38, 0, -0.08],
        rKneeRot: [0.08, 0, 0],
        rAnkleRot: [-0.35, 0, 0],
      }),
    },
    {
      t: 0.75,
      pose: createPose({
        hipPos: [0, 0.9, 0.02],
        pelvisRot: [0.1, -1.65, 0],
        spineRot: [0.15, -0.25, 0],
        headRot: [0, -0.45, 0],
        rHipRot: [-0.55, 0, -0.08],
        rKneeRot: [1.55, 0, 0],
      }),
    },
    { t: 1, pose: GUARD_POSE },
  ],

  'naeryo-chagi': [
    { t: 0, pose: GUARD_POSE },
    {
      t: 0.3,
      pose: createPose({
        hipPos: [0, 0.95, 0.04],
        pelvisRot: [-0.18, 0.25, 0.05],
        spineRot: [-0.14, -0.1, 0],
        headRot: [0.15, 0, 0],
        lShoulderRot: [-0.95, 0.15, 0.3],
        lElbowRot: [-1.75, 0, 0],
        rShoulderRot: [-0.8, -0.15, -0.3],
        rElbowRot: [-1.75, 0, 0],
        lHipRot: [-0.06, 0, 0.04],
        lKneeRot: [0.12, 0, 0],
        rHipRot: [-2.28, -0.05, -0.1],
        rKneeRot: [0.22, 0, 0],
        rAnkleRot: [0.35, 0, 0],
      }),
    },
    {
      t: 0.52,
      pose: createPose({
        hipPos: [0, 0.92, 0.08],
        pelvisRot: [-0.08, 0.2, 0.03],
        spineRot: [0.12, -0.1, 0],
        headRot: [-0.08, 0, 0],
        lShoulderRot: [-0.82, 0.15, 0.26],
        lElbowRot: [-1.75, 0, 0],
        rShoulderRot: [-0.65, -0.15, -0.32],
        rElbowRot: [-1.7, 0, 0],
        lHipRot: [-0.12, 0, 0.05],
        lKneeRot: [0.24, 0, 0],
        rHipRot: [-1.35, 0, -0.05],
        rKneeRot: [0.06, 0, 0],
        rAnkleRot: [-0.28, 0, 0],
      }),
    },
    {
      t: 0.74,
      pose: createPose({
        hipPos: [0, 0.89, 0.05],
        rHipRot: [-0.65, 0, -0.06],
        rKneeRot: [0.85, 0, 0],
      }),
    },
    { t: 1, pose: GUARD_POSE },
  ],

  'momtong-jireugi': [
    { t: 0, pose: GUARD_POSE },
    {
      t: 0.24,
      pose: createPose({
        hipPos: [0, 0.84, 0],
        pelvisRot: [0.04, 0.25, 0],
        spineRot: [0.04, 0.08, 0],
        chestRot: [0.03, 0.08, 0],
        lShoulderRot: [-1.42, 0.05, 0.06],
        lElbowRot: [-0.18, 0, 0],
        rShoulderRot: [0.42, 0, -0.18],
        rElbowRot: [-1.62, 0, 0],
        lHipRot: [-0.48, 0.08, 0.1],
        lKneeRot: [0.68, 0, 0],
        rHipRot: [0.3, -0.05, -0.1],
        rKneeRot: [0.3, 0, 0],
      }),
    },
    {
      t: 0.52,
      pose: createPose({
        hipPos: [0, 0.82, 0.08],
        pelvisRot: [0.06, -0.18, 0],
        spineRot: [0.05, -0.14, 0],
        chestRot: [0.04, -0.16, 0],
        headRot: [-0.06, 0.25, 0],
        lShoulderRot: [0.46, 0, 0.18],
        lElbowRot: [-1.68, 0, 0],
        rShoulderRot: [-1.52, -0.08, -0.04],
        rElbowRot: [-0.08, 0, 0],
        lHipRot: [-0.52, 0.08, 0.12],
        lKneeRot: [0.76, 0, 0],
        lAnkleRot: [-0.24, 0, 0],
        rHipRot: [0.36, -0.05, -0.12],
        rKneeRot: [0.22, 0, 0],
        rAnkleRot: [-0.36, 0, 0],
      }),
    },
    {
      t: 0.76,
      pose: createPose({
        hipPos: [0, 0.84, 0.06],
        pelvisRot: [0.05, -0.12, 0],
        lShoulderRot: [0.42, 0, 0.18],
        lElbowRot: [-1.65, 0, 0],
        rShoulderRot: [-1.45, -0.08, -0.04],
        rElbowRot: [-0.12, 0, 0],
        lHipRot: [-0.48, 0.08, 0.1],
        lKneeRot: [0.68, 0, 0],
      }),
    },
    { t: 1, pose: GUARD_POSE },
  ],

  'arae-makgi': [
    { t: 0, pose: GUARD_POSE },
    {
      t: 0.25,
      pose: createPose({
        hipPos: [0, 0.85, 0],
        pelvisRot: [0.04, -0.22, 0],
        spineRot: [0.04, -0.1, 0],
        lShoulderRot: [-1.25, -0.15, 0.12],
        lElbowRot: [-0.45, 0, 0],
        rShoulderRot: [-1.35, 0.85, 0.42],
        rElbowRot: [-1.65, 0, 0],
        lHipRot: [-0.45, 0.08, 0.1],
        lKneeRot: [0.65, 0, 0],
        rHipRot: [0.3, -0.06, -0.1],
        rKneeRot: [0.28, 0, 0],
      }),
    },
    {
      t: 0.52,
      pose: createPose({
        hipPos: [0, 0.82, 0.06],
        pelvisRot: [0.06, -0.28, 0],
        spineRot: [0.04, -0.15, 0],
        headRot: [-0.04, 0.28, 0],
        lShoulderRot: [0.46, 0, 0.18],
        lElbowRot: [-1.68, 0, 0],
        rShoulderRot: [-0.55, -0.12, -0.16],
        rElbowRot: [-0.35, 0, 0],
        lHipRot: [-0.5, 0.08, 0.12],
        lKneeRot: [0.74, 0, 0],
        rHipRot: [0.36, -0.06, -0.12],
        rKneeRot: [0.24, 0, 0],
      }),
    },
    {
      t: 0.76,
      pose: createPose({
        hipPos: [0, 0.84, 0.04],
        pelvisRot: [0.05, -0.2, 0],
        lShoulderRot: [0.44, 0, 0.18],
        lElbowRot: [-1.66, 0, 0],
        rShoulderRot: [-0.55, -0.12, -0.16],
        rElbowRot: [-0.36, 0, 0],
      }),
    },
    { t: 1, pose: GUARD_POSE },
  ],

  'eolgul-makgi': [
    { t: 0, pose: GUARD_POSE },
    {
      t: 0.25,
      pose: createPose({
        hipPos: [0, 0.85, 0],
        pelvisRot: [0.04, -0.18, 0],
        lShoulderRot: [-1.3, 0.1, 0.15],
        lElbowRot: [-0.55, 0, 0],
        rShoulderRot: [-0.75, 0.82, 0.35],
        rElbowRot: [-1.55, 0, 0],
        lHipRot: [-0.45, 0.08, 0.1],
        lKneeRot: [0.65, 0, 0],
      }),
    },
    {
      t: 0.52,
      pose: createPose({
        hipPos: [0, 0.83, 0.06],
        pelvisRot: [0.05, -0.26, 0],
        spineRot: [0.02, -0.14, 0],
        headRot: [-0.04, 0.24, 0],
        lShoulderRot: [0.46, 0, 0.18],
        lElbowRot: [-1.68, 0, 0],
        rShoulderRot: [-2.42, -0.25, -0.18],
        rElbowRot: [-1.32, 0, 0],
        lHipRot: [-0.5, 0.08, 0.12],
        lKneeRot: [0.74, 0, 0],
        rHipRot: [0.36, -0.06, -0.12],
        rKneeRot: [0.24, 0, 0],
      }),
    },
    {
      t: 0.76,
      pose: createPose({
        hipPos: [0, 0.85, 0.04],
        pelvisRot: [0.04, -0.2, 0],
        lShoulderRot: [0.44, 0, 0.18],
        lElbowRot: [-1.66, 0, 0],
        rShoulderRot: [-2.38, -0.24, -0.18],
        rElbowRot: [-1.3, 0, 0],
      }),
    },
    { t: 1, pose: GUARD_POSE },
  ],
};

function smoothStepAlpha(a: number): number {
  return a * a * (3 - 2 * a);
}

function lerpTuple(
  a: [number, number, number],
  b: [number, number, number],
  alpha: number,
  out: [number, number, number],
) {
  out[0] = THREE.MathUtils.lerp(a[0], b[0], alpha);
  out[1] = THREE.MathUtils.lerp(a[1], b[1], alpha);
  out[2] = THREE.MathUtils.lerp(a[2], b[2], alpha);
}

export function createEmptyPose(): JointPose {
  return {
    hipPos: [0, 0.9, 0],
    pelvisRot: [0, 0, 0],
    spineRot: [0, 0, 0],
    chestRot: [0, 0, 0],
    headRot: [0, 0, 0],
    lShoulderRot: [0, 0, 0],
    lElbowRot: [0, 0, 0],
    rShoulderRot: [0, 0, 0],
    rElbowRot: [0, 0, 0],
    lHipRot: [0, 0, 0],
    lKneeRot: [0, 0, 0],
    lAnkleRot: [0, 0, 0],
    rHipRot: [0, 0, 0],
    rKneeRot: [0, 0, 0],
    rAnkleRot: [0, 0, 0],
  };
}

export function evaluateTechniquePose(
  techniqueId: string,
  normalizedTime: number,
  outPose: JointPose,
): JointPose {
  const frames = TECHNIQUE_KEYFRAMES[techniqueId] ?? TECHNIQUE_KEYFRAMES['ap-chagi'];
  const t = THREE.MathUtils.clamp(normalizedTime, 0, 1);

  let prev = frames[0];
  let next = frames[frames.length - 1];

  for (let i = 0; i < frames.length - 1; i++) {
    if (t >= frames[i].t && t <= frames[i + 1].t) {
      prev = frames[i];
      next = frames[i + 1];
      break;
    }
  }

  const span = Math.max(0.0001, next.t - prev.t);
  const alpha = smoothStepAlpha((t - prev.t) / span);

  lerpTuple(prev.pose.hipPos, next.pose.hipPos, alpha, outPose.hipPos);
  lerpTuple(prev.pose.pelvisRot, next.pose.pelvisRot, alpha, outPose.pelvisRot);
  lerpTuple(prev.pose.spineRot, next.pose.spineRot, alpha, outPose.spineRot);
  lerpTuple(prev.pose.chestRot, next.pose.chestRot, alpha, outPose.chestRot);
  lerpTuple(prev.pose.headRot, next.pose.headRot, alpha, outPose.headRot);
  lerpTuple(prev.pose.lShoulderRot, next.pose.lShoulderRot, alpha, outPose.lShoulderRot);
  lerpTuple(prev.pose.lElbowRot, next.pose.lElbowRot, alpha, outPose.lElbowRot);
  lerpTuple(prev.pose.rShoulderRot, next.pose.rShoulderRot, alpha, outPose.rShoulderRot);
  lerpTuple(prev.pose.rElbowRot, next.pose.rElbowRot, alpha, outPose.rElbowRot);
  lerpTuple(prev.pose.lHipRot, next.pose.lHipRot, alpha, outPose.lHipRot);
  lerpTuple(prev.pose.lKneeRot, next.pose.lKneeRot, alpha, outPose.lKneeRot);
  lerpTuple(prev.pose.lAnkleRot, next.pose.lAnkleRot, alpha, outPose.lAnkleRot);
  lerpTuple(prev.pose.rHipRot, next.pose.rHipRot, alpha, outPose.rHipRot);
  lerpTuple(prev.pose.rKneeRot, next.pose.rKneeRot, alpha, outPose.rKneeRot);
  lerpTuple(prev.pose.rAnkleRot, next.pose.rAnkleRot, alpha, outPose.rAnkleRot);

  return outPose;
}

export function computeBiomechanicsFromPose(
  pose: JointPose,
  phaseLabel: string,
  limbSpeedMs: number,
  activeLimbY: number,
): LiveBiomechanics {
  const isKick =
    Math.abs(pose.rHipRot[0]) > 0.6 || Math.abs(pose.rHipRot[2]) > 0.5;
  const kneeFlexRad = isKick ? pose.rKneeRot[0] : Math.abs(pose.rElbowRot[0]);
  const kneeAngleDeg = Math.round(
    THREE.MathUtils.clamp(180 - THREE.MathUtils.radToDeg(kneeFlexRad), 35, 178),
  );
  const hipRotationDeg = Math.round(
    Math.abs(THREE.MathUtils.radToDeg(pose.pelvisRot[1])),
  );
  const strikeHeightCm = Math.round(THREE.MathUtils.clamp(activeLimbY * 100, 12, 198));
  const leanPenalty = (Math.abs(pose.spineRot[0]) + Math.abs(pose.spineRot[2])) * 14;
  const balanceScorePct = Math.round(
    THREE.MathUtils.clamp(98 - leanPenalty, 74, 99),
  );

  return {
    phaseLabel,
    kneeAngleDeg,
    hipRotationDeg,
    strikeHeightCm,
    limbVelocityMs: Number(limbSpeedMs.toFixed(1)),
    balanceScorePct,
  };
}
