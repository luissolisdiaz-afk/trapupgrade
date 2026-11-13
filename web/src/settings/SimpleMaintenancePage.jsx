import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Button,
  Container,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from './components/SettingsMenu';
import { useTranslation } from '../common/components/LocalizationProvider';
import useClientType from '../common/util/useClientType';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { useAsyncTask, useCatchCallback } from '../reactHelper';
import { messagesActions } from '../store';
import { MAINTENANCE_TEMPLATES } from './maintenanceTemplates';

const useStyles = makeStyles()((theme) => ({
  container: { padding: theme.spacing(2), display: 'flex', flexDirection: 'column', gap: theme.spacing(1.5) },
  row: { padding: theme.spacing(1.5), display: 'flex', flexDirection: 'column', gap: theme.spacing(1) },
  actions: { display: 'flex', gap: theme.spacing(1) },
}));

const HOUR = 3600000;
const DAY = 86400000;
const WARN_DAYS = 15;

const json = (method, body) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const unitLabel = { distance: 'km', hours: 'horas' };

const TemplateRow = ({ template, existing, position, deviceId, onChanged }) => {
  const { classes } = useStyles();
  const t = useTranslation();
  const dispatch = useDispatch();

  const [kind, setKind] = useState(
    existing
      ? { totalDistance: 'distance', hours: 'hours', fixTime: 'date' }[existing.type]
      : template.kinds[0],
  );
  const initial = () => {
    if (!existing) return template.defaultValue || '';
    if (existing.type === 'fixTime') {
      return new Date(existing.start + WARN_DAYS * DAY).toISOString().slice(0, 10);
    }
    return existing.period / (existing.type === 'hours' ? HOUR : 1000);
  };
  const [value, setValue] = useState(initial());

  const remove = async () => {
    if (existing) await fetchOrThrow(`api/maintenance/${existing.id}`, { method: 'DELETE' });
  };

  const save = useCatchCallback(async () => {
    await remove();
    let body;
    if (kind === 'date') {
      const due = new Date(`${value}T12:00:00`).getTime();
      body = { type: 'fixTime', start: due - WARN_DAYS * DAY, period: 365 * DAY };
    } else if (kind === 'hours') {
      const period = Number(value) * HOUR;
      body = { type: 'hours', start: (position?.attributes?.hours || 0) + period, period };
    } else {
      const period = Number(value) * 1000;
      body = { type: 'totalDistance', start: (position?.attributes?.totalDistance || 0) + period, period };
    }
    const created = await (
      await fetchOrThrow(
        'api/maintenance',
        json('POST', { name: template.label, ...body, attributes: { template: template.key, deviceId } }),
      )
    ).json();
    await fetchOrThrow('api/permissions', json('POST', { deviceId, maintenanceId: created.id }));

    // aviso del evento de mantenimiento para este equipo (una sola vez)
    const notifications = await (await fetchOrThrow(`api/notifications?deviceId=${deviceId}`)).json();
    if (!notifications.some((n) => n.type === 'maintenance')) {
      const notification = await (
        await fetchOrThrow('api/notifications', json('POST', { type: 'maintenance', always: false, notificators: 'web' }))
      ).json();
      await fetchOrThrow('api/permissions', json('POST', { deviceId, notificationId: notification.id }));
    }
    dispatch(messagesActions.push({ message: t('sharedSaved'), severity: 'success' }));
    onChanged();
  }, [kind, value, existing, deviceId]);

  const clear = useCatchCallback(async () => {
    await remove();
    onChanged();
  }, [existing]);

  const missingOdometer = kind === 'distance' && !position?.attributes?.totalDistance;

  return (
    <Paper className={classes.row}>
      <Typography variant="subtitle2">{template.label}</Typography>
      {template.kinds.length > 1 && (
        <TextField select size="small" value={kind} onChange={(e) => setKind(e.target.value)} label="Medir por">
          {template.kinds.map((k) => (
            <MenuItem key={k} value={k}>{k === 'distance' ? 'Kilometraje' : 'Horas de motor'}</MenuItem>
          ))}
        </TextField>
      )}
      {kind === 'date' ? (
        <TextField
          size="small"
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          label="Fecha de vencimiento"
          helperText={`Te avisaremos ${WARN_DAYS} días antes y se repite cada año`}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      ) : (
        <TextField
          size="small"
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          label={`Avisar cada (${unitLabel[kind]})`}
        />
      )}
      {missingOdometer && (
        <Typography variant="caption" color="textSecondary">
          Este equipo aún no informa kilometraje total; el aviso funcionará cuando lo reporte.
        </Typography>
      )}
      <div className={classes.actions}>
        <Button variant="contained" size="small" disabled={!value} onClick={save}>
          {existing ? t('sharedSave') : 'Activar'}
        </Button>
        {existing && (
          <Button size="small" color="error" onClick={clear}>
            {t('sharedRemove')}
          </Button>
        )}
      </div>
    </Paper>
  );
};

const SimpleMaintenancePage = () => {
  const { classes } = useStyles();
  const clientType = useClientType();
  const profile = clientType === 'empresa' ? 'empresa' : 'particular';

  const devices = useSelector((state) => Object.values(state.devices.items));
  const positions = useSelector((state) => state.session.positions);

  const [deviceId, setDeviceId] = useState(null);
  const [items, setItems] = useState([]);
  const [version, setVersion] = useState(0);
  const current = deviceId || devices[0]?.id;

  useAsyncTask(
    async ({ signal }) => {
      if (!current) return;
      const response = await fetchOrThrow(`api/maintenance?deviceId=${current}`, { signal });
      setItems(await response.json());
    },
    [current, version],
  );

  return (
    <PageLayout menu={<SettingsMenu />} breadcrumbs={['settingsTitle', 'sharedMaintenance']}>
      <Container maxWidth="sm" className={classes.container}>
        <TextField select size="small" value={current || ''} onChange={(e) => setDeviceId(e.target.value)} label="Equipo">
          {devices.map((d) => (
            <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
          ))}
        </TextField>
        {current &&
          MAINTENANCE_TEMPLATES[profile].map((template) => (
            <TemplateRow
              key={`${current}-${template.key}-${version}`}
              template={template}
              existing={items.find((m) => m.attributes?.template === template.key)}
              position={positions[current]}
              deviceId={current}
              onChanged={() => setVersion((v) => v + 1)}
            />
          ))}
      </Container>
    </PageLayout>
  );
};

export default SimpleMaintenancePage;
