import { useState, useEffect } from 'react';

/**
 * Standard Breakpoint for DRISHTI Device-Based Mode Separation:
 * Desktop / Tablet-Landscape (>= 1024px) -> Organization Command Center
 * Mobile / Small-Screen (< 1024px) -> Citizen / User Safety Mode
 */
export const DESKTOP_BREAKPOINT = 1024;

export const isDesktopViewport = (): boolean => {
  if (typeof window === 'undefined') return true;
  return window.innerWidth >= DESKTOP_BREAKPOINT;
};

export const isMobileViewport = (): boolean => {
  return !isDesktopViewport();
};

export const useDeviceMode = () => {
  const [isDesktop, setIsDesktop] = useState<boolean>(() => isDesktopViewport());

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(isDesktopViewport());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    isDesktop,
    isMobile: !isDesktop,
    mode: isDesktop ? ('organization' as const) : ('user' as const)
  };
};
