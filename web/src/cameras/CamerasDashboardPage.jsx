import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Button, Card, CardActions, CardContent, Chip, Typography } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import PageLayout from '../common/components/PageLayout';
import { useTranslation } from '../common/components/LocalizationProvider';
import CamerasMenu from './CamerasMenu';
import useCameraDevices from './useCameraDevices';
import useOverspeedEvents from './useOverspeedEvents';
import OverspeedTable from './OverspeedTable';
import { formatTime } from '../common/util/formatter';

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
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
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

  const items = useCameraDevices();
  const cameras = useMemo(() => items.filter((it) => it.camera), [items]);
  const ids = useMemo(() => cameras.map((it) => it.device.id).slice(0, 100), [cameras]);

  const [events, , loadEvents] = useOverspeedEvents();

  useEffect(() => {
    loadEvents(ids, dayjs().subtract(24, 'hour'), dayjs());
  }, [ids.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PageLayout menu={<CamerasMenu />} breadcrumbs={['cameraTitle', 'cameraPanel']}>
      <div className={classes.container}>
        <div className={classes.header}>
          <Typography variant="h6">
            {t('cameraTitle')} ({cameras.length})
          </Typography>
        </div>
        {!cameras.length && (
          <Typography color="textSecondary">{t('cameraEmptyHint')}</Typography>
        )}
        <div className={classes.grid}>
          {cameras.map(({ device, position }) => (
            <Card key={device.id}>
              <CardContent>
                <Typography variant="subtitle1" noWrap>
                  {device.name}
                </Typography>
                <Chip
                  size="small"
                  color={device.status === 'online' ? 'success' : 'default'}
                  label={t(`deviceStatus${device.status.charAt(0).toUpperCase()}${device.status.slice(1)}`)}
                  sx={{ my: 1 }}
                />
                <Typography variant="body2" color="textSecondary">
                  {formatTime(device.lastUpdate, 'minutes')}
                </Typography>
                {position && (
                  <Typography variant="body2" color="textSecondary">
                    {Math.round(position.speed * 1.852)} km/h
                  </Typography>
                )}
              </CardContent>
              <CardActions>
                <Button size="small" onClick={() => navigate(`/stream?deviceId=${device.id}`)}>
                  {t('linkLiveVideo')}
                </Button>
                <Button
                  size="small"
                  onClick={() => navigate(`/cameras/recordings?deviceId=${device.id}`)}
                >
                  {t('linkRecordings')}
                </Button>
              </CardActions>
            </Card>
          ))}
        </div>
        <Typography variant="h6">{t('cameraSpeeding')} (24 h)</Typography>
        <Card>
          <OverspeedTable
            events={events}
            onSelect={(event) =>
              navigate(
                `/cameras/recordings?deviceId=${event.deviceId}&at=${encodeURIComponent(event.eventTime)}`,
              )
            }
          />
        </Card>
      </div>
    </PageLayout>
  );
};

export default CamerasDashboardPage;
