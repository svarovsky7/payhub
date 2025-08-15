import { createContext } from 'react';
import type { DeviceType } from '../model/device-store';

export interface DeviceContextValue {
  effectiveDevice: DeviceType;
  isTouch: boolean;
  setPreferredDevice: (device: DeviceType) => void;
}

export const DeviceContext = createContext<DeviceContextValue | null>(null);