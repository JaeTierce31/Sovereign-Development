"use client";
import { createContext, useContext, ReactNode } from 'react';

interface GestureContextValue {
  isMobile: boolean;
}

const GestureContext = createContext<GestureContextValue>({ isMobile: true });

export function GestureProvider({ children }: { children: ReactNode }) {
  const isMobile =
    typeof window !== 'undefined' &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  return (
    <GestureContext.Provider value={{ isMobile }}>
      {children}
    </GestureContext.Provider>
  );
}

export const useDevice = () => useContext(GestureContext);
