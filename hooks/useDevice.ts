'use client';

import { useState, useEffect, useCallback } from 'react';

export type DeviceType = 'phone' | 'tablet' | 'desktop';

interface DeviceInfo {
  type: DeviceType;
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  width: number;
}

const BREAKPOINTS = {
  phone: 640,   // < 640px
  tablet: 1024, // 640px - 1023px
  // desktop: >= 1024px
} as const;

function getDeviceType(width: number): DeviceType {
  if (width < BREAKPOINTS.phone) return 'phone';
  if (width < BREAKPOINTS.tablet) return 'tablet';
  return 'desktop';
}

function isTouchCapable(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function useDevice(): DeviceInfo {
  const [device, setDevice] = useState<DeviceInfo>(() => {
    if (typeof window === 'undefined') {
      return { type: 'desktop', isPhone: false, isTablet: false, isDesktop: true, isTouchDevice: false, width: 1024 };
    }
    const w = window.innerWidth;
    const type = getDeviceType(w);
    return {
      type,
      isPhone: type === 'phone',
      isTablet: type === 'tablet',
      isDesktop: type === 'desktop',
      isTouchDevice: isTouchCapable(),
      width: w,
    };
  });

  const handleResize = useCallback(() => {
    const w = window.innerWidth;
    const type = getDeviceType(w);
    setDevice({
      type,
      isPhone: type === 'phone',
      isTablet: type === 'tablet',
      isDesktop: type === 'desktop',
      isTouchDevice: isTouchCapable(),
      width: w,
    });
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  return device;
}

export { BREAKPOINTS };
