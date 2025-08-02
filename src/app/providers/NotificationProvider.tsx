import React from 'react';
import { SnackbarProvider } from 'notistack';

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  return (
    <SnackbarProvider
      maxSnack={3}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      preventDuplicate
    >
      {children}
    </SnackbarProvider>
  );
};