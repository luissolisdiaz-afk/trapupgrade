import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { Button, Card, MenuItem, TextField } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import PageLayout from '../common/components/PageLayout';
import { useTranslation } from '../common/components/LocalizationProvider';
import CamerasMenu from './CamerasMenu';
import useCameraDevices from './useCameraDevices';
import useCameraEvents from './useCameraEvents';
import CameraEventsTable from './CameraEventsTable';

const useStyles = makeStyles()((theme) => ({
  container: { padding: theme.spacing(2), display: 'flex', flexDirection: 'column', gap: theme.spacing(2) },
  filter: { display: 'flex', flexWrap: 'wrap', gap: theme.spacing(1), alignItems: 'center' },
}));

const CamerasEventsPage = () => {
  const { classes } = useStyles();
  const t = useTranslation();
  const [searchParams] = useSearchParams();

  const items = useCameraDevices();
  const [deviceId, setDeviceId] = useState(searchParams.get('deviceId') || 'all');
  const [group, setGroup] = useState('all');
  const [from, setFrom] = useState(dayjs().subtract(7, 'day').startOf('day').format('YYYY-MM-DDTHH:mm'));
  const [to, setTo] = useState(dayjs().endOf('day').format('YYYY-MM-DDTHH:mm'));
  const [events, loading, loadEvents] = useCameraEvents();

  useEffect(() => {
    setDeviceId(searchParams.get('deviceId') || 'all');
  }, [searchParams]);

  const search = () =>
    loadEvents(
      deviceId === 'all' ? items.map((it) => it.device.id).slice(0, 100) : [deviceId],
      from,
      to,
    );

  // show the last week as soon as the devices are known
  const ready = items.length > 0;
  useEffect(() => {
    if (ready) search();
    // eslint-disable-next-line @eslint-react/exhaustive-deps
  }, [ready, deviceId]);

  const visible = events && group !== 'all' ? events.filter((event) => event.group === group) : events;

  return (
    <PageLayout menu={<CamerasMenu />} breadcrumbs={['cameraTitle', 'cameraEvents']}>
      <div className={classes.container}>
        <div className={classes.filter}>
          <TextField select size="small" label={t('sharedDevice')} value={deviceId} onChange={(e) => setDeviceId(e.target.value)} sx={{ minWidth: 200 }}>
            <MenuItem value="all">{t('notificationAlways')}</MenuItem>
            {items.map(({ device }) => (
              <MenuItem key={device.id} value={String(device.id)}>{device.name}</MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label={t('cameraEventType')} value={group} onChange={(e) => setGroup(e.target.value)} sx={{ minWidth: 200 }}>
            <MenuItem value="all">{t('cameraAllEvents')}</MenuItem>
            <MenuItem value="overspeed">{t('cameraSpeeding')}</MenuItem>
            <MenuItem value="adas">{t('cameraGroupAdas')}</MenuItem>
            <MenuItem value="dms">{t('cameraGroupDms')}</MenuItem>
            <MenuItem value="blind">{t('cameraGroupBlind')}</MenuItem>
          </TextField>
          <TextField size="small" type="datetime-local" label={t('reportFrom')} value={from} onChange={(e) => setFrom(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField size="small" type="datetime-local" label={t('reportTo')} value={to} onChange={(e) => setTo(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <Button variant="contained" onClick={search} disabled={loading}>{t('reportShow')}</Button>
        </div>
        <Card>
          <CameraEventsTable events={visible} />
        </Card>
      </div>
    </PageLayout>
  );
};

export default CamerasEventsPage;
