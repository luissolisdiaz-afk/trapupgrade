import { useEffect, useRef, useState } from 'react';
import { Button, Card, CardActions, IconButton, MenuItem, Select, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { default as Hls, Events } from 'hls.js';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import { useTranslation } from '../common/components/LocalizationProvider';
import fetchOrThrow from '../common/util/fetchOrThrow';

const useStyles = makeStyles()((theme) => ({
  screen: {
    position: 'relative',
    aspectRatio: '16 / 9',
    backgroundColor: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  overlay: {
    position: 'absolute',
    top: theme.spacing(0.5),
    left: theme.spacing(1),
    right: theme.spacing(1),
    display: 'flex',
    justifyContent: 'space-between',
    pointerEvents: 'none',
    textShadow: '0 0 4px #000',
  },
  bar: {
    display: 'flex',
    gap: theme.spacing(1),
    alignItems: 'center',
    padding: theme.spacing(0.5, 1),
  },
  grow: {
    flexGrow: 1,
  },
}));

const MAX_WATCH_MS = 10 * 60 * 1000;

const CameraTile = ({ device, channels = 2, playing, canPlay, onPlay, onStop, onRecordings }) => {
  const { classes } = useStyles();
  const t = useTranslation();
  const videoRef = useRef(null);

  const [channel, setChannel] = useState(1);
  const [stream, setStream] = useState(1); // 1 = SD (sub stream), 0 = HD (main stream)
  const [error, setError] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!playing) return undefined;
    setExpired(false);
    const timer = setTimeout(() => {
      setExpired(true);
      onStop();
    }, MAX_WATCH_MS);
    return () => clearTimeout(timer);
  }, [playing]);

  useEffect(() => {
    if (!playing) return undefined;
    setError(false);
    const send = (type, attributes) =>
      fetchOrThrow('api/commands/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: device.id, type, attributes }),
      }).catch(() => {});
    send('videoStart', { index: channel, stream });
    const hls = new Hls({ liveSyncDurationCount: 2 });
    hls.loadSource(new URL(`api/stream/${device.id}/${channel}/live.m3u8`, document.baseURI).href);
    hls.attachMedia(videoRef.current);
    hls.on(Events.MANIFEST_PARSED, () => videoRef.current?.play().catch(() => {}));
    hls.on(Events.ERROR, (_, data) => {
      if (data.fatal) setError(true);
    });
    return () => {
      // no videoStop here: other tabs may still be watching; the server stops idle streams itself
      hls.destroy();
    };
  }, [playing, device.id, channel, stream]);

  const toggle = () => (playing ? onStop() : onPlay());

  return (
    <Card>
      <div className={classes.screen}>
        {playing && !error ? (
          <video ref={videoRef} className={classes.video} autoPlay muted playsInline controls />
        ) : expired ? (
          <Button variant="contained" onClick={onPlay} disabled={!canPlay}>
            {t('cameraKeepWatching')}
          </Button>
        ) : (
          <IconButton
            color="inherit"
            size="large"
            disabled={!playing && !canPlay}
            onClick={toggle}
            sx={{ border: '2px solid currentColor' }}
          >
            <PlayArrowIcon fontSize="large" />
          </IconButton>
        )}
        {playing && error && <Typography>{t('errorConnection')}</Typography>}
        <div className={classes.overlay}>
          <Typography variant="caption" noWrap>{device.name}</Typography>
          {playing && <Typography variant="caption">{`CH${channel} · ${stream ? 'SD' : 'HD'}`}</Typography>}
        </div>
      </div>
      <CardActions className={classes.bar}>
        <IconButton size="small" color={playing ? 'error' : 'primary'} disabled={!playing && !canPlay} onClick={toggle}>
          {playing ? <StopIcon /> : <PlayArrowIcon />}
        </IconButton>
        {channels > 1 && (
          <Select size="small" value={channel} onChange={(e) => setChannel(e.target.value)}>
            {Array.from({ length: channels }, (_, i) => (
              <MenuItem key={i + 1} value={i + 1}>{`CH ${i + 1}`}</MenuItem>
            ))}
          </Select>
        )}
        <ToggleButtonGroup size="small" exclusive value={stream} onChange={(_, v) => v !== null && setStream(v)}>
          <ToggleButton value={1}>SD</ToggleButton>
          <ToggleButton value={0}>HD</ToggleButton>
        </ToggleButtonGroup>
        <div className={classes.grow} />
        <IconButton size="small" onClick={onRecordings}>
          <VideoLibraryIcon fontSize="small" />
        </IconButton>
      </CardActions>
    </Card>
  );
};

export default CameraTile;
