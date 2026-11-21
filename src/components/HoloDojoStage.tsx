import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Eye,
  MessageSquare,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  User,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  KYORUGI_MATCH_SEQUENCE,
  POOMSAE_DEMO_SEQUENCE,
} from '../data/techniques';
import {
  CameraPreset,
  DojoArenaMode,
  HoloViewMode,
  InstructorGender,
  LiveBiomechanics,
  PlaybackSpeed,
  TechniqueDefinition,
} from '../types/taekwondo';
import {
  applyPoseToCharacter,
  buildTaekwondoCharacter,
  CharacterRig,
  setCharacterAppearance,
} from '../three/characterBuilder';
import { buildDojoEnvironment, DojoEnvironment } from '../three/dojoEnvironment';
import {
  computeBiomechanicsFromPose,
  createEmptyPose,
  evaluateTechniquePose,
} from '../three/poseEngine';
import { audioEngine } from '../utils/audioEngine';

interface HoloDojoStageProps {
  arenaMode: DojoArenaMode;
  technique: TechniqueDefinition;
  instructor: InstructorGender;
  onInstructorChange: (gender: InstructorGender) => void;
  viewMode: HoloViewMode;
  onViewModeChange: (mode: HoloViewMode) => void;
  showTrail: boolean;
  onShowTrailChange: (show: boolean) => void;
  showVisor: boolean;
  onShowVisorChange: (show: boolean) => void;
  speed: PlaybackSpeed;
  onSpeedChange: (speed: PlaybackSpeed) => void;
  isPlaying: boolean;
  onPlayingChange: (playing: boolean) => void;
  scrubTime: number | null;
  onScrubTimeChange: (t: number | null) => void;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  onSpeakCurrent: () => void;
  onProgressTick: (t: number, biomechanics: LiveBiomechanics) => void;
}

const CAMERA_PRESETS: Record<
  CameraPreset,
  { label: string; pos: [number, number, number]; target: [number, number, number] }
> = {
  dojo: { label: 'Front Dojo', pos: [0.35, 1.38, 3.45], target: [0, 0.95, 0] },
  angle45: { label: '45° Angle', pos: [2.45, 1.48, 2.55], target: [0, 0.95, 0] },
  side: { label: 'Side Profile', pos: [3.35, 1.25, 0.15], target: [0, 0.95, 0.1] },
  overhead: { label: 'Footwork', pos: [0.1, 3.4, 1.95], target: [0, 0.4, 0.15] },
};

// Pre-allocated math objects for zero-GC animation loop
const _limbPos = new THREE.Vector3();
const _prevLimbPos = new THREE.Vector3();
const _camGoalPos = new THREE.Vector3();
const _camGoalTarget = new THREE.Vector3();
const _trailPool: THREE.Vector3[] = Array.from(
  { length: 48 },
  () => new THREE.Vector3(),
);

