import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AlertColor } from '@mui/material/Alert';
import type { SnackbarOrigin } from '@mui/material/Snackbar';
import Toast from '@/components/Toast';

const DEFAULT_AUTO_HIDE_DURATION = 5000;

type SnackbarMessage = {
  id: number;
  message: string;
  severity: AlertColor;
  title?: string;
  autoHideDuration?: number;
  anchorOrigin?: SnackbarOrigin;
};

type ShowSnackbarOptions = {
  severity?: AlertColor;
  title?: string;
  autoHideDuration?: number;
  anchorOrigin?: SnackbarOrigin;
};

type SnackbarContextType = {
  showSnackbar: (message: string, options?: ShowSnackbarOptions) => void;
  closeSnackbar: () => void;
  clearSnackbarQueue: () => void;
};

const SnackbarContext = createContext<SnackbarContextType | undefined>(undefined);

type SnackbarProviderProps = {
  children: React.ReactNode;
};

export function SnackbarProvider({ children }: SnackbarProviderProps) {
  const [queue, setQueue] = useState<SnackbarMessage[]>([]);
  const [current, setCurrent] = useState<SnackbarMessage | null>(null);
  const [open, setOpen] = useState(false);

  const showSnackbar = useCallback((message: string, options: ShowSnackbarOptions = {}) => {
    const trimmedMessage = message?.trim?.();
    if (!trimmedMessage) return;

    const snack: SnackbarMessage = {
      id: Date.now() + Math.floor(Math.random() * 10000),
      message: trimmedMessage,
      severity: options.severity || 'info',
      title: options.title,
      autoHideDuration: options.autoHideDuration ?? DEFAULT_AUTO_HIDE_DURATION,
      anchorOrigin: options.anchorOrigin,
    };

    setQueue((prevQueue) => [...prevQueue, snack]);
  }, []);

  const closeSnackbar = useCallback(() => {
    setOpen(false);
  }, []);

  const clearSnackbarQueue = useCallback(() => {
    setQueue([]);
  }, []);

  useEffect(() => {
    if (!current && queue.length > 0) {
      setCurrent(queue[0]);
      setQueue((prevQueue) => prevQueue.slice(1));
      setOpen(true);
    }
  }, [current, queue]);

  const handleClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  };

  const handleExited = () => {
    setCurrent(null);
  };

  const value = useMemo(
    () => ({
      showSnackbar,
      closeSnackbar,
      clearSnackbarQueue,
    }),
    [showSnackbar, closeSnackbar, clearSnackbarQueue],
  );

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <Toast
        id={current?.id}
        isOpen={open}
        message={current?.message || ''}
        severity={current?.severity || 'info'}
        title={current?.title}
        autoHideDuration={current?.autoHideDuration}
        anchorOrigin={current?.anchorOrigin}
        onClose={handleClose}
        onExited={handleExited}
      />
    </SnackbarContext.Provider>
  );
}

export function useSnackbar() {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within SnackbarProvider');
  }
  return context;
}
