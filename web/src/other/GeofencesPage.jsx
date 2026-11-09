import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Divider, Typography, IconButton, Toolbar, Paper } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import { makeStyles } from 'tss-react/mui';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useNavigate } from 'react-router-dom';
import MapView from '../map/core/MapView';
import MapCurrentLocation from '../map/MapCurrentLocation';
import MapGeofenceEdit from '../map/draw/MapGeofenceEdit';
import GeofencesList from './GeofencesList';
import { useTranslation } from '../common/components/LocalizationProvider';
import MapGeocoder from '../map/control/MapGeocoder';
import { messagesActions } from '../store';
import MapScale from '../map/MapScale';
import BackIcon from '../common/components/BackIcon';
import fetchOrThrow from '../common/util/fetchOrThrow';
import MainSidebar from '../main/MainSidebar';

const useStyles = makeStyles()((theme) => ({
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  content: {
    flexGrow: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'row',
    [theme.breakpoints.down('sm')]: {
      flexDirection: 'column-reverse',
    },
  },
  drawer: {
    display: 'flex',
    flexDirection: 'column',
    [theme.breakpoints.up('sm')]: {
      width: theme.dimensions.drawerWidthDesktop,
    },
    [theme.breakpoints.down('sm')]: {
      height: theme.dimensions.drawerHeightPhone,
    },
  },
  mapContainer: {
    flexGrow: 1,
  },
  title: {
    flexGrow: 1,
  },
  fileInput: {
    display: 'none',
  },
  desktopRoot: {
    height: '100%',
    display: 'flex',
    background: theme.palette.mode === 'dark' ? theme.palette.background.default : '#eef3fb',
  },
  desktopColumn: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  desktopHeader: {
    display: 'flex',
    alignItems: 'center',
    height: 72,
    padding: theme.spacing(0, 2),
  },
  desktopBody: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    gap: theme.spacing(1.5),
    padding: theme.spacing(0, 2, 2, 0),
  },
  listPanel: {
    width: theme.dimensions.drawerWidthDesktop,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 1px 6px rgba(15, 33, 71, 0.12)',
  },
  mapArea: {
    flex: 1,
    minWidth: 0,
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 1px 6px rgba(15, 33, 71, 0.12)',
  },
}));

const GeofencesPage = () => {
  const { classes } = useStyles();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const t = useTranslation();
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));

  const [selectedGeofenceId, setSelectedGeofenceId] = useState();

  const handleFile = (event) => {
    const files = Array.from(event.target.files);
    const [file] = files;
    const reader = new FileReader();
    reader.onload = async () => {
      const xml = new DOMParser().parseFromString(reader.result, 'text/xml');
      const segment = xml.getElementsByTagName('trkseg')[0];
      const coordinates = Array.from(segment.getElementsByTagName('trkpt'))
        .map((point) => `${point.getAttribute('lat')} ${point.getAttribute('lon')}`)
        .join(', ');
      const area = `LINESTRING (${coordinates})`;
      const newItem = { name: t('sharedGeofence'), area };
      try {
        const response = await fetchOrThrow('api/geofences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newItem),
        });
        const item = await response.json();
        navigate(`/settings/geofence/${item.id}`);
      } catch (error) {
        dispatch(messagesActions.push(error.message));
      }
    };
    reader.onerror = (event) => {
      dispatch(messagesActions.push(event.target.error));
    };
    reader.readAsText(file);
  };

  const uploadButton = (
    <label htmlFor="upload-gpx">
      <input
        accept=".gpx"
        id="upload-gpx"
        type="file"
        className={classes.fileInput}
        onChange={handleFile}
      />
      <IconButton edge="end" component="span" onClick={() => {}}>
        <Tooltip title={t('sharedUpload')}>
          <UploadFileIcon />
        </Tooltip>
      </IconButton>
    </label>
  );

  const mapContent = (
    <>
      <MapView>
        <MapGeofenceEdit selectedGeofenceId={selectedGeofenceId} />
      </MapView>
      <MapScale />
      <MapCurrentLocation />
      <MapGeocoder />
    </>
  );

  if (desktop) {
    return (
      <div className={classes.desktopRoot}>
        <MainSidebar />
        <div className={classes.desktopColumn}>
          <div className={classes.desktopHeader}>
            <Typography variant="h5" fontWeight={700} className={classes.title}>
              {t('sharedGeofences')}
            </Typography>
            {uploadButton}
          </div>
          <div className={classes.desktopBody}>
            <Paper className={classes.listPanel}>
              <GeofencesList onGeofenceSelected={setSelectedGeofenceId} />
            </Paper>
            <div className={classes.mapArea}>{mapContent}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={classes.root}>
      <div className={classes.content}>
        <Paper square className={classes.drawer}>
          <Toolbar>
            <IconButton edge="start" sx={{ mr: 2 }} onClick={() => navigate(-1)}>
              <BackIcon />
            </IconButton>
            <Typography variant="h6" className={classes.title}>
              {t('sharedGeofences')}
            </Typography>
            <label htmlFor="upload-gpx">
              <input
                accept=".gpx"
                id="upload-gpx"
                type="file"
                className={classes.fileInput}
                onChange={handleFile}
              />
              <IconButton edge="end" component="span" onClick={() => {}}>
                <Tooltip title={t('sharedUpload')}>
                  <UploadFileIcon />
                </Tooltip>
              </IconButton>
            </label>
          </Toolbar>
          <Divider />
          <GeofencesList onGeofenceSelected={setSelectedGeofenceId} />
        </Paper>
        <div className={classes.mapContainer}>
          <MapView>
            <MapGeofenceEdit selectedGeofenceId={selectedGeofenceId} />
          </MapView>
          <MapScale />
          <MapCurrentLocation />
          <MapGeocoder />
        </div>
      </div>
    </div>
  );
};

export default GeofencesPage;