export const HoloDojoStage: React.FC<HoloDojoStageProps> = ({
  arenaMode,
  technique,
  instructor,
  onInstructorChange,
  viewMode,
  onViewModeChange,
  showTrail,
  onShowTrailChange,
  showVisor,
  onShowVisorChange,
  speed,
  onSpeedChange,
  isPlaying,
  onPlayingChange,
  scrubTime,
  onScrubTimeChange,
  voiceEnabled,
  onToggleVoice,
  onSpeakCurrent,
  onProgressTick,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('angle45');
  const [hudVisible, setHudVisible] = useState(true);
  const [muted, setMuted] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [activePhaseText, setActivePhaseText] = useState(technique.phases[0].label);

  // Kyorugi & Poomsae Live Scoreboard / Sequence HUD states
  const [kyorugiState, setKyorugiState] = useState({
    blueScore: 0,
    redScore: 0,
    exchangeIdx: 0,
    lastHit: 'Awaiting Exchange',
  });
  const [poomsaeStepIdx, setPoomsaeStepIdx] = useState(0);

  // Refs synced to animation loop without re-creating WebGL context
  const stateRef = useRef({
    arenaMode,
    technique,
    instructor,
    viewMode,
    showTrail,
    showVisor,
    speed,
    isPlaying,
    scrubTime,
    voiceEnabled,
    onProgressTick,
  });

  stateRef.current = {
    arenaMode,
    technique,
    instructor,
    viewMode,
    showTrail,
    showVisor,
    speed,
    isPlaying,
    scrubTime,
    voiceEnabled,
    onProgressTick,
  };

  const cameraTransitionRef = useRef<{
    active: boolean;
    pos: [number, number, number];
    target: [number, number, number];
  }>({
    active: false,
    pos: CAMERA_PRESETS.angle45.pos,
    target: CAMERA_PRESETS.angle45.target,
  });

  const primaryRigRef = useRef<CharacterRig | null>(null);
  const opponentRigRef = useRef<CharacterRig | null>(null);
  const trailCountRef = useRef(0);
  const animTimeRef = useRef(0);
  const lastTechniqueIdRef = useRef(technique.id);
  const lastAudioPhaseRef = useRef<'idle' | 'whoosh' | 'impact'>('idle');
  const kyorugiExchangeRef = useRef(0);
  const kyorugiScoredThisCycleRef = useRef(false);
  const poomsaeIdxRef = useRef(0);

  // Reset timers & camera framing cleanly when switching Arena Mode
  useEffect(() => {
    animTimeRef.current = 0;
    trailCountRef.current = 0;
    lastAudioPhaseRef.current = 'idle';
    kyorugiExchangeRef.current = 0;
    kyorugiScoredThisCycleRef.current = false;
    poomsaeIdxRef.current = 0;
    setPoomsaeStepIdx(0);
    setKyorugiState({
      blueScore: 0,
      redScore: 0,
      exchangeIdx: 0,
      lastHit: KYORUGI_MATCH_SEQUENCE[0].title,
    });

    if (arenaMode === 'kyorugi') {
      cameraTransitionRef.current = {
        active: true,
        pos: [2.75, 1.55, 2.7],
        target: [0, 0.95, 0],
      };
      if (stateRef.current.voiceEnabled) {
        audioEngine.speakCoach(
          'Virtual Kyorugi Match Demonstration! Watch Blue Cheong and Red Hong score using biomechanical hitboxes.',
          stateRef.current.instructor,
        );
      }
    } else if (arenaMode === 'poomsae') {
      cameraTransitionRef.current = {
        active: true,
        pos: CAMERA_PRESETS.angle45.pos,
        target: CAMERA_PRESETS.angle45.target,
      };
      if (stateRef.current.voiceEnabled) {
        audioEngine.speakCoach(
          POOMSAE_DEMO_SEQUENCE[0].voiceCue,
          stateRef.current.instructor,
        );
      }
    } else {
      cameraTransitionRef.current = {
        active: true,
        pos: CAMERA_PRESETS[cameraPreset].pos,
        target: CAMERA_PRESETS[cameraPreset].target,
      };
    }
  }, [arenaMode]);

  useEffect(() => {
    if (lastTechniqueIdRef.current !== technique.id) {
      lastTechniqueIdRef.current = technique.id;
      animTimeRef.current = 0;
      trailCountRef.current = 0;
      lastAudioPhaseRef.current = 'idle';
    }
  }, [technique.id]);

  // Sync character appearance immediately
  useEffect(() => {
    const primary = primaryRigRef.current;
    const opponent = opponentRigRef.current;
    if (primary) {
      setCharacterAppearance(primary, instructor, viewMode, showVisor);
      primary.setArmorSide(arenaMode === 'kyorugi' ? 'blue' : 'none');
    }
    if (opponent) {
      opponent.root.visible = arenaMode === 'kyorugi';
      setCharacterAppearance(
        opponent,
        instructor === 'male' ? 'female' : 'male',
        viewMode,
        showVisor,
      );
      opponent.setArmorSide(arenaMode === 'kyorugi' ? 'red' : 'none');
    }
  }, [instructor, viewMode, showVisor, arenaMode]);

  // Keyboard shortcut H to toggle HUD drawer
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === 'h' &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        setHudVisible((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Main Three.js WebGL initialization (runs once)
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 320);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070b12);
    scene.fog = new THREE.FogExp2(0x070b12, 0.058);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 60);
    camera.position.set(...CAMERA_PRESETS.angle45.pos);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.14;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 0.9);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e0, 1.9);
    keyLight.position.set(3.2, 5.4, 3.8);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 18;
    const d = 3.5;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x22d3ee, 1.35);
    rimLight.position.set(-2.8, 3.0, -3.4);
    scene.add(rimLight);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const dojo: DojoEnvironment = buildDojoEnvironment(maxAniso);
    scene.add(dojo.group);

    // Primary 3D Instructor / Blue Fighter
    const primaryRig: CharacterRig = buildTaekwondoCharacter();
    primaryRigRef.current = primaryRig;
    setCharacterAppearance(
      primaryRig,
      stateRef.current.instructor,
      stateRef.current.viewMode,
      stateRef.current.showVisor,
    );
    primaryRig.setArmorSide(stateRef.current.arenaMode === 'kyorugi' ? 'blue' : 'none');
    scene.add(primaryRig.root);

    // Secondary 3D Fighter (Red Hong for Kyorugi Competition Demo)
    const opponentRig: CharacterRig = buildTaekwondoCharacter();
    opponentRigRef.current = opponentRig;
    opponentRig.root.visible = stateRef.current.arenaMode === 'kyorugi';
    opponentRig.root.position.set(0, 0, 1.55);
    opponentRig.root.rotation.y = Math.PI;
    opponentRig.setArmorSide('red');
    scene.add(opponentRig.root);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...CAMERA_PRESETS.angle45.target);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 2.0;
    controls.maxDistance = 6.4;
    controls.minPolarAngle = 0.25;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.enablePan = false;

    const cancelCameraTransition = () => {
      cameraTransitionRef.current.active = false;
    };
    controls.addEventListener('start', cancelCameraTransition);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.max(entry.contentRect.width, 280);
      const h = Math.max(entry.contentRect.height, 260);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    const workingPose = createEmptyPose();
    const opponentPose = createEmptyPose();
    let frameId = 0;
    let disposed = false;
    let lastPerfTime = performance.now();
    let lastTelemetryPush = 0;
    let hasPrevLimb = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (status === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;

      const now = performance.now();
      const rawDt = Math.min((now - lastPerfTime) / 1000, 0.08);
      lastPerfTime = now;
      const elapsedSec = now * 0.001;

      const s = stateRef.current;
      const cycleDuration =
        s.arenaMode === 'kyorugi' ? 2.6 : s.arenaMode === 'poomsae' ? 3.2 : 2.4;

      if (s.scrubTime !== null && s.arenaMode === 'technique') {
        animTimeRef.current = s.scrubTime;
      } else if (s.isPlaying) {
        const nextT = animTimeRef.current + (rawDt * s.speed) / cycleDuration;
        if (nextT >= 1) {
          animTimeRef.current = nextT % 1;
          trailCountRef.current = 0;
          lastAudioPhaseRef.current = 'idle';

          if (s.arenaMode === 'kyorugi') {
            kyorugiScoredThisCycleRef.current = false;
            kyorugiExchangeRef.current =
              (kyorugiExchangeRef.current + 1) % KYORUGI_MATCH_SEQUENCE.length;
            const nextEx = KYORUGI_MATCH_SEQUENCE[kyorugiExchangeRef.current];
            if (s.voiceEnabled) {
              audioEngine.speakCoach(nextEx.commentary, s.instructor, 1.05);
            }
          } else if (s.arenaMode === 'poomsae') {
            poomsaeIdxRef.current =
              (poomsaeIdxRef.current + 1) % POOMSAE_DEMO_SEQUENCE.length;
            setPoomsaeStepIdx(poomsaeIdxRef.current);
            const nextStep = POOMSAE_DEMO_SEQUENCE[poomsaeIdxRef.current];
            if (s.voiceEnabled) {
              audioEngine.speakCoach(nextStep.voiceCue, s.instructor, 1.02);
            }
          }
        } else {
          animTimeRef.current = nextT;
        }
      }

      const normT = animTimeRef.current;
      let activeTech = s.technique;
      let activeLimb = s.technique.activeLimb;

      if (s.arenaMode === 'technique') {
        primaryRig.root.position.set(0, 0, 0);
        primaryRig.root.rotation.y = 0;
        opponentRig.root.visible = false;

        if (s.isPlaying && s.scrubTime === null) {
          if (normT >= 0.3 && normT < 0.45 && lastAudioPhaseRef.current === 'idle') {
            lastAudioPhaseRef.current = 'whoosh';
            audioEngine.playWhoosh();
          } else if (normT >= 0.48 && normT < 0.6 && lastAudioPhaseRef.current === 'whoosh') {
            lastAudioPhaseRef.current = 'impact';
            audioEngine.playImpactSnap();
          }
        }

        evaluateTechniquePose(activeTech.id, normT, workingPose);
        applyPoseToCharacter(primaryRig, workingPose, elapsedSec);
      } else if (s.arenaMode === 'poomsae') {
        primaryRig.root.position.set(0, 0, 0);
        primaryRig.root.rotation.y = 0;
        opponentRig.root.visible = false;

        const step = POOMSAE_DEMO_SEQUENCE[poomsaeIdxRef.current];
        if (s.isPlaying) {
          if (normT >= 0.3 && normT < 0.45 && lastAudioPhaseRef.current === 'idle') {
            lastAudioPhaseRef.current = 'whoosh';
            audioEngine.playWhoosh();
          } else if (normT >= 0.48 && normT < 0.6 && lastAudioPhaseRef.current === 'whoosh') {
            lastAudioPhaseRef.current = 'impact';
            audioEngine.playImpactSnap();
          }
        }
        evaluateTechniquePose(step.techniqueId, normT, workingPose);
        applyPoseToCharacter(primaryRig, workingPose, elapsedSec);
      } else {
        // Kyorugi 2-Fighter Sparring Arena Mode
        const ex = KYORUGI_MATCH_SEQUENCE[kyorugiExchangeRef.current];
        opponentRig.root.visible = true;

        // Subtle footwork bounce closure on exchange
        const engageCurve = Math.sin(normT * Math.PI);
        primaryRig.root.position.set(0, 0, -0.78 + engageCurve * 0.24);
        primaryRig.root.rotation.y = 0;
        opponentRig.root.position.set(0, 0, 0.78 - engageCurve * 0.24);
        opponentRig.root.rotation.y = Math.PI;

        evaluateTechniquePose(ex.blueTechId, normT, workingPose);
        evaluateTechniquePose(ex.redTechId, Math.max(0, normT - 0.08), opponentPose);

        applyPoseToCharacter(primaryRig, workingPose, elapsedSec);
        applyPoseToCharacter(opponentRig, opponentPose, elapsedSec + 1.2);

        if (s.isPlaying && normT >= 0.49 && !kyorugiScoredThisCycleRef.current) {
          kyorugiScoredThisCycleRef.current = true;
          audioEngine.playScoreChime();
          setKyorugiState((prev) => ({
            blueScore:
              ex.scoringFighter === 'blue'
                ? prev.blueScore + ex.pointsAwarded
                : prev.blueScore,
            redScore:
              ex.scoringFighter === 'red'
                ? prev.redScore + ex.pointsAwarded
                : prev.redScore,
            exchangeIdx: kyorugiExchangeRef.current,
            lastHit: `${ex.scoringFighter === 'blue' ? 'BLUE' : 'RED'} · ${ex.scoringZone}`,
          }));
        }
      }

      primaryRig.root.updateMatrixWorld(true);
      if (opponentRig.root.visible) {
        opponentRig.root.updateMatrixWorld(true);
      }

      primaryRig.holoUniforms.uTime.value = elapsedSec;
      opponentRig.holoUniforms.uTime.value = elapsedSec;
      const impactPulse = Math.max(0, 1 - Math.abs(normT - 0.51) / 0.11);
      primaryRig.holoUniforms.uImpact.value = impactPulse;
      opponentRig.holoUniforms.uImpact.value = impactPulse;

      // Active limb tracking (tracks attacker in Kyorugi mode!)
      const isRedAttacker =
        s.arenaMode === 'kyorugi' &&
        KYORUGI_MATCH_SEQUENCE[kyorugiExchangeRef.current].attacker === 'red';
      const trackedRig = isRedAttacker ? opponentRig : primaryRig;

      const targetNode =
        activeLimb === 'rightHand'
          ? trackedRig.rHand
          : activeLimb === 'leftHand'
            ? trackedRig.lHand
            : activeLimb === 'leftFoot'
              ? trackedRig.lFootTip
              : trackedRig.rFootTip;

      targetNode.getWorldPosition(_limbPos);

      let limbSpeedMs = 0;
      if (hasPrevLimb && rawDt > 0.001) {
        limbSpeedMs = _limbPos.distanceTo(_prevLimbPos) / rawDt;
      }
      _prevLimbPos.copy(_limbPos);
      hasPrevLimb = true;

      if (s.showTrail) {
        if (s.scrubTime !== null && s.arenaMode === 'technique') {
          const steps = Math.max(2, Math.floor(normT * 36));
          const tempPose = createEmptyPose();
          for (let i = 0; i <= steps; i++) {
            const sampleT = (i / steps) * normT;
            evaluateTechniquePose(s.technique.id, sampleT, tempPose);
            applyPoseToCharacter(primaryRig, tempPose, elapsedSec);
            primaryRig.root.updateMatrixWorld(true);
            targetNode.getWorldPosition(_trailPool[i]);
          }
          applyPoseToCharacter(primaryRig, workingPose, elapsedSec);
          primaryRig.root.updateMatrixWorld(true);
          targetNode.getWorldPosition(_limbPos);
          trailCountRef.current = steps + 1;
        } else if (s.isPlaying) {
          const idx = trailCountRef.current;
          if (idx === 0 || _trailPool[idx - 1].distanceTo(_limbPos) > 0.045) {
            if (idx < _trailPool.length) {
              _trailPool[idx].copy(_limbPos);
              trailCountRef.current = idx + 1;
            } else {
              for (let i = 0; i < _trailPool.length - 1; i++) {
                _trailPool[i].copy(_trailPool[i + 1]);
              }
              _trailPool[_trailPool.length - 1].copy(_limbPos);
            }
          }
        }
        const trailCol =
          s.arenaMode === 'kyorugi'
            ? isRedAttacker
              ? '#EF4444'
              : '#38BDF8'
            : activeTech.trailColor;
        dojo.updateTrail(_trailPool.slice(0, trailCountRef.current), trailCol, true);
      } else {
        dojo.updateTrail([], activeTech.trailColor, false);
      }

      dojo.updateImpact(
        impactPulse > 0.05,
        _limbPos,
        impactPulse,
        s.arenaMode === 'kyorugi'
          ? isRedAttacker
            ? '#EF4444'
            : '#38BDF8'
          : activeTech.trailColor,
      );
      if (dojo.impactRing.visible) {
        dojo.impactRing.lookAt(camera.position);
      }

      // Smooth damped camera preset transitions
      if (cameraTransitionRef.current.active) {
        _camGoalPos.set(...cameraTransitionRef.current.pos);
        _camGoalTarget.set(...cameraTransitionRef.current.target);

        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoalPos.x, 7, rawDt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoalPos.y, 7, rawDt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoalPos.z, 7, rawDt);

        controls.target.x = THREE.MathUtils.damp(controls.target.x, _camGoalTarget.x, 7, rawDt);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _camGoalTarget.y, 7, rawDt);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _camGoalTarget.z, 7, rawDt);

        if (
          camera.position.distanceTo(_camGoalPos) < 0.02 &&
          controls.target.distanceTo(_camGoalTarget) < 0.02
        ) {
          cameraTransitionRef.current.active = false;
        }
      }

      controls.update();
      renderer.render(scene, camera);

      if (now - lastTelemetryPush > 85) {
        lastTelemetryPush = now;
        const currentPhase =
          s.technique.phases.find((p) => normT >= p.startT && normT <= p.endT) ??
          s.technique.phases[0];
        setActivePhaseText(currentPhase.label);
        const bio = computeBiomechanicsFromPose(
          workingPose,
          currentPhase.label,
          s.isPlaying && s.scrubTime === null ? Math.min(limbSpeedMs * 1.4, 14.5) : 0,
          _limbPos.y,
        );
        s.onProgressTick(normT, bio);
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    if (isSoftwareGl) {
      tick();
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener('start', cancelCameraTransition);
      controls.dispose();
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      primaryRig.dispose();
      opponentRig.dispose();
      dojo.dispose();
      envTarget.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      primaryRigRef.current = null;
      opponentRigRef.current = null;
    };
  }, []);

  const handleCameraPreset = (preset: CameraPreset) => {
    setCameraPreset(preset);
    const cfg = CAMERA_PRESETS[preset];
    cameraTransitionRef.current = {
      active: true,
      pos: cfg.pos,
      target: cfg.target,
    };
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    audioEngine.setMuted(next);
  };

  const handleReset = () => {
    animTimeRef.current = 0;
    trailCountRef.current = 0;
    onScrubTimeChange(null);
    onPlayingChange(true);
    handleCameraPreset('angle45');
  };

  const activePoomsaeStep = POOMSAE_DEMO_SEQUENCE[poomsaeStepIdx] ?? POOMSAE_DEMO_SEQUENCE[0];
  const activeKyorugiEx =
    KYORUGI_MATCH_SEQUENCE[kyorugiState.exchangeIdx] ?? KYORUGI_MATCH_SEQUENCE[0];

  return (
    <div className="relative w-full h-[460px] sm:h-[540px] lg:h-[610px] rounded-2xl overflow-hidden border border-slate-800/90 bg-[#070B12]">
      {/* Dedicated WebGL Mount */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {contextLost && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#070B12] p-6 text-center">
          <p className="font-display text-xl font-semibold text-slate-100">
            3D Holographic Viewport Paused
          </p>
          <p className="mt-2 max-w-md text-sm text-slate-400">
            Graphics context was temporarily suspended. Tap below to restore the Holo-Dojo.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition-colors"
          >
            Restore Viewport
          </button>
        </div>
      )}

      {/* Top-Left Contextual Mode Readout (Technique / Kyorugi Scoreboard / Poomsae Callout) */}
      <div className="pointer-events-none absolute top-4 left-4 z-10 max-w-[88%] sm:max-w-sm">
        {arenaMode === 'kyorugi' ? (
          <div className="rounded-xl bg-[#0B111E]/95 px-4 py-3 border border-slate-800">
            <div className="text-[11px] font-semibold text-cyan-400">
              Virtual Kyorugi Match · {activeKyorugiEx.title}
            </div>
            <div className="mt-2 flex items-center gap-4">
              <div>
                <div className="text-[11px] text-sky-400 font-semibold">CHEONG (BLUE)</div>
                <div className="font-mono text-2xl font-bold tabular-nums text-white">
                  {kyorugiState.blueScore}
                </div>
              </div>
              <div className="text-xs text-slate-500 font-mono">VS</div>
              <div>
                <div className="text-[11px] text-rose-400 font-semibold">HONG (RED)</div>
                <div className="font-mono text-2xl font-bold tabular-nums text-white">
                  {kyorugiState.redScore}
                </div>
              </div>
            </div>
            <div className="mt-1.5 text-xs text-amber-300 font-medium">
              {kyorugiState.lastHit}
            </div>
          </div>
        ) : arenaMode === 'poomsae' ? (
          <div className="rounded-xl bg-[#0B111E]/95 px-4 py-3 border border-slate-800">
            <span className="text-xs font-medium text-emerald-400">
              Poomsae Sequence · Step {activePoomsaeStep.stepNumber} of{' '}
              {POOMSAE_DEMO_SEQUENCE.length}
            </span>
            <div className="mt-0.5 font-display text-lg sm:text-xl font-bold text-white">
              {activePoomsaeStep.koreanCallout}
            </div>
            <div className="text-xs text-slate-300">
              {activePoomsaeStep.englishName} · {activePoomsaeStep.stance}
            </div>
          </div>
        ) : (
          <div className="inline-flex flex-col rounded-xl bg-[#0B111E]/92 px-4 py-2.5 border border-slate-800">
            <span className="text-xs font-medium text-cyan-400">
              {technique.koreanName} · {technique.hangul}
            </span>
            <span className="font-display text-lg sm:text-xl font-bold text-slate-50 leading-tight">
              {technique.name}
            </span>
            <span className="mt-0.5 text-xs text-slate-400">
              Phase: {activePhaseText} · Drag to orbit 360°
            </span>
          </div>
        )}
      </div>

      {/* Collapsible Bottom Control Dock */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex flex-col items-center px-3">
        <button
          type="button"
          onClick={() => setHudVisible((v) => !v)}
          className="pointer-events-auto mb-1.5 inline-flex items-center gap-1.5 rounded-t-lg rounded-b-md border border-slate-700/80 bg-[#0B111E]/95 px-3 py-1 text-xs font-medium text-slate-300 hover:text-white transition-colors"
          aria-expanded={hudVisible}
          title="Press H to toggle controls"
        >
          {hudVisible ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          <span>{hudVisible ? 'Hide Controls' : 'Show Controls'}</span>
        </button>

        {hudVisible && (
          <div className="pointer-events-auto w-full max-w-[960px] rounded-xl border border-slate-800 bg-[#0B111E]/95 p-2.5 sm:px-4 sm:py-3 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Playback & Speed */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onScrubTimeChange(null);
                    onPlayingChange(!isPlaying);
                  }}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400 transition-colors whitespace-nowrap shrink-0"
                >
                  {isPlaying && scrubTime === null ? (
                    <>
                      <Pause className="h-3.5 w-3.5" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      <span>Play</span>
                    </>
                  )}
                </button>

                <div className="flex items-center rounded-lg bg-slate-900 p-0.5 border border-slate-800">
                  {([0.25, 0.5, 1] as PlaybackSpeed[]).map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => {
                        onScrubTimeChange(null);
                        onSpeedChange(spd);
                      }}
                      className={`px-2 py-1.5 text-xs font-mono tabular-nums rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        speed === spd
                          ? 'bg-slate-800 text-cyan-300 font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex min-h-[38px] items-center justify-center rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-slate-300 hover:text-white transition-colors"
                  aria-label="Reset camera and animation"
                  title="Reset view"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Instructor Gender Switch */}
              <div className="flex items-center rounded-lg bg-slate-900 p-0.5 border border-slate-800">
                <button
                  type="button"
                  onClick={() => onInstructorChange('male')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    instructor === 'male'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <User className="h-3.5 w-3.5" />
                  <span>Male</span>
                </button>
                <button
                  type="button"
                  onClick={() => onInstructorChange('female')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    instructor === 'female'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <User className="h-3.5 w-3.5" />
                  <span>Female</span>
                </button>
              </div>

              {/* Holographic Skeleton Mode Switch */}
              <div className="flex items-center rounded-lg bg-slate-900 p-0.5 border border-slate-800">
                {(
                  [
                    { id: 'xray', label: 'X-Ray' },
                    { id: 'dobok', label: 'Dobok' },
                    { id: 'skeleton', label: 'Skeleton' },
                  ] as { id: HoloViewMode; label: string }[]
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => onViewModeChange(mode.id)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      viewMode === mode.id
                        ? 'bg-cyan-500/20 text-cyan-300'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              {/* Voice Coach, Trail, Visor, Camera & Audio */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onSpeakCurrent}
                  className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-emerald-500/50 bg-emerald-500/15 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 transition-colors whitespace-nowrap shrink-0"
                  title="Hear coach explain current move"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Explain Move</span>
                </button>

                <button
                  type="button"
                  onClick={onToggleVoice}
                  className={`inline-flex min-h-[36px] items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    voiceEnabled
                      ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-300'
                      : 'border-slate-800 bg-slate-900 text-slate-400'
                  }`}
                >
                  <span>{voiceEnabled ? 'Voice On' : 'Voice Off'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onShowTrailChange(!showTrail)}
                  className={`hidden sm:inline-flex min-h-[36px] items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    showTrail
                      ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-300'
                      : 'border-slate-800 bg-slate-900 text-slate-400'
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Trail</span>
                </button>

                <button
                  type="button"
                  onClick={() => onShowVisorChange(!showVisor)}
                  className={`hidden sm:inline-flex min-h-[36px] items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    showVisor
                      ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                      : 'border-slate-800 bg-slate-900 text-slate-400'
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Visor</span>
                </button>

                <div className="hidden xl:flex items-center rounded-lg bg-slate-900 p-0.5 border border-slate-800">
                  <Camera className="mx-1.5 h-3.5 w-3.5 text-slate-500 shrink-0" />
                  {(Object.keys(CAMERA_PRESETS) as CameraPreset[]).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleCameraPreset(preset)}
                      className={`px-2 py-1 text-xs rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        cameraPreset === preset
                          ? 'bg-slate-800 text-white font-medium'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {CAMERA_PRESETS[preset].label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={toggleMute}
                  className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-slate-300 hover:text-white transition-colors"
                  aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                >
                  {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
