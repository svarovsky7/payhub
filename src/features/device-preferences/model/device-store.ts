import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DeviceType = 'auto' | 'desktop' | 'tablet';

export interface DevicePreferences {
  preferredDevice: DeviceType;
  actualDevice: DeviceType;
  isTouch: boolean;
}

interface DeviceState {
  preferences: DevicePreferences;
  setPreferredDevice: (device: DeviceType) => void;
  updateActualDevice: () => void;
  getEffectiveDevice: () => DeviceType;
  isEffectiveTouch: () => boolean;
}

const detectDevice = (): { device: DeviceType; isTouch: boolean } => {
  if (typeof window === 'undefined') {
    return { device: 'desktop', isTouch: false };
  }

  const width = window.innerWidth;
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  if (width < 768) {
    return { device: 'tablet', isTouch: true }; // Mobile devices are treated as tablets for touch optimization
  } else if (width >= 768 && width < 1280) {
    return { device: 'tablet', isTouch: hasTouch };
  } else {
    return { device: 'desktop', isTouch: hasTouch };
  }
};

export const useDeviceStore = create<DeviceState>()(
  persist(
    (set, get) => ({
      preferences: {
        preferredDevice: 'auto',
        actualDevice: 'desktop',
        isTouch: false,
      },

      setPreferredDevice: (device: DeviceType) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            preferredDevice: device,
          },
        }));
      },

      updateActualDevice: () => {
        const { device, isTouch } = detectDevice();
        set((state) => ({
          preferences: {
            ...state.preferences,
            actualDevice: device,
            isTouch,
          },
        }));
      },

      getEffectiveDevice: () => {
        const { preferences } = get();
        if (preferences.preferredDevice === 'auto') {
          return preferences.actualDevice;
        }
        return preferences.preferredDevice;
      },

      isEffectiveTouch: () => {
        const { preferences } = get();
        const effectiveDevice = get().getEffectiveDevice();
        
        if (preferences.preferredDevice === 'auto') {
          return preferences.isTouch;
        }
        
        // If user manually selected tablet, always use touch optimization
        return effectiveDevice === 'tablet';
      },
    }),
    {
      name: 'device-preferences',
      partialize: (state) => ({
        preferences: {
          preferredDevice: state.preferences.preferredDevice,
          actualDevice: state.preferences.actualDevice,
          isTouch: state.preferences.isTouch,
        },
      }),
    }
  )
);