import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { Button, Card, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import PageLayout from '../common/components/PageLayout';
import { useTranslation } from '../common/components/LocalizationProvider';
import CamerasMenu from './CamerasMenu';
import useCameraDevices from './useCameraDevices';
import useCameraEvents from './useCameraEvents';
import CameraEventsTable from './CameraEventsTable';
import CameraTile from './CameraTile';
import { messagesActions } from '../store';

const MAX_LIVE = 4;

const useStyles = makeStyles()((theme) => ({
  container: {
    padding: theme.spacing(2),
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
  },
  grid: {
    display: 'grid',
    gap: theme.spacing(2),
    gridTemplateColumns: 'repeat(var(--cols), minmax(0, 1fr))',
    [theme.breakpoints.down('md')]: { gridTemplateColumns: 'repeat(min(var(--cols), 2), minmax(0, 1fr))' },
    [theme.breakpoints.down('sm')]: { gridTemplateColumns: '1fr' },
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
}));

const CamerasDashboardPage = () => {
  const { classes } = useStyles();
  const t = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const [active, setActive] = useState([]);
  const [cols, setCols] = useState(2);

  const items = useCameraDevices();
  const cameras = useMemo(() => items.filter((it) => it.camera), [items]);
  const ids = useMemo(() => cameras.map((it) => it.device.id).slice(0, 100), [cameras]);

  const [events, , loadEvents] = useCameraEvents();

  useEffect(() => {
    loadEvents(ids, dayjs().subtract(24, 'hour'), dayjs());
  }, [ids.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const play = (id) => {
    setActive((a) => {
      if (a.includes(id)) return a;
      if (a.length >= MAX_LIVE) {
        dispatch(messagesActions.push({ message: t('cameraMaxLive'), severity: 'warning' }));
        return a;
      }
      return [...a, id];
    });
  };

  useEffect(() => {
    const id = Number(searchParams.get('deviceId'));
    if (id && searchParams.get('play')) play(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PageLayout menu={<CamerasMenu />} breadcrumbs={['cameraTitle', 'cameraPanel']}>
      <div className={classes.container}>
        <div className={classes.header}>
          <Typography variant="h6">
            {t('cameraTitle')} ({cameras.length})
          </Typography>
          <ToggleButtonGroup size="small" exclusive value={cols} onChange={(_, v) => v && setCols(v)}>
            {[1, 2, 3, 4].map((n) => (
              <ToggleButton key={n} value={n}>{n}</ToggleButton>
            ))}
          </ToggleButtonGroup>
        </div>
        {!cameras.length && (
          <Typography color="textSecondary">{t('cameraEmptyHint')}</Typography>
        )}
        <div className={classes.grid} style={{ '--cols': cols }}>
          {cameras.map(({ device }) => (
            <CameraTile
              key={device.id}
              device={device}
              channels={Number(device.attributes?.channels) || 2}
              playing={active.includes(device.id)}
              canPlay={active.length < MAX_LIVE}
              onPlay={() => play(device.id)}
              onStop={() => setActive((a) => a.filter((id) => id !== device.id))}
              onRecordings={() => navigate(`/cameras/recordings?deviceId=${device.id}`)}
            />
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">{`${t('cameraEvents')} (24 h)`}</Typography>
          <Button size="small" onClick={() => navigate('/cameras/events')}>
            {t('cameraAllEvents')}
          </Button>
        </div>
        <Card>
          <CameraEventsTable events={events ? events.slice(0, 5) : events} />
        </Card>
      </div>
    </PageLayout>
  );
};

export default CamerasDashboardPage;
