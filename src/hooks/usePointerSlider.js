import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * usePointerSlider — custom hook for pointer drag gestures, scrolling, momentum,
 * snapping, and DOM-direct translation updates for the hourly slider track.
 */
export default function usePointerSlider({
  sortedHourlyLength,
  active,
  dateStr,
  onSliderInteract,
  cardSlotWidth = 70,
}) {
  const [selectedHourIndex, setSelectedHourIndex] = useState(0);
  const sliderContainerRef = useRef(null);
  const sliderTrackRef     = useRef(null);
  const sliderOffsetRef    = useRef(0);
  const dragState          = useRef({ active: false, startX: 0, baseOffset: 0 });
  const velocityState      = useRef({ lastX: 0, lastTime: 0, value: 0 });

  const offsetForIdx = useCallback((idx) => {
    const w = sliderContainerRef.current?.clientWidth ?? 0;
    return w / 2 - idx * cardSlotWidth - cardSlotWidth / 2;
  }, [cardSlotWidth]);

  const applyTrackOffset = useCallback((offset, animated) => {
    const el = sliderTrackRef.current;
    if (!el) return;
    el.style.transition = animated
      ? 'transform 320ms cubic-bezier(0.25, 1, 0.5, 1)'
      : 'none';
    el.style.transform = `translateX(${offset}px)`;
  }, []);

  const snapToNearest = useCallback((currentOff, velPxPerMs) => {
    const container = sliderContainerRef.current;
    if (!container || !sortedHourlyLength) return;

    const center        = container.clientWidth / 2;
    const predictedOff  = currentOff + velPxPerMs * 150;
    const centerInTrack = center - predictedOff;
    const raw           = (centerInTrack - cardSlotWidth / 2) / cardSlotWidth;
    const idx           = Math.max(0, Math.min(Math.round(raw), sortedHourlyLength - 1));
    const targetOff     = offsetForIdx(idx);
    sliderOffsetRef.current = targetOff;
    applyTrackOffset(targetOff, true);
    setSelectedHourIndex(idx);
  }, [sortedHourlyLength, cardSlotWidth, offsetForIdx, applyTrackOffset]);

  // Initialise slider position when active or date changes.
  useEffect(() => {
    const n        = new Date();
    const todayStr = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
    const isToday  = dateStr === todayStr;
    const target   = (isToday && active) ? n.getHours() : 0;
    setSelectedHourIndex(target);
    
    // Use requestAnimationFrame to ensure sliderContainerRef has clientWidth
    requestAnimationFrame(() => {
      const offset = offsetForIdx(target);
      sliderOffsetRef.current = offset;
      applyTrackOffset(offset, false);
    });
  }, [sortedHourlyLength, active, dateStr, offsetForIdx, applyTrackOffset]);

  const handlePointerDown = useCallback((e) => {
    e.stopPropagation();
    onSliderInteract?.(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current     = { active: true, startX: e.clientX, baseOffset: sliderOffsetRef.current };
    velocityState.current = { lastX: e.clientX, lastTime: Date.now(), value: 0 };
  }, [onSliderInteract]);

  const handlePointerMove = useCallback((e) => {
    e.stopPropagation();
    if (!dragState.current.active) return;

    const now = Date.now();
    const dt  = now - velocityState.current.lastTime;
    if (dt > 0) velocityState.current.value = (e.clientX - velocityState.current.lastX) / dt;
    velocityState.current.lastX    = e.clientX;
    velocityState.current.lastTime = now;

    const dx  = e.clientX - dragState.current.startX;
    const off = dragState.current.baseOffset + dx;
    sliderOffsetRef.current = off;
    applyTrackOffset(off, false);

    // Update highlight index during drag for visual feedback
    const container = sliderContainerRef.current;
    if (container) {
      const center = container.clientWidth / 2;
      const raw    = (center - off - cardSlotWidth / 2) / cardSlotWidth;
      const idx    = Math.max(0, Math.min(Math.round(raw), sortedHourlyLength - 1));
      setSelectedHourIndex(idx);
    }
  }, [applyTrackOffset, sortedHourlyLength, cardSlotWidth]);

  const handlePointerUp = useCallback((e) => {
    e.stopPropagation();
    if (!dragState.current.active) return;
    dragState.current.active = false;
    onSliderInteract?.(false);
    snapToNearest(sliderOffsetRef.current, velocityState.current.value);
  }, [onSliderInteract, snapToNearest]);

  const darkness = useMemo(() => {
    const hour = (sortedHourlyLength > 0) ? selectedHourIndex : new Date().getHours();
    return 0.2 + (Math.abs(hour - 12) / 12) * 0.6;
  }, [selectedHourIndex, sortedHourlyLength]);

  return {
    selectedHourIndex,
    setSelectedHourIndex,
    sliderContainerRef,
    sliderTrackRef,
    darkness,
    pointerHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
    },
  };
}
