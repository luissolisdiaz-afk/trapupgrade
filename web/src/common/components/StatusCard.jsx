import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Rnd } from 'react-rnd';
import dayjs from 'dayjs';
import {
  Card,
  CardContent,
  Typography,
  CardActions,
  IconButton,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Menu,
  MenuItem,
  CardMedia,
  TableFooter,
  Link,
  Tooltip,
  Avatar,
  Chip,
  Collapse,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import CloseIcon from '@mui/icons-material/Close';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SpeedIcon from '@mui/icons-material/Speed';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import NearMeIcon from '@mui/icons-material/NearMe';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import BarChartIcon from '@mui/icons-material/BarChart';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import BoltIcon from '@mui/icons-material/Bolt';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import DirectionsIcon from '@mui/icons-material/Directions';

import useFeatures from '../util/useFeatures';
import { useTranslation } from './LocalizationProvider';
import RemoveDialog from './RemoveDialog';
import PositionValue from './PositionValue';
import { useDeviceReadonly, useRestriction } from '../util/permissions';
import usePositionAttributes from '../attributes/usePositionAttributes';
import { devicesActions, messagesActions } from '../../store';
import { useCatch, useCatchCallback } from '../../reactHelper';
import { useAttributePreference } from '../util/preferences';
import fetchOrThrow from '../util/fetchOrThrow';
import { formatStatus, formatTime } from '../util/formatter';
import { speedFromKnots, speedUnitString } from '../util/converter';
import { mapIconKey, mapIcons } from '../../map/core/preloadImages';

const useStyles = makeStyles()((theme, { desktopPadding }) => ({
  card: {
    pointerEvents: 'auto',
    width: 430,
    maxWidth: '92vw',
    borderRadius: 16,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    padding: theme.spacing(1.5, 1.5, 0, 2),
  },
  summary: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: theme.spacing(2, 1.5),
  },
  summaryItem: {
    display: 'flex',
    gap: theme.spacing(1),
    alignItems: 'flex-start',
    minWidth: 0,
    color: theme.palette.text.secondary,
  },
  pill: {
    borderRadius: 24,
    textTransform: 'none',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(1, 1, 0, 2),
    color: theme.palette.text.secondary,
  },
  media: {
    height: theme.dimensions.popupImageHeight,
    '& > div': {
      color: theme.palette.common.white,
      mixBlendMode: 'difference',
    },
  },
  content: {
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
    maxHeight: theme.dimensions.cardContentMaxHeight,
    overflow: 'auto',
  },
  icon: {
    width: '25px',
    height: '25px',
    filter: 'brightness(0) invert(1)',
  },
  table: {
    '& .MuiTableCell-sizeSmall': {
      paddingLeft: 0,
      paddingRight: 0,
    },
    '& .MuiTableCell-sizeSmall:first-of-type': {
      paddingRight: theme.spacing(1),
    },
  },
  cell: {
    borderBottom: 'none',
  },
  actions: {
    justifyContent: 'space-between',
  },
  root: {
    pointerEvents: 'none',
    position: 'fixed',
    zIndex: 5,
    left: '50%',
    [theme.breakpoints.up('md')]: {
      left: `calc(50% + ${desktopPadding} / 2)`,
      bottom: theme.spacing(3),
    },
    [theme.breakpoints.down('md')]: {
      left: '50%',
      bottom: `calc(${theme.spacing(3)} + ${theme.dimensions.bottomBarHeight}px)`,
    },
    transform: 'translateX(-50%)',
  },
}));


const SummaryItem = ({ icon, primary, secondary, wide }) => {
  const { classes } = useStyles({ desktopPadding: 0 });
  return (
    <div className={classes.summaryItem} style={wide ? { gridColumn: '1 / -1' } : undefined}>
      {icon}
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle1" color="textPrimary" fontWeight={600} sx={{ lineHeight: 1.2 }}>
          {primary}
        </Typography>
        <Typography variant="caption" color="textSecondary" noWrap component="div">
          {secondary}
        </Typography>
      </Box>
    </div>
  );
};

