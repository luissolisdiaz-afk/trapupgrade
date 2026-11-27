// Consentimiento de cookies (ley 19.628 / 21.719). Se guarda solo en este navegador.
// Las cookies necesarias (sesión e idioma/preferencias) no requieren consentimiento;
// cualquier analítica o rastreador debe esperar a que hasConsent('analytics') sea true.

const STORAGE_KEY = 'cookieConsent';
export const CONSENT_VERSION = 1;
const CHANGE_EVENT = 'consentchange';
const OPEN_EVENT = 'consentopen';

export const readConsent = () => {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    return value?.version === CONSENT_VERSION ? value : null;
  } catch {
    return null;
  }
};

export const hasConsent = (category) => Boolean(readConsent()?.[category]);

export const saveConsent = (analytics) => {
  const value = { version: CONSENT_VERSION, analytics, time: new Date().toISOString() };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // almacenamiento bloqueado: el aviso volverá a aparecer en la próxima visita
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: value }));
  return value;
};

export const openConsentSettings = () => window.dispatchEvent(new Event(OPEN_EVENT));

export const onConsentOpen = (listener) => {
  window.addEventListener(OPEN_EVENT, listener);
  return () => window.removeEventListener(OPEN_EVENT, listener);
};

export const onConsentChange = (listener) => {
  window.addEventListener(CHANGE_EVENT, listener);
  return () => window.removeEventListener(CHANGE_EVENT, listener);
};
