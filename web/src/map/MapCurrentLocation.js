import * as maplibregl from 'maplibre-gl';
import { useEffect } from 'react';
import { map } from './core/MapView';
import { useTheme } from '@mui/material';
import { useTranslation } from '../common/components/LocalizationProvider';

// The browser only allows geolocation on HTTPS (or localhost). Without it the button is still
// shown, but explains why it cannot locate instead of the generic "Location not available".
class NoSecureLocationControl {
  constructor(message) {
    this.message = message;
  }

  onAdd() {
    this.container = document.createElement('div');
    this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
    const button = document.createElement('button');
    button.type = 'button';
    button.title = this.message;
    button.setAttribute('aria-label', this.message);
    button.className = 'maplibregl-ctrl-geolocate';
    button.innerHTML = '<span class="maplibregl-ctrl-icon" aria-hidden="true"></span>';
    button.addEventListener('click', () => window.alert(this.message));
    this.container.appendChild(button);
    return this.container;
  }

  onRemove() {
    this.container.remove();
  }
}

const MapCurrentLocation = () => {
  const theme = useTheme();
  const t = useTranslation();

  useEffect(() => {
    const position = theme.direction === 'rtl' ? 'top-left' : 'top-right';
    const control =
      window.isSecureContext && navigator.geolocation
        ? new maplibregl.GeolocateControl({
            positionOptions: {
              enableHighAccuracy: true,
              timeout: 5000,
            },
            trackUserLocation: false,
          })
        : new NoSecureLocationControl(t('mapLocationNeedsHttps'));
    map.addControl(control, position);
    return () => map.removeControl(control);
  }, [theme.direction, t]);

  return null;
};

export default MapCurrentLocation;
