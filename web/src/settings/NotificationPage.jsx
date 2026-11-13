import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';

import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  FormControlLabel,
  Checkbox,
  FormGroup,
  Button,
  TextField,
  MenuItem,
  Autocomplete,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation, useTranslationKeys } from '../common/components/LocalizationProvider';
import EditItemView from './components/EditItemView';
import { prefixString, unprefixString } from '../common/util/stringUtils';
import SelectField from '../common/components/SelectField';
import SettingsMenu from './components/SettingsMenu';
import { useCatch, useAsyncTask } from '../reactHelper';
import { useAdministrator } from '../common/util/permissions';
import { messagesActions } from '../store';
import useSettingsStyles from './common/useSettingsStyles';
import fetchOrThrow from '../common/util/fetchOrThrow';

const NotificationPage = () => {
  const { classes } = useSettingsStyles();
  const t = useTranslation();

  const dispatch = useDispatch();
  const admin = useAdministrator();
  const { id } = useParams();

  const [item, setItem] = useState();
  const [devices, setDevices] = useState([]);
  const [selected, setSelected] = useState([]);
  const [speedMode, setSpeedMode] = useState('map');
  const [speedKmh, setSpeedKmh] = useState('');

  useAsyncTask(
    async ({ signal }) => {
      if (!id) {
        const response = await fetchOrThrow(`api/devices?${admin ? 'all=true&' : ''}excludeAttributes=true`, {
          signal,
        });
        setDevices(await response.json());
      }
    },
    [id, admin],
  );

  const jsonBody = (method, body) => ({
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  // Al crear: vincula el evento a los equipos elegidos y, si es exceso de velocidad,
  // guarda el modo (límite del mapa o velocidad propia) en cada equipo.
  const onItemSaved = async (notification) => {
    for (const device of selected) {
      // eslint-disable-next-line no-await-in-loop
      await fetchOrThrow('api/permissions', jsonBody('POST', { deviceId: device.id, notificationId: notification.id }));
      if (notification.type === 'deviceOverspeed') {
        // eslint-disable-next-line no-await-in-loop
        const [full] = await (await fetchOrThrow(`api/devices?id=${device.id}`)).json();
        const attributes = { ...full.attributes, speedLimitMode: speedMode === 'map' ? 'map' : 'fixed' };
        if (speedMode === 'custom' && Number(speedKmh) > 0) {
          attributes.speedLimit = Number((Number(speedKmh) / 1.852).toFixed(2));
        }
        // eslint-disable-next-line no-await-in-loop
        await fetchOrThrow(`api/devices/${device.id}`, jsonBody('PUT', { ...full, attributes }));
      }
    }
    if (selected.length) {
      dispatch(messagesActions.push({ message: t('sharedSaved'), severity: 'success' }));
    }
  };

  const alarms = useTranslationKeys((it) => it.startsWith('alarm')).map((it) => ({
    key: unprefixString('alarm', it),
    name: t(it),
  }));

  const testNotificators = useCatch(async () => {
    await Promise.all(
      item.notificators.split(/[, ]+/).map(async (notificator) => {
        await fetchOrThrow(`api/notifications/test/${notificator}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
      }),
    );
  });

  const validate = () =>
    item &&
    item.type &&
    item.notificators &&
    (!item.notificators?.includes('command') || item.commandId) &&
    (item.type !== 'deviceOverspeed' || speedMode === 'map' || Number(speedKmh) > 0 || id);

  return (
    <EditItemView
      endpoint="notifications"
      item={item}
      setItem={setItem}
      validate={validate}
      onItemSaved={onItemSaved}
      menu={<SettingsMenu />}
      breadcrumbs={['settingsTitle', 'sharedNotification']}
    >
      {item && (
        <>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">{t('sharedRequired')}</Typography>
            </AccordionSummary>
            <AccordionDetails className={classes.details}>
              <SelectField
                value={item.type}
                onChange={(e) => setItem({ ...item, type: e.target.value })}
                endpoint="api/notifications/types"
                keyGetter={(it) => it.type}
                titleGetter={(it) => t(prefixString('event', it.type))}
                label={t('sharedType')}
                helperText={
                  ['geofenceEnter', 'geofenceExit', 'geofenceCrossed'].includes(item.type)
                    ? t('notificationGeofenceLabel')
                    : null
                }
              />
              {!id && (
                <Autocomplete
                  multiple
                  options={devices}
                  value={selected}
                  onChange={(_, v) => {
                    setSelected(v);
                    if (v.length) setItem({ ...item, always: false });
                  }}
                  getOptionLabel={(d) => `${d.name}`}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  renderInput={(params) => <TextField {...params} label={t('notificationDevices')} />}
                />
              )}
              {!id && item.type === 'deviceOverspeed' && (
                <>
                  <TextField select value={speedMode} onChange={(e) => setSpeedMode(e.target.value)} label={t('speedModeLabel')}>
                    <MenuItem value="map">{t('speedModeMap')}</MenuItem>
                    <MenuItem value="custom">{t('speedModeCustom')}</MenuItem>
                  </TextField>
                  {speedMode === 'custom' && (
                    <TextField
                      type="number"
                      value={speedKmh}
                      onChange={(e) => setSpeedKmh(e.target.value)}
                      label={`${t('speedLimitValue')} (km/h)`}
                    />
                  )}
                </>
              )}
              {item.type === 'alarm' && (
                <SelectField
                  multiple
                  value={
                    item.attributes && item.attributes.alarms
                      ? item.attributes.alarms.split(/[, ]+/)
                      : []
                  }
                  onChange={(e) =>
                    setItem({
                      ...item,
                      attributes: { ...item.attributes, alarms: e.target.value.join() },
                    })
                  }
                  data={alarms}
                  keyGetter={(it) => it.key}
                  label={t('sharedAlarms')}
                />
              )}
              <SelectField
                multiple
                value={item.notificators ? item.notificators.split(/[, ]+/) : []}
                onChange={(e) => setItem({ ...item, notificators: e.target.value.join() })}
                endpoint="api/notifications/notificators"
                keyGetter={(it) => it.type}
                titleGetter={(it) => t(prefixString('notificator', it.type))}
                label={t('notificationNotificators')}
              />
              {item.notificators?.includes('command') && (
                <SelectField
                  value={item.commandId}
                  onChange={(e) => setItem({ ...item, commandId: Number(e.target.value) })}
                  endpoint="api/commands"
                  titleGetter={(it) => it.description}
                  label={t('sharedSavedCommand')}
                />
              )}
              <Button
                variant="outlined"
                color="primary"
                onClick={testNotificators}
                disabled={!item.notificators}
              >
                {t('sharedTestNotificators')}
              </Button>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={item.always}
                      onChange={(e) => setItem({ ...item, always: e.target.checked })}
                    />
                  }
                  label={t('notificationAlways')}
                />
              </FormGroup>
            </AccordionDetails>
          </Accordion>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">{t('sharedExtra')}</Typography>
            </AccordionSummary>
            <AccordionDetails className={classes.details}>
              <TextField
                value={item.description || ''}
                onChange={(e) => setItem({ ...item, description: e.target.value })}
                label={t('sharedDescription')}
              />
              <SelectField
                value={item.calendarId}
                onChange={(e) => setItem({ ...item, calendarId: Number(e.target.value) })}
                endpoint="api/calendars"
                label={t('sharedCalendar')}
              />
              {['geofenceEnter', 'geofenceExit', 'geofenceCrossed'].includes(item.type) && (
                <SelectField
                  multiple
                  value={item.attributes?.geofenceIds ? item.attributes.geofenceIds.split(',') : []}
                  onChange={(e) => {
                    const geofenceIds = e.target.value.join();
                    const attributes = { ...item.attributes };
                    if (geofenceIds) {
                      attributes.geofenceIds = geofenceIds;
                    } else {
                      delete attributes.geofenceIds;
                    }
                    setItem({ ...item, attributes });
                  }}
                  endpoint="api/geofences"
                  keyGetter={(it) => String(it.id)}
                  label={t('sharedGeofences')}
                />
              )}
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={item.attributes && item.attributes.priority}
                      onChange={(e) =>
                        setItem({
                          ...item,
                          attributes: { ...item.attributes, priority: e.target.checked },
                        })
                      }
                    />
                  }
                  label={t('sharedPriority')}
                />
              </FormGroup>
            </AccordionDetails>
          </Accordion>
        </>
      )}
    </EditItemView>
  );
};

export default NotificationPage;
