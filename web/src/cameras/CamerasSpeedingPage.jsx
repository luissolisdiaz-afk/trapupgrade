import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { Button, Card, MenuItem, TextField } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import PageLayout from '../common/components/PageLayout';
import { useTranslation } from '../common/components/LocalizationProvider';
import CamerasMenu from './CamerasMenu';
import useCameraDevices from './useCameraDevices';
import useOverspeedEvents from './useOverspeedEvents';
import OverspeedTable from './OverspeedTable';

const useStyles = makeStyles()((theme) => ({
  container: { padding: theme.spacing(2), display: 'flex', flexDirection: 'column', gap: theme.spacing(2) },
  filter: { display: 'flex', flexWrap: 'wrap', gap: theme.spacing(1), alignItems: 'center' },
}));

const CamerasSpeedingPage = () => {
  const { classes } = useStyles();
  const t = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const items = useCameraDevices();
  const [deviceId, setDeviceId] = useState(searchParams.get('deviceId') || 'all');
  const [from, setFrom] = useState(dayjs().subtract(7, 'day').startOf('day').format('YYYY-MM-DDTHH:mm'));
  const [to, setTo] = useState(dayjs().endOf('day').format('YYYY-MM-DDTHH:mm'));
  const [events, loading, loadEvents] = useOverspeedEvents();

  useEffect(() => {
    setDeviceId(searchParams.get('deviceId') || 'all');
  }, [searchParams]);

  const search = () =>
    loadEvents(
      deviceId === 'all' ? items.map((it) => it.device.id).slice(0, 100) : [deviceId],
      from,
      to,
    );

  return (
    <PageLayout menu={<CamerasMenu />} breadcrumbs={['cameraTitle', 'cameraSpeeding']}>
      <div className={classes.container}>
        <div className={classes.filter}>
          <TextField select size="small" label={t('sharedDevice')} value={deviceId} onChange={(e) => setDeviceId(e.target.value)} sx={{ minWidth: 200 }}>
            <MenuItem value="all">{t('notificationAlways')}</MenuItem>
            {items.map(({ device }) => (
              <MenuItem key={device.id} value={String(device.id)}>{device.name}</MenuItem>
            ))}
          </TextField>
          <TextField size="small" type="datetime-local" label={t('reportFrom')} value={from} onChange={(e) => setFrom(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField size="small" type="datetime-local" label={t('reportTo')} value={to} onChange={(e) => setTo(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <Button variant="contained" onClick={search} disabled={loading}>{t('reportShow')}</Button>
        </div>
        <Card>
          <OverspeedTable
            events={events}
            onSelect={(event) =>
              navigate(`/cameras/recordings?deviceId=${event.deviceId}&at=${encodeURIComponent(event.eventTime)}`)
            }
          />
        </Card>
      </div>
    </PageLayout>
  );
};

export default CamerasSpeedingPage;
