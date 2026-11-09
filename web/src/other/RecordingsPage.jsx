import { useEffect, useRef, useState } from 'react';
import {
  Typography,
  MenuItem,
  Paper,
  TextField,
  Button,
  List,
  ListItemButton,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { default as Hls, Events } from 'hls.js';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useCatch } from '../reactHelper';
import PageLayout from '../common/components/PageLayout';
import CamerasMenu from '../cameras/CamerasMenu';
import useCameraDevices from '../cameras/useCameraDevices';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { formatTime } from '../common/util/formatter';

const useStyles = makeStyles()((theme) => ({
  root: {
    flexGrow: 1,
    minHeight: 0,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  title: {
    flexGrow: 1,
  },
  filter: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
    padding: theme.spacing(1, 2),
    alignItems: 'center',
  },
  content: {
    flexGrow: 1,
    minHeight: 0,
    display: 'flex',
    [theme.breakpoints.down('md')]: {
      flexDirection: 'column',
    },
  },
  list: {
    overflow: 'auto',
    flexShrink: 0,
    width: theme.dimensions.drawerWidthDesktop,
    [theme.breakpoints.down('md')]: {
      width: '100%',
      maxHeight: '35%',
    },
  },
  video: {
    flexGrow: 1,
    minHeight: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: theme.palette.background.default,
  },
  player: {
    maxWidth: '100%',
    maxHeight: '100%',
  },
}));

const formatSize = (bytes) => {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`;
};

const formatDuration = (from, to) => {
  const seconds = Math.max(0, dayjs(to).diff(dayjs(from), 'second'));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const recordingKey = (recording) => `${recording.channel}-${recording.startTime}`;

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

/**
 * Recording playback (e.g. camera micro SD card).
 *
 * Server API (JT/T 1078 devices):
 *   GET    api/recordings?deviceId=&channel=&from=&to=  ->  [{ channel, startTime, endTime, size, mediaType }]
 *   POST   api/recordings/playback?deviceId=&channel=&from=&to=  (device streams the clip to the server)
 *   GET    api/stream/{deviceId}/{channel}/live.m3u8      (same HLS as live video)
 *   DELETE api/recordings/playback?deviceId=&channel=   (stop the playback)
 */
const RecordingsPage = () => {
  const { classes } = useStyles();
  const t = useTranslation();

  const videoRef = useRef(null);

  const [searchParams] = useSearchParams();
  const [deviceId, setDeviceId] = useState(searchParams.get('deviceId') || '');
  const cameraItems = useCameraDevices();
  const at = searchParams.get('at');

  const [channel, setChannel] = useState(1);
  const [from, setFrom] = useState(
    (at ? dayjs(at).subtract(5, 'minute') : dayjs().startOf('day')).format('YYYY-MM-DDTHH:mm'),
  );
  const [to, setTo] = useState(
    (at ? dayjs(at).add(5, 'minute') : dayjs().endOf('day')).format('YYYY-MM-DDTHH:mm'),
  );
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(false);

  const search = useCatch(async () => {
    setLoading(true);
    setSelected(null);
    try {
      const query = new URLSearchParams({
        deviceId,
        channel,
        from: dayjs(from).toISOString(),
        to: dayjs(to).toISOString(),
      });
      const response = await fetchOrThrow(`api/recordings?${query.toString()}`);
      setItems(await response.json());
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    if (deviceId && at) search();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setError(false);
    if (!selected) return undefined;
    let cancelled = false;
    let hls = null;
    const query = new URLSearchParams({
      deviceId,
      channel: selected.channel,
      from: dayjs(selected.startTime).toISOString(),
      to: dayjs(selected.endTime).toISOString(),
    });
    const streamUrl = new URL(
      `api/stream/${deviceId}/${selected.channel}/live.m3u8`,
      document.baseURI,
    ).href;

    const start = async () => {
      try {
        await fetchOrThrow(`api/recordings/playback?${query.toString()}`, { method: 'POST' });
        // The device needs a few seconds to connect and start sending video.
        for (let attempt = 0; attempt < 10 && !cancelled; attempt += 1) {
          await sleep(2000);
          const response = await fetch(streamUrl);
          if (response.ok && (await response.text()).includes('.ts')) {
            break;
          }
        }
        const video = videoRef.current;
        if (cancelled || !video) return;
        if (Hls.isSupported()) {
          hls = new Hls({ liveSyncDurationCount: 1 });
          hls.loadSource(streamUrl);
          hls.attachMedia(video);
          hls.on(Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
          hls.on(Events.ERROR, (_, data) => {
            if (data.fatal) setError(true);
          });
        } else {
          video.src = streamUrl;
          video.play().catch(() => {});
        }
      } catch {
        if (!cancelled) setError(true);
      }
    };
    start();

    return () => {
      cancelled = true;
      if (hls) hls.destroy();
      fetch(`api/recordings/playback?deviceId=${deviceId}&channel=${selected.channel}`, {
        method: 'DELETE',
      }).catch(() => {});
    };
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PageLayout menu={<CamerasMenu />} breadcrumbs={['cameraTitle', 'linkRecordings']}>
    <div className={classes.root}>
      <Paper square>
        <div className={classes.filter}>
          <TextField
            select
            size="small"
            label={t('sharedDevice')}
            value={deviceId}
            onChange={(event) => setDeviceId(event.target.value)}
            sx={{ minWidth: 200 }}
          >
            {cameraItems.map(({ device }) => (
              <MenuItem key={device.id} value={String(device.id)}>
                {device.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            type="number"
            label={t('commandIndex')}
            value={channel}
            onChange={(event) => setChannel(Number(event.target.value) || 1)}
            sx={{ width: 100 }}
          />
          <TextField
            size="small"
            type="datetime-local"
            label={t('reportFrom')}
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            size="small"
            type="datetime-local"
            label={t('reportTo')}
            value={to}
            onChange={(event) => setTo(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <Button variant="contained" onClick={search} disabled={loading || !deviceId}>
            {loading ? <CircularProgress size={24} /> : t('reportShow')}
          </Button>
        </div>
      </Paper>
      <div className={classes.content}>
        <List className={classes.list} dense>
          {items?.length === 0 && (
            <ListItemText sx={{ px: 2 }} primary={t('sharedNoData')} />
          )}
          {items?.map((item) => (
            <ListItemButton
              key={recordingKey(item)}
              selected={selected && recordingKey(selected) === recordingKey(item)}
              onClick={() => setSelected(item)}
            >
              <ListItemText
                primary={formatTime(item.startTime, 'seconds')}
                secondary={[
                  formatDuration(item.startTime, item.endTime),
                  formatSize(item.size),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              />
            </ListItemButton>
          ))}
        </List>
        <div className={classes.video}>
          {error && <Typography>{t('errorConnection')}</Typography>}
          {selected && !error && <video ref={videoRef} className={classes.player} controls />}
        </div>
      </div>
    </div>
    </PageLayout>
  );
};

export default RecordingsPage;
