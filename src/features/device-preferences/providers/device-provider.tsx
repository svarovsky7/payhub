import React, { useEffect } from 'react';
import { useDeviceStore } from '../model/device-store';
import { DeviceContext, type DeviceContextValue } from '../context/device-context';

interface DeviceProviderProps {
  children: React.ReactNode;
}

export const DeviceProvider: React.FC<DeviceProviderProps> = ({ children }) => {
  const { 
    preferences, 
    setPreferredDevice, 
    updateActualDevice, 
    getEffectiveDevice, 
    isEffectiveTouch 
  } = useDeviceStore();

  // Initialize and update device detection on mount and resize
  useEffect(() => {
    const handleResize = () => {
      updateActualDevice();
    };

    // Initial device detection
    updateActualDevice();

    // Listen for window resize events
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [updateActualDevice]);

  // Apply CSS classes to document body based on effective device
  useEffect(() => {
    const effectiveDevice = getEffectiveDevice();
    const isTouch = isEffectiveTouch();
    
    // Remove existing device classes
    document.body.classList.remove('device-auto', 'device-desktop', 'device-tablet', 'device-touch', 'device-pointer');
    
    // Add current device classes
    document.body.classList.add(`device-${effectiveDevice}`);
    document.body.classList.add(isTouch ? 'device-touch' : 'device-pointer');
    
    // Add preferred device class for CSS targeting
    document.body.classList.add(`device-preferred-${preferences.preferredDevice}`);
    
    // Set CSS custom properties for dynamic styling
    document.documentElement.style.setProperty('--device-type', effectiveDevice);
    document.documentElement.style.setProperty('--interaction-type', isTouch ? 'touch' : 'pointer');
    
  }, [preferences.preferredDevice, preferences.actualDevice, getEffectiveDevice, isEffectiveTouch]);

  const contextValue: DeviceContextValue = {
    effectiveDevice: getEffectiveDevice(),
    isTouch: isEffectiveTouch(),
    setPreferredDevice,
  };

  return (
    <DeviceContext.Provider value={contextValue}>
      {children}
    </DeviceContext.Provider>
  );
};