const StatusRow = ({ name, content }) => {
  const { classes } = useStyles({ desktopPadding: 0 });

  return (
    <TableRow>
      <TableCell className={classes.cell}>
        <Typography variant="body2">{name}</Typography>
      </TableCell>
      <TableCell className={classes.cell}>
        <Typography variant="body2" color="textSecondary">
          {content}
        </Typography>
      </TableCell>
    </TableRow>
  );
};

const StatusCard = ({ deviceId, position, onClose, disableActions, desktopPadding = 0 }) => {
  const { classes, cx } = useStyles({ desktopPadding });
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const t = useTranslation();
  const features = useFeatures();

  const readonly = useRestriction('readonly');
  const deviceReadonly = useDeviceReadonly();

  const shareDisabled = useSelector((state) => state.session.server.attributes.disableShare);
  const user = useSelector((state) => state.session.user);
  const device = useSelector((state) => state.devices.items[deviceId]);

  const deviceImage = device?.attributes?.deviceImage;

  const positionAttributes = usePositionAttributes(t);
  const positionItems = useAttributePreference(
    'positionItems',
    'fixTime,address,speed,totalDistance',
  );

  const navigationAppLink = useAttributePreference('navigationAppLink');
  const navigationAppTitle = useAttributePreference('navigationAppTitle');

  const [anchorEl, setAnchorEl] = useState(null);
  const [details, setDetails] = useState(false);
  const speedUnit = useAttributePreference('speedUnit', 'kmh');

  const [removing, setRemoving] = useState(false);

  const simpleState =
    device?.status !== 'online'
      ? { color: 'default', label: t('cardNoSignal') }
      : position && position.speed > 1
        ? { color: 'success', label: t('cardMoving') }
        : { color: 'warning', label: t('cardStopped') };
  const mapsLink = position && `https://www.google.com/maps/search/?api=1&query=${position.latitude}%2C${position.longitude}`;

  const handleRemove = useCatch(async (removed) => {
    if (removed) {
      const response = await fetchOrThrow('api/devices');
      dispatch(devicesActions.refresh(await response.json()));
    }
    setRemoving(false);
  });

  const [quickCommands, setQuickCommands] = useState([]);
  const [quickConfirm, setQuickConfirm] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setQuickCommands([]);
    fetchOrThrow(`api/commands/send?deviceId=${deviceId}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((list) => setQuickCommands(list.filter((it) => it.attributes?.quickAction)))
      .catch(() => {});
    return () => controller.abort();
  }, [deviceId]);

  const sendQuickCommand = useCatch(async () => {
    const command = { ...quickConfirm, deviceId };
    setQuickConfirm(null);
    const response = await fetchOrThrow('api/commands/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
    });
    dispatch(
      messagesActions.push({
        message: t(response.status === 202 ? 'commandQueued' : 'commandSent'),
        severity: 'success',
      }),
    );
  });

  const handleGeofence = useCatchCallback(async () => {
    const newItem = {
      name: t('sharedGeofence'),
      area: `CIRCLE (${position.latitude} ${position.longitude}, 50)`,
    };
    const response = await fetchOrThrow('api/geofences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem),
    });
    const item = await response.json();
    await fetchOrThrow('api/permissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: position.deviceId, geofenceId: item.id }),
    });
    navigate(`/settings/geofence/${item.id}`);
  }, [navigate, position, t]);

  return (
    <>
      <div className={classes.root}>
        {device && (
          <Rnd
            default={{ x: 0, y: 0, width: 'auto', height: 'auto' }}
            enableResizing={false}
            dragHandleClassName="draggable-header"
            style={{ position: 'relative' }}
          >
            <Card elevation={6} className={classes.card}>
              <div className={cx('draggable-header', classes.titleRow)}>
                <Avatar sx={{ bgcolor: device.status === 'online' ? '#2e9e44' : '#9e9e9e' }}>
                  <img className={classes.icon} src={mapIcons[mapIconKey(device.category)]} alt="" />
                </Avatar>
                <Typography variant="h6" fontWeight={700} noWrap sx={{ flex: 1 }}>
                  {device.name}
                </Typography>
                <Chip
                  size="small"
                  color={simpleState.color}
                  label={simpleState.label}
                />
                <IconButton size="small" onClick={onClose} onTouchStart={onClose}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </div>
              {deviceImage && (
                <CardMedia
                  component="img"
                  sx={{ height: 120, mt: 1.5 }}
                  image={`api/media/${device.uniqueId}/${deviceImage}`}
                />
              )}
              {position && (
                <CardContent className={classes.content}>
                  <div className={classes.summary}>
                    <SummaryItem
                      icon={<SpeedIcon />}
                      primary={`${Math.round(speedFromKnots(position.speed, speedUnit))} ${speedUnitString(speedUnit, t)}`}
                      secondary={t('positionSpeed')}
                    />
                    <SummaryItem
                      icon={<AccessTimeIcon />}
                      primary={formatTime(device.lastUpdate || position.fixTime, 'minutes')}
                      secondary={t('mainLastSignal')}
                    />
                    <SummaryItem
                      icon={<NearMeIcon />}
                      primary={
                        position.address ||
                        `${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}`
                      }
                      secondary={t('positionAddress')}
                      wide
                    />
                  </div>
                  <Typography variant="body2" sx={{ mt: 1.5 }}>
                    <Link component="button" underline="hover" onClick={() => setDetails(!details)}>
                      {t('mainMoreDetails')}
                    </Link>
                  </Typography>
                  <Collapse in={details} unmountOnExit>
                    <Table size="small" className={classes.table}>
                      <TableBody>
                        {positionItems
                          .split(',')
                          .filter(
                            (key) =>
                              position.hasOwnProperty(key) ||
                              position.attributes.hasOwnProperty(key),
                          )
                          .map((key) => (
                            <StatusRow
                              key={key}
                              name={positionAttributes[key]?.name || key}
                              content={
                                <PositionValue
                                  position={position}
                                  property={position.hasOwnProperty(key) ? key : null}
                                  attribute={position.hasOwnProperty(key) ? null : key}
                                />
                              }
                            />
                          ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell colSpan={2} className={classes.cell}>
                            <Typography variant="body2">
                              <Link component={RouterLink} to={`/position/${position.id}`}>
                                {t('sharedShowDetails')}
                              </Link>
                            </Typography>
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </Collapse>
                </CardContent>
              )}
              <CardActions className={classes.actions} disableSpacing sx={{ flexWrap: 'wrap', gap: 1, p: 2, pt: 0 }}>
                <Button
                  variant="contained"
                  className={classes.pill}
                  startIcon={<PlayArrowIcon />}
                  onClick={() => {
                    const query = new URLSearchParams({
                      deviceId,
                      from: dayjs().startOf('day').toISOString(),
                      to: dayjs().endOf('day').toISOString(),
                    });
                    navigate(`/replay?${query.toString()}`);
                  }}
                  disabled={disableActions || !position}
                >
                  {t('cardTodayRoute')}
                </Button>
                <Button
                  variant="text"
                  className={classes.pill}
                  startIcon={<WhatsAppIcon />}
                  component="a"
                  target="_blank"
                  rel="noopener"
                  href={position ? `https://wa.me/?text=${encodeURIComponent(`${device.name}: ${mapsLink}`)}` : undefined}
                  disabled={!position}
                  sx={{ bgcolor: 'action.hover' }}
                >
                  {t('cardShareLocation')}
                </Button>
                <Button
                  variant="text"
                  className={classes.pill}
                  startIcon={<DirectionsIcon />}
                  component="a"
                  target="_blank"
                  rel="noopener"
                  href={
                    position
                      ? `https://www.google.com/maps/dir/?api=1&destination=${position.latitude}%2C${position.longitude}`
                      : undefined
                  }
                  disabled={!position}
                  sx={{ bgcolor: 'action.hover' }}
                >
                  {t('cardDirections')}
                </Button>
                <Box sx={{ flex: 1 }} />
                {quickCommands.map((command) => {
                  const kind = command.attributes?.quickActionKind;
                  const Icon = { lock: LockIcon, unlock: LockOpenIcon }[kind] || BoltIcon;
                  const color = { lock: 'error', unlock: 'success' }[kind] || 'primary';
                  return (
                    <Tooltip key={command.id} title={command.description}>
                      <IconButton
                        color={color}
                        onClick={() => setQuickConfirm(command)}
                        disabled={disableActions}
                      >
                        <Icon />
                      </IconButton>
                    </Tooltip>
                  );
                })}
                <Tooltip title={t('sharedExtra')}>
                  <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} disabled={!position}>
                    <MoreVertIcon />
                  </IconButton>
                </Tooltip>
              </CardActions>
            </Card>
          </Rnd>
        )}
      </div>
      {position && (
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          <MenuItem
            onClick={() => navigate(`/settings/device/${deviceId}/command`)}
            disabled={disableActions}
          >
            {t('commandTitle')}
          </MenuItem>
          <MenuItem
            onClick={() => navigate(`/reports/route?deviceId=${deviceId}`)}
            disabled={disableActions}
          >
            {t('mainRoute')}
          </MenuItem>
          <MenuItem
            onClick={() => navigate(`/reports/combined?deviceId=${deviceId}`)}
            disabled={disableActions}
          >
            {t('reportTitle')}
          </MenuItem>
          {!features.disableCameras && (
            <MenuItem
              onClick={() => navigate(`/stream?deviceId=${deviceId}`)}
              disabled={position.protocol !== 'jt808'}
            >
              {t('linkLiveVideo')}
            </MenuItem>
          )}
          {!features.disableCameras && (
            <MenuItem
              onClick={() => navigate(`/cameras/recordings?deviceId=${deviceId}`)}
              disabled={position.protocol !== 'jt808'}
            >
              {t('linkRecordings')}
            </MenuItem>
          )}
          {!readonly && <MenuItem onClick={handleGeofence}>{t('sharedCreateGeofence')}</MenuItem>}
          <MenuItem
            component="a"
            target="_blank"
            href={`https://www.google.com/maps/search/?api=1&query=${position.latitude}%2C${position.longitude}`}
          >
            {t('linkGoogleMaps')}
          </MenuItem>
          <MenuItem
            component="a"
            target="_blank"
            href={`https://maps.apple.com/?ll=${position.latitude},${position.longitude}`}
          >
            {t('linkAppleMaps')}
          </MenuItem>
          <MenuItem
            component="a"
            target="_blank"
            href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${position.latitude}%2C${position.longitude}&heading=${position.course}`}
          >
            {t('linkStreetView')}
          </MenuItem>
          {navigationAppTitle && navigationAppLink && (
            <MenuItem
              component="a"
              target="_blank"
              href={navigationAppLink
                .replace('{latitude}', position.latitude)
                .replace('{longitude}', position.longitude)}
            >
              {navigationAppTitle}
            </MenuItem>
          )}
          <MenuItem
            onClick={() => navigate(`/settings/device/${deviceId}`)}
            disabled={disableActions || deviceReadonly}
          >
            {t('sharedEdit')}
          </MenuItem>
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              setRemoving(true);
            }}
            disabled={disableActions || deviceReadonly}
          >
            <Typography color="error">{t('sharedRemove')}</Typography>
          </MenuItem>
          {!shareDisabled && !user.temporary && (
            <MenuItem onClick={() => navigate(`/settings/device/${deviceId}/share`)}>
              <Typography color="secondary">{t('sharedShare')}</Typography>
            </MenuItem>
          )}
        </Menu>
      )}
      <Dialog open={Boolean(quickConfirm)} onClose={() => setQuickConfirm(null)}>
        <DialogTitle>{quickConfirm?.description}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {device?.name}: {t('commandConfirmSend')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuickConfirm(null)}>{t('sharedCancel')}</Button>
          <Button variant="contained" onClick={sendQuickCommand}>
            {t('commandSend')}
          </Button>
        </DialogActions>
      </Dialog>
      <RemoveDialog
        open={removing}
        endpoint="devices"
        itemId={deviceId}
        onResult={(removed) => handleRemove(removed)}
      />
    </>
  );
};

export default StatusCard;
