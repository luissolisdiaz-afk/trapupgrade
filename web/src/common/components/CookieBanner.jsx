import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Button, Link, Paper, Typography } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { useTranslation } from './LocalizationProvider';
import { onConsentOpen, readConsent, saveConsent } from '../util/consent';
import useLegalUrls from '../util/useLegalUrls';

const useStyles = makeStyles()((theme) => ({
  root: {
    position: 'fixed',
    left: theme.spacing(2),
    right: theme.spacing(2),
    bottom: theme.spacing(2),
    maxWidth: theme.spacing(70),
    margin: '0 auto',
    padding: theme.spacing(2),
    zIndex: theme.zIndex.snackbar + 1,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1.5),
  },
  buttons: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
    justifyContent: 'flex-end',
  },
}));

// Carga la analítica configurada por el administrador SOLO después de que la persona la acepta.
const loadAnalytics = (src) => {
  if (!src || document.querySelector('script[data-consent="analytics"]')) return;
  const script = document.createElement('script');
  script.src = src;
  script.async = true;
  script.dataset.consent = 'analytics';
  document.head.appendChild(script);
};

const CookieBanner = () => {
  const { classes } = useStyles();
  const t = useTranslation();
  const { cookiesUrl, privacyUrl } = useLegalUrls();
  const analyticsScript = useSelector((state) => state.session.server?.attributes?.analyticsScript);

  const [consent, setConsent] = useState(readConsent);
  const [open, setOpen] = useState(() => !readConsent());

  useEffect(() => onConsentOpen(() => setOpen(true)), []);

  useEffect(() => {
    if (consent?.analytics) loadAnalytics(analyticsScript);
  }, [consent, analyticsScript]);

  const choose = (analytics) => {
    const hadAnalytics = Boolean(consent?.analytics);
    setConsent(saveConsent(analytics));
    setOpen(false);
    if (hadAnalytics && !analytics) {
      // Un script ya cargado no se puede "descargar": se recarga la página sin él.
      window.location.reload();
    }
  };

  if (!open) return null;

  return (
    <Paper className={classes.root} elevation={8} role="region" aria-label={t('legalCookies')}>
      <Typography variant="body2">
        {t('legalCookiesText')}{' '}
        <Link href={cookiesUrl} target="_blank" rel="noopener">
          {t('legalCookies')}
        </Link>
        {' · '}
        <Link href={privacyUrl} target="_blank" rel="noopener">
          {t('userPrivacy')}
        </Link>
      </Typography>
      <div className={classes.buttons}>
        <Button variant="outlined" onClick={() => choose(false)}>
          {t('legalCookiesReject')}
        </Button>
        <Button variant="contained" onClick={() => choose(true)}>
          {t('legalCookiesAccept')}
        </Button>
      </div>
    </Paper>
  );
};

export default CookieBanner;
