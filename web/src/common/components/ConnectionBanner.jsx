import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Alert, CircularProgress } from '@mui/material';
import { useTranslation } from './LocalizationProvider';

// messages thrown by fetch() when the request never reached a server (Chrome/Edge, Firefox, Safari)
export const isNetworkError = (message) =>
  ['Failed to fetch', 'NetworkError when attempting to fetch resource.', 'Load failed'].includes(
    message,
  );

export const useConnectionMessage = () => {
  const t = useTranslation();
  // navigator.onLine is false when the device has no network at all (airplane mode, Wi-Fi off);
  // when it is true but the server does not answer, the problem is the server or the route to it
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return online ? t('errorServerDown') : t('errorNoInternet');
};

const ConnectionBanner = () => {
  const authenticated = useSelector((state) => Boolean(state.session.user));
  const socket = useSelector((state) => state.session.socket);
  const message = useConnectionMessage();

  // wait a few seconds so a page reload or a short hiccup does not flash the banner
  const [visible, setVisible] = useState(false);
  const disconnected = authenticated && socket === false;
  useEffect(() => {
    if (!disconnected) {
      setVisible(false);
      return undefined;
    }
    const timeout = setTimeout(() => setVisible(true), 4000);
    return () => clearTimeout(timeout);
  }, [disconnected]);

  if (!visible) return null;
  return (
    <Alert
      severity="warning"
      variant="filled"
      icon={<CircularProgress size={18} color="inherit" />}
      sx={{
        position: 'fixed',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: (theme) => theme.zIndex.snackbar + 1,
        boxShadow: 6,
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      {message}
    </Alert>
  );
};

export default ConnectionBanner;
