'use client';

import React, { useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';

type WheelTouchScale = 'compact' | 'standard' | 'large';

export interface SteeringWheelProps {
  variant: 'steer' | 'lane' | 'omni' | 'hop';
  touchScale: WheelTouchScale;
  accentHex?: string;
  label?: string;
  /** Emits the wheel's current rotation angle in degrees on every turn/release. */
  onRotate?: (angleDeg: number) => void;
  /** Called in 'steer' mode with -1 (left), 0 (center), 1 (right). */
  onSteer?: (dir: -1 | 0 | 1) => void;
  /** Called in 'lane' mode whenever the wheel is turned left (-1) or right (+1). */
  onStep?: (delta: -1 | 1) => void;
  /** Called in 'omni' mode with normalized movement vector (dx, dy). */
  onVector?: (dx: number, dy: number) => void;
  /** Called in 'hop' mode with discrete grid hop (dCol, dRow). */
  onHop?: (dCol: number, dRow: number) => void;
}

function getWheelSizeClass(scale: WheelTouchScale): string {
  if (scale === 'compact') return 'h-16 w-16';
  if (scale === 'large') return 'h-24 w-24 sm:h-28 sm:w-28';
  return 'h-20 w-20 sm:h-24 sm:w-24';
}

export function SteeringWheel({
  variant,
  touchScale,
  accentHex = '#FACC15',
  label = 'Steering Wheel',
  onRotate,
  onSteer,
  onStep,
  onVector,
  onHop,
}: SteeringWheelProps) {
  const [angleDeg, setAngleDeg] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const activePointerIdRef = useRef<number | null>(null);
  const centerRef = useRef({ x: 0, y: 0 });
  const startRef = useRef({ x: 0, y: 0 });
  const lastSteerRef = useRef<-1 | 0 | 1>(0);
  const lastHopKeyRef = useRef<string | null>(null);

  const sizeCls = getWheelSizeClass(touchScale);

  const updateAngle = (nextDeg: number) => {
    setAngleDeg(nextDeg);
    onRotate?.(nextDeg);
  };

  const applySteerFromCoords = (clientX: number, isInitial: boolean) => {
    const dxCenter = clientX - centerRef.current.x;
    const dxDrag = clientX - startRef.current.x;
    const effectiveDx = Math.abs(dxCenter) >= 5 ? dxCenter : dxDrag;

    if (Math.abs(effectiveDx) < 5) {
      updateAngle(effectiveDx * 4);
      if (variant === 'steer' && lastSteerRef.current !== 0) {
        lastSteerRef.current = 0;
        onSteer?.(0);
      }
      if (variant === 'lane' && !isInitial) {
        lastSteerRef.current = 0;
      }
      return;
    }

    const dir: -1 | 1 = effectiveDx < 0 ? -1 : 1;
    const clampedDeg = Math.max(-58, Math.min(58, (effectiveDx / 26) * 56));
    const displayDeg = isInitial && Math.abs(clampedDeg) < 36 ? dir * 44 : clampedDeg;
    updateAngle(displayDeg);

    if (variant === 'steer') {
      if (lastSteerRef.current !== dir) {
        lastSteerRef.current = dir;
        onSteer?.(dir);
      }
    } else if (variant === 'lane') {
      if (lastSteerRef.current !== dir) {
        lastSteerRef.current = dir;
        onStep?.(dir);
      }
    }
  };

  const applyOmniFromCoords = (clientX: number, clientY: number, isInitial: boolean) => {
    const dxCenter = clientX - centerRef.current.x;
    const dyCenter = clientY - centerRef.current.y;
    const dxDrag = clientX - startRef.current.x;
    const dyDrag = clientY - startRef.current.y;

    const distCenter = Math.hypot(dxCenter, dyCenter);
    const distDrag = Math.hypot(dxDrag, dyDrag);

    const useDrag = distCenter < 5 && distDrag >= 5;
    const dx = useDrag ? dxDrag : dxCenter;
    const dy = useDrag ? dyDrag : dyCenter;
    const dist = Math.hypot(dx, dy);

    if (variant === 'omni') {
      if (dist < 4) {
        if (!isInitial) {
          onVector?.(0, 0);
        }
        return;
      }
      const nx = dx / dist;
      const ny = dy / dist;
      const deg = (Math.atan2(ny, nx) * 180) / Math.PI + 90;
      updateAngle(deg);
      onVector?.(nx, ny);
      return;
    }

    // 'hop' discrete 4-way quadrant steering
    if (dist < 5) {
      if (isInitial) {
        lastHopKeyRef.current = '0,-1';
        updateAngle(0);
        onHop?.(0, -1);
      }
      return;
    }

    let dCol = 0;
    let dRow = 0;
    let deg = 0;
    if (Math.abs(dx) > Math.abs(dy)) {
      dCol = dx > 0 ? 1 : -1;
      deg = dx > 0 ? 90 : -90;
    } else {
      dRow = dy > 0 ? 1 : -1;
      deg = dy > 0 ? 180 : 0;
    }
    const key = `${dCol},${dRow}`;
    updateAngle(deg);
    if (isInitial || lastHopKeyRef.current !== key) {
      lastHopKeyRef.current = key;
      onHop?.(dCol, dRow);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (activePointerIdRef.current !== null) return;

    const rect = e.currentTarget.getBoundingClientRect();
    centerRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    startRef.current = { x: e.clientX, y: e.clientY };
    activePointerIdRef.current = e.pointerId;
    lastSteerRef.current = 0;
    lastHopKeyRef.current = null;
    setIsActive(true);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore synthetic events without active pointer
    }

    if (variant === 'steer' || variant === 'lane') {
      applySteerFromCoords(e.clientX, true);
    } else {
      applyOmniFromCoords(e.clientX, e.clientY, true);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();

    if (variant === 'steer' || variant === 'lane') {
      applySteerFromCoords(e.clientX, false);
    } else {
      applyOmniFromCoords(e.clientX, e.clientY, false);
    }
  };

  const releasePointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();

    activePointerIdRef.current = null;
    lastSteerRef.current = 0;
    lastHopKeyRef.current = null;
    setIsActive(false);
    updateAngle(0);

    if (variant === 'steer') {
      onSteer?.(0);
    } else if (variant === 'omni') {
      onVector?.(0, 0);
    }
  };

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuenow={Math.round(angleDeg)}
      aria-valuemin={-180}
      aria-valuemax={180}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={releasePointer}
      onPointerCancel={releasePointer}
      onLostPointerCapture={releasePointer}
      className={`relative ${sizeCls} rounded-full touch-none select-none cursor-grab active:cursor-grabbing shrink-0 drop-shadow-[0_4px_0_rgba(0,0,0,0.45)]`}
    >
      {/* Rotating Chunky Black 3-Spoke Racing Wheel */}
      <div
        className={`relative h-full w-full rounded-full flex items-center justify-center ${
          isActive ? 'transition-none' : 'transition-transform duration-150 ease-out'
        }`}
        style={{ transform: `rotate(${angleDeg}deg)` }}
      >
        {/* Thick Matte-Black Outer Tire Rim (transparent center cutouts show track underneath!) */}
        <div
          className="absolute inset-0 rounded-full border-[11px] sm:border-[13px] border-[#181A20] shadow-[inset_0_2px_0_rgba(255,255,255,0.16)]"
          style={{
            boxShadow: isActive
              ? `0 0 0 2.5px ${accentHex}, inset 0 2px 0 rgba(255,255,255,0.22)`
              : '0 0 0 2px #090A0D, inset 0 2px 0 rgba(255,255,255,0.14)',
          }}
        />

        {/* Top 12-o'clock White Directional Pointer Arrow */}
        <div className="absolute top-[1px] left-1/2 -translate-x-1/2 z-20 flex items-center justify-center pointer-events-none">
          <ArrowUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white stroke-[3.2] drop-shadow-[0_1px_0_#000]" />
        </div>

        {/* Left & Right Angled Racing Spokes */}
        <div className="absolute left-[9px] right-[9px] top-[46%] -translate-y-1/2 h-3 sm:h-3.5 rounded-full bg-[#181A20] border-y border-[#090A0D] pointer-events-none" />

        {/* Wide Bottom T-Spoke */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[48%] bottom-[8px] w-4 sm:w-5 rounded-b-lg bg-[#181A20] border-x border-[#090A0D] pointer-events-none" />

        {/* Center Black Hub Housing + Glossy Player-Colored Horn Cap */}
        <div className="relative z-10 h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-[#181A20] border-2 border-[#090A0D] flex items-center justify-center shadow-md pointer-events-none">
          <div
            className="h-5 w-5 sm:h-6 sm:w-6 rounded-full border-2 border-[#090A0D] shadow-[inset_0_2px_0_rgba(255,255,255,0.45)]"
            style={{ backgroundColor: accentHex }}
          />
        </div>
      </div>
    </div>
  );
}
