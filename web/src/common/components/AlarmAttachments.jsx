import { useEffect, useRef, useState } from 'react';
import { Dialog, IconButton, Paper, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import { makeStyles } from 'tss-react/mui';
import { default as Hls, Events } from 'hls.js';
import { useTranslation } from './LocalizationProvider';
import fetchOrThrow from '../util/fetchOrThrow';

const useStyles = makeStyles()((theme) => ({
  root: {
    position: 'absolute',
    left: theme.spacing(2),
    bottom: theme.spacing(4),
    zIndex: 2,
    width: theme.dimensions.eventsDrawerWidth || 380,
    maxWidth: `calc(100% - ${theme.spacing(4)})`,
    maxHeight: '55%',
    overflowY: 'auto',
    padding: theme.spacing(1.5),
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  title: {
    flexGrow: 1,
    fontWeight: 700,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: theme.spacing(1),
  },
  image: {
    width: '100%',
    aspectRatio: '16 / 9',
    objectFit: 'cover',
    borderRadius: theme.shape.borderRadius,
    cursor: 'zoom-in',
    background: theme.palette.action.hover,
  },
  video: {
    width: '100%',
    aspectRatio: '16 / 9',
    borderRadius: theme.shape.borderRadius,
    background: '#000',
    gridColumn: '1 / -1',
  },
  full: {
    maxWidth: '100%',
    maxHeight: '90vh',
    display: 'block',
    margin: 'auto',
  },
}));

const ClipPlayer = ({ src, className }) => {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const url = new URL(src, document.baseURI).href;
    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(element);
      hls.on(Events.ERROR, () => {});
      return () => hls.destroy();
    }
    element.src = url;
    return undefined;
  }, [src]);

  return <video ref={ref} className={className} controls playsInline muted preload="metadata" />;
};

const AlarmAttachments = ({ deviceId, label, inline }) => {
  const { classes } = useStyles();
  const t = useTranslation();

  const [files, setFiles] = useState(null);
  const [reload, setReload] = useState(0);
  const [zoom, setZoom] = useState(null);

  useEffect(() => {
    if (!deviceId || !label) return undefined;
    const controller = new AbortController();
    let timer;
    let attempts = 0;
    const load = async () => {
      try {
        const response = await fetchOrThrow(
          `api/alarmfiles?deviceId=${deviceId}&label=${label}`,
          { signal: controller.signal },
        );
        const list = await response.json();
        setFiles(list);
        // the device uploads the files after reporting the alarm, so keep looking for a while
        attempts += 1;
        if (list.length === 0 && attempts < 20) {
          timer = setTimeout(load, 15000);
        }
      } catch (error) {
        if (error.name !== 'AbortError') setFiles([]);
      }
    };
    load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [deviceId, label, reload]);

  const base = `api/alarmfiles/${deviceId}/${label}`;
  const images = (files || []).filter((file) => file.kind === 'image');
  const videos = (files || []).filter((file) => file.kind === 'video');

  return (
    <Paper className={inline ? undefined : classes.root} elevation={inline ? 0 : 4}>
      <div className={classes.header}>
        <Typography variant="subtitle1" className={classes.title}>
          {t('eventAttachments')}
        </Typography>
        <IconButton size="small" onClick={() => setReload((value) => value + 1)}>
          <RefreshIcon fontSize="small" />
        </IconButton>
      </div>
      {files === null && <Typography variant="body2">{t('sharedLoading')}</Typography>}
      {files !== null && files.length === 0 && (
        <Typography variant="body2" color="textSecondary">
          {t('eventAttachmentsEmpty')}
        </Typography>
      )}
      <div className={classes.grid}>
        {videos.map((file) => (
          <ClipPlayer
            key={file.name}
            className={classes.video}
            src={`${base}/${encodeURIComponent(file.name)}/playlist.m3u8`}
          />
        ))}
        {images.map((file) => (
          <img
            key={file.name}
            className={classes.image}
            src={`${base}/${encodeURIComponent(file.name)}`}
            alt={file.name}
            loading="lazy"
            onClick={() => setZoom(file.name)}
          />
        ))}
      </div>
      <Dialog open={Boolean(zoom)} onClose={() => setZoom(null)} maxWidth="lg">
        <IconButton
          onClick={() => setZoom(null)}
          sx={{ position: 'absolute', right: 8, top: 8, bgcolor: 'background.paper' }}
        >
          <CloseIcon />
        </IconButton>
        {zoom && (
          <img className={classes.full} src={`${base}/${encodeURIComponent(zoom)}`} alt={zoom} />
        )}
      </Dialog>
    </Paper>
  );
};

export default AlarmAttachments;
