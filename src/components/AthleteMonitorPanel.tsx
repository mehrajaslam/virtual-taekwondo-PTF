import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Eye, X } from 'lucide-react';
import { TechniqueDefinition } from '../types/taekwondo';

interface AthleteMonitorPanelProps {
  technique: TechniqueDefinition;
  onClose: () => void;
}

export const AthleteMonitorPanel: React.FC<AthleteMonitorPanelProps> = ({
  technique,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<'idle' | 'active' | 'denied'>('idle');
  const [mirrorGrid, setMirrorGrid] = useState(true);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState('denied');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraState('active');
    } catch {
      setCameraState('denied');
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const targetLinePercent =
    technique.targetZone.toLowerCase().includes('head') ||
    technique.targetZone.toLowerCase().includes('crown')
      ? 24
      : technique.targetZone.toLowerCase().includes('abdomen') ||
          technique.targetZone.toLowerCase().includes('groin')
        ? 64
        : 42;

  return (
    <div className="relative h-[460px] sm:h-[540px] lg:h-[610px] rounded-2xl overflow-hidden border border-slate-800 bg-[#070B12] flex flex-col justify-between">
      {/* Header Bar */}
      <div className="relative z-10 flex items-center justify-between gap-2 border-b border-slate-800 bg-[#0B111E] px-4 py-2.5">
        <div>
          <p className="text-xs font-semibold text-emerald-400">
            Athlete Form &amp; Posture Monitor
          </p>
          <p className="text-xs text-slate-400 truncate">
            Match your stance to the {technique.name} target line
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMirrorGrid((g) => !g)}
            className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
              mirrorGrid
                ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-300'
                : 'border-slate-700 bg-slate-900 text-slate-400'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Guides</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (cameraState === 'active') {
                stopCamera();
                setCameraState('idle');
              } else {
                startCamera();
              }
            }}
            className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-200 hover:text-white"
          >
            {cameraState === 'active' ? (
              <>
                <CameraOff className="h-3.5 w-3.5" />
                <span>Pause Cam</span>
              </>
            ) : (
              <>
                <Camera className="h-3.5 w-3.5" />
                <span>Enable Cam</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="inline-flex items-center justify-center rounded-md border border-slate-700 bg-slate-900 p-1 text-slate-400 hover:text-white"
            aria-label="Close athlete camera monitor"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Live Video Mirror + Holographic Posture Guide Overlay */}
      <div className="relative flex-1 bg-[#080E1A] overflow-hidden flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`h-full w-full object-cover scale-x-[-1] ${
            cameraState === 'active' ? 'opacity-100' : 'opacity-0 absolute'
          }`}
        />

        {cameraState !== 'active' && (
          <div className="relative z-10 max-w-xs px-5 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-500/10 text-cyan-300">
              <Camera className="h-6 w-6" />
            </div>
            <h3 className="font-display text-base font-bold text-white">
              {cameraState === 'denied'
                ? 'Camera Permission Required'
                : 'Athlete Mirror Paused'}
            </h3>
            <p className="text-xs leading-relaxed text-slate-400">
              Allow browser camera access to see yourself live side-by-side with the 3D
              instructor and holographic alignment guides. Your video stays 100% local on your
              device.
            </p>
            <button
              type="button"
              onClick={startCamera}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 transition-colors"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Retry Camera Mirror</span>
            </button>
          </div>
        )}

        {/* Holographic Calibration Overlay */}
        {mirrorGrid && (
          <div className="pointer-events-none absolute inset-0 z-10">
            {/* Vertical Centerline */}
            <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-cyan-400/35" />

            {/* Target Strike Elevation Line */}
            <div
              className="absolute inset-x-4 border-t border-dashed border-emerald-400/80 transition-all duration-300"
              style={{ top: `${targetLinePercent}%` }}
            >
              <span className="inline-block -translate-y-full rounded bg-[#070B12]/90 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-300">
                TARGET ZONE · {technique.targetZone.toUpperCase()}
              </span>
            </div>

            {/* Hip / Balance Horizon Line */}
            <div
              className="absolute inset-x-4 border-t border-dotted border-amber-400/60"
              style={{ top: '58%' }}
            >
              <span className="inline-block -translate-y-full rounded bg-[#070B12]/90 px-2 py-0.5 font-mono text-[10px] text-amber-300">
                HIP / CHAMBER LINE
              </span>
            </div>

            {/* Stance Mat Box */}
            <div className="absolute bottom-5 left-1/2 h-10 w-44 -translate-x-1/2 rounded-lg border border-cyan-400/40 bg-cyan-500/5 flex items-center justify-center">
              <span className="font-mono text-[10px] text-cyan-300">
                MAT FOOTWORK ZONE
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Guidance Bar */}
      <div className="border-t border-slate-800 bg-[#0B111E] px-4 py-2.5 text-xs text-slate-300 flex items-center justify-between gap-2">
        <span className="truncate">
          Focus: <strong className="text-white">{technique.powerFocus}</strong>
        </span>
        <span className="font-mono text-[11px] text-emerald-400 whitespace-nowrap shrink-0">
          LOCAL PRIVACY · NO UPLOAD
        </span>
      </div>
    </div>
  );
};
