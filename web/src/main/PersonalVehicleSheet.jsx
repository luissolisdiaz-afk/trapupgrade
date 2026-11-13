import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  Box,
  Button,
  ButtonBase,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Switch,
  Typography,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import CloseIcon from '@mui/icons-material/Close';
import PlaceIcon from '@mui/icons-material/Place';
import ShareIcon from '@mui/icons-material/Share';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import TimelineIcon from '@mui/icons-material/Timeline';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsRemoteIcon from '@mui/icons-material/SettingsRemote';
import ShieldIcon from '@mui/icons-material/Shield';
import BatteryFullIcon from '@mui/icons-material/BatteryFull';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import EngineLockIcon from '../common/components/EngineLockIcon';
import SwipeConfirm from '../common/components/SwipeConfirm';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useStreetAddress } from '../common/components/StatusCard';
import { useCatch, useCatchCallback } from '../reactHelper';
import { geofencesActions, messagesActions } from '../store';
import fetchOrThrow from '../common/util/fetchOrThrow';

const useStyles = makeStyles()((theme) => ({
  root: {
    position: 'fixed',
    zIndex: 5,
    left: 0,
    right: 0,
    bottom: theme.dimensions.bottomBarHeight,
    borderRadius: '20px 20px 0 0',
    maxHeight: `calc(100vh - ${theme.dimensions.bottomBarHeight + 80}px)`,
    overflowY: 'auto',
    padding: theme.spacing(1, 2, 2),
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.palette.divider,
    margin: '0 auto 8px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  indicators: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
    marginTop: theme.spacing(1.5),
    padding: theme.spacing(1.5),
    borderRadius: 12,
    backgroundColor: theme.palette.action.hover,
  },
  quick: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: theme.spacing(1),
    marginTop: theme.spacing(1.5),
  },
}));

const COLORS = { green: '#2e9e44', yellow: '#f5a623', gray: '#9e9e9e', red: '#d32f2f' };

const formatAgo = (seconds) => {
  if (seconds < 60) return `${Math.max(seconds, 1)} s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h`;
  return `${Math.floor(seconds / 86400)} d`;
};

const formatSpan = (ms) => {
  const minutes = Math.max(Math.floor(ms / 60000), 1);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
};

const json = (method, body) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const permission = (method, body) => fetchOrThrow('api/permissions', json(method, body));

const ALERTS = [
  { key: 'ignitionOn', type: 'ignitionOn', label: 'pvAlertIgnition' },
  {
    key: 'battery',
    type: 'alarm',
    alarms: 'powerCut,powerOff,lowBattery,lowPower',
    label: 'pvAlertBattery',
  },
  { key: 'overspeed', type: 'deviceOverspeed', label: 'pvAlertSpeed' },
];

const ActionTile = ({ icon, label, onClick, disabled, color }) => (
  <ButtonBase
    onClick={onClick}
    disabled={disabled}
    sx={{
      flexDirection: 'column',
      gap: 0.5,
      py: 1,
      px: 0.5,
      borderRadius: 2,
      bgcolor: color ? `${color}.main` : 'action.hover',
      color: color ? '#fff' : 'text.primary',
      opacity: disabled ? 0.4 : 1,
      textAlign: 'center',
    }}
  >
    {icon}
    <Typography variant="caption" sx={{ lineHeight: 1.15, fontWeight: 600 }}>
      {label}
    </Typography>
  </ButtonBase>
);

const PersonalVehicleSheet = ({ deviceId, position, onClose }) => {
  const { classes } = useStyles();
  const t = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const device = useSelector((state) => state.devices.items[deviceId]);
  const geofences = useSelector((state) => state.geofences.items);
  const user = useSelector((state) => state.session.user);
  const shareDisabled = useSelector((state) => state.session.server.attributes.disableShare);
  const lockMaxSpeed =
    Number(useSelector((state) => state.session.server.attributes['ui.lockMaxSpeed'])) || 0;

  const fullAddress = useStreetAddress(position);
  const address = fullAddress
    ?.replace(/,\s*Regi[oó]n\s[^,]*(,[^,]*)*$/i, '')
    .replace(/,\s*(CL|Chile)$/i, '');
  const online = device?.status === 'online';

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  /* ---------- estado ---------- */
  const speedKmh = position ? Math.round(position.speed * 1.852) : 0;
  const ignition = position?.attributes?.ignition;
  const moving = online && speedKmh > 3;

  const [parkedSince, setParkedSince] = useState(null);
  const parked = !moving && ignition !== true;
  useEffect(() => {
    setParkedSince(null);
    if (!parked || !position) return undefined;
    const controller = new AbortController();
    const query = new URLSearchParams({
      deviceId,
      from: dayjs().subtract(3, 'day').toISOString(),
      to: dayjs().toISOString(),
    });
    fetchOrThrow(`api/reports/stops?${query.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((stops) => {
        const last = stops[stops.length - 1];
        if (last) setParkedSince(new Date(last.startTime).getTime());
      })
      .catch(() => {});
    return () => controller.abort();
  }, [deviceId, parked, position?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  let engine;
  if (!online) {
    engine = { color: COLORS.gray, text: t('pvOffline') };
  } else if (moving) {
    engine = { color: COLORS.green, text: `${speedKmh} km/h` };
  } else if (ignition === true) {
    engine = { color: COLORS.yellow, text: `${t('pvIdle')} - 0 km/h` };
  } else {
    engine = {
      color: COLORS.gray,
      text: parkedSince ? `${t('pvParked')} ${formatSpan(now - parkedSince)}` : t('pvParkedNow'),
    };
  }

  const voltage = [position?.attributes?.power, position?.attributes?.battery].find(
    (v) => typeof v === 'number',
  );
  let battery = null;
  if (online && voltage !== undefined) {
    const low = voltage > 18 ? 23 : 11.8;
    const warn = voltage > 18 ? 22 : 11;
    battery = {
      color: voltage >= low ? COLORS.green : voltage >= warn ? COLORS.yellow : COLORS.red,
      text: `${voltage >= low ? t('pvBatteryOk') : t('pvBatteryLow')} (${voltage.toFixed(1)}V)`,
    };
  }

  const geofenceName = (position?.geofenceIds || [])
    .map((id) => geofences[id])
    .filter((g) => g && !g.attributes?.watch)
    .map((g) => g.name)[0];

  const ageSeconds = device?.lastUpdate ? Math.round((now - new Date(device.lastUpdate)) / 1000) : null;
  const updated =
    ageSeconds === null
      ? ''
      : online && ageSeconds < 90
        ? t('pvLive')
        : t('pvUpdated').replace('{0}', formatAgo(ageSeconds));

  /* ---------- inmovilizador ---------- */
  const [quickCommands, setQuickCommands] = useState([]);
  const [assumedLock, setAssumedLock] = useState(null);
  const [lockDialog, setLockDialog] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(`lockState-${deviceId}`);
      setAssumedLock(saved ? JSON.parse(saved) : null);
    } catch {
      setAssumedLock(null);
    }
    const controller = new AbortController();
    setQuickCommands([]);
    fetchOrThrow(`api/commands/send?deviceId=${deviceId}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((list) => setQuickCommands(list))
      .catch(() => {});
    return () => controller.abort();
  }, [deviceId]);

  const lockCommand = quickCommands.find((it) => it.attributes?.quickAction && it.attributes?.quickActionKind === 'lock');
  const unlockCommand = quickCommands.find((it) => it.attributes?.quickAction && it.attributes?.quickActionKind === 'unlock');
  const otherCommands = quickCommands.filter((it) => !it.attributes?.quickAction);
  const [commandsOpen, setCommandsOpen] = useState(false);

  const sendOther = useCatch(async (command) => {
    setCommandsOpen(false);
    const response = await fetchOrThrow('api/commands/send', json('POST', { ...command, deviceId }));
    dispatch(
      messagesActions.push({
        message: t(response.status === 202 ? 'commandQueued' : 'commandSent'),
        severity: 'success',
      }),
    );
  });
  const hasLock = Boolean(lockCommand && unlockCommand);
  const reportedBlocked = position?.attributes?.blocked;
  let locked = null;
  let sent = false;
  if (typeof reportedBlocked === 'boolean') {
    locked = reportedBlocked;
  } else if (assumedLock) {
    locked = assumedLock.locked;
    sent = true;
  }

  const openLockDialog = () => {
    if (locked === false && lockMaxSpeed && speedKmh > lockMaxSpeed) {
      dispatch(
        messagesActions.push({
          message: `${t('cardLockSpeed')} ${lockMaxSpeed} km/h`,
          severity: 'warning',
        }),
      );
      return;
    }
    setLockDialog(true);
  };
  // si el estado es desconocido, se ofrece cortar (acción más habitual del cliente)
  const willLock = locked !== true;

  const sendLock = useCatch(async () => {
    const command = { ...(willLock ? lockCommand : unlockCommand), deviceId };
    setLockDialog(false);
    const response = await fetchOrThrow('api/commands/send', json('POST', command));
    const state = { locked: willLock, time: Date.now() };
    setAssumedLock(state);
    try {
      window.localStorage.setItem(`lockState-${deviceId}`, JSON.stringify(state));
    } catch {
      // storage unavailable
    }
    dispatch(
      messagesActions.push({
        message: t(response.status === 202 ? 'commandQueued' : 'commandSent'),
        severity: 'success',
      }),
    );
  });

  /* ---------- compartir y cómo llegar ---------- */
  const [shareAnchor, setShareAnchor] = useState(null);
  const [walkAnchor, setWalkAnchor] = useState(null);

  const share = useCatch(async (hours) => {
    setShareAnchor(null);
    const expiration = dayjs().add(hours, 'hour').toISOString();
    const response = await fetchOrThrow('api/share/device', {
      method: 'POST',
      body: new URLSearchParams({ deviceId, expiration }),
    });
    const url = `${document.baseURI}?token=${await response.text()}`;
    const text = `${device.name} (${hours} h)`;
    if (navigator.share) {
      navigator.share({ title: device.name, text, url }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${text}: ${url}`)}`, '_blank', 'noopener');
    }
  });

  const walkLinks = position
    ? {
        google: `https://www.google.com/maps/dir/?api=1&destination=${position.latitude}%2C${position.longitude}&travelmode=walking`,
        waze: `https://waze.com/ul?ll=${position.latitude}%2C${position.longitude}&navigate=yes`,
      }
    : {};

  /* ---------- vigilar aquí ---------- */
  const [watch, setWatch] = useState(null);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alerts, setAlerts] = useState({});

  const refreshGeofences = async () => {
    const response = await fetchOrThrow('api/geofences');
    dispatch(geofencesActions.refresh(await response.json()));
  };

  useEffect(() => {
    const controller = new AbortController();
    setWatch(null);
    fetchOrThrow(`api/geofences?deviceId=${deviceId}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((list) => {
        const found = list.find((g) => g.attributes?.watch);
        if (found) setWatch({ id: found.id, notificationId: found.attributes.notificationId });
      })
      .catch(() => {});
    return () => controller.abort();
  }, [deviceId]);

  const toggleWatch = useCatchCallback(
    async (enabled) => {
      if (enabled) {
        const notification = await (
          await fetchOrThrow(
            'api/notifications',
            json('POST', {
              type: 'geofenceExit',
              always: false,
              notificators: 'web',
              attributes: { personal: 'watch' },
            }),
          )
        ).json();
        const geofence = await (
          await fetchOrThrow(
            'api/geofences',
            json('POST', {
              name: `${t('pvWatchName')} - ${device.name}`,
              area: `CIRCLE (${position.latitude} ${position.longitude}, 100)`,
              attributes: { watch: true, notificationId: notification.id },
            }),
          )
        ).json();
        await permission('POST', { deviceId, geofenceId: geofence.id });
        await permission('POST', { deviceId, notificationId: notification.id });
        setWatch({ id: geofence.id, notificationId: notification.id });
        dispatch(messagesActions.push({ message: t('pvWatchOn'), severity: 'success' }));
      } else if (watch) {
        await fetchOrThrow(`api/geofences/${watch.id}`, { method: 'DELETE' });
        if (watch.notificationId) {
          await fetchOrThrow(`api/notifications/${watch.notificationId}`, { method: 'DELETE' });
        }
        setWatch(null);
        dispatch(messagesActions.push({ message: t('pvWatchOff'), severity: 'success' }));
      }
      await refreshGeofences();
    },
    [watch, position, device, deviceId],
  );

  /* ---------- alertas del vehículo ---------- */
  const loadAlerts = useCatchCallback(async () => {
    const list = await (await fetchOrThrow(`api/notifications?deviceId=${deviceId}`)).json();
    const result = {};
    ALERTS.forEach((alert) => {
      const found = list.find(
        (n) => n.type === alert.type && n.attributes?.personal === 'alert',
      );
      if (found) result[alert.key] = found.id;
    });
    setAlerts(result);
  }, [deviceId]);

  useEffect(() => {
    if (alertsOpen) loadAlerts();
  }, [alertsOpen, loadAlerts]);

  const toggleAlert = useCatchCallback(
    async (alert, enabled) => {
      if (enabled) {
        const body = {
          type: alert.type,
          always: false,
          notificators: 'web',
          attributes: { personal: 'alert', ...(alert.alarms ? { alarms: alert.alarms } : {}) },
        };
        const notification = await (await fetchOrThrow('api/notifications', json('POST', body))).json();
        await permission('POST', { deviceId, notificationId: notification.id });
        setAlerts((a) => ({ ...a, [alert.key]: notification.id }));
      } else if (alerts[alert.key]) {
        await fetchOrThrow(`api/notifications/${alerts[alert.key]}`, { method: 'DELETE' });
        setAlerts((a) => {
          const { [alert.key]: removed, ...rest } = a;
          return rest;
        });
      }
    },
    [alerts, deviceId],
  );

  if (!device) return null;

  const plate = device.attributes?.plate;

  return (
    <>
      <Paper elevation={8} className={classes.root}>
        <div className={classes.grabber} />

        {/* 1. identificación y ubicación */}
        <div className={classes.row} style={{ alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" fontWeight={700} noWrap>
              {device.name}
            </Typography>
            {plate && (
              <Chip
                size="small"
                label={plate}
                sx={{ fontWeight: 700, letterSpacing: 1, borderRadius: 1, mt: 0.25 }}
              />
            )}
          </Box>
          <IconButton size="small" onClick={onClose} onTouchStart={onClose}>
            <CloseIcon />
          </IconButton>
        </div>
        {position && (
          <div className={classes.row} style={{ marginTop: 8, alignItems: 'flex-start' }}>
            <PlaceIcon fontSize="small" color="action" />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2">
                {address || `${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}`}
              </Typography>
              {geofenceName && (
                <Typography variant="caption" color="primary" fontWeight={600}>
                  {geofenceName}
                </Typography>
              )}
            </Box>
          </div>
        )}
        <Typography variant="caption" color="textSecondary">
          {updated}
        </Typography>

        {/* 2. indicadores */}
        <div className={classes.indicators}>
          <div className={classes.row}>
            <PowerSettingsNewIcon fontSize="small" sx={{ color: engine.color }} />
            <Typography variant="body2" fontWeight={600}>
              {engine.text}
            </Typography>
          </div>
          {battery && (
            <div className={classes.row}>
              <BatteryFullIcon fontSize="small" sx={{ color: battery.color }} />
              <Typography variant="body2" fontWeight={600}>
                {battery.text}
              </Typography>
            </div>
          )}
          {hasLock && (
            <div className={classes.row}>
              <EngineLockIcon sx={{ fontSize: 22 }} locked={locked === true} />
              <Typography variant="body2" fontWeight={600}>
                {locked === null
                  ? t('pvEngineUnknown')
                  : `${locked ? t('pvEngineBlocked') : t('pvEngineEnabled')}${sent ? ` (${t('pvSent')})` : ''}`}
              </Typography>
            </div>
          )}
        </div>

        {/* 3. acciones directas */}
        {hasLock && (
          <Button
            fullWidth
            size="large"
            variant="contained"
            color={locked === true ? 'success' : 'error'}
            startIcon={<PowerSettingsNewIcon />}
            sx={{ mt: 1.5, borderRadius: 3, fontWeight: 700 }}
            onClick={openLockDialog}
          >
            {locked === true ? t('pvEnableEngine') : t('pvCutEngine')}
          </Button>
        )}
        <div className={classes.quick}>
          {!shareDisabled && !user.temporary && (
            <ActionTile
              icon={<ShareIcon />}
              label={t('pvShareLive')}
              disabled={!position}
              onClick={(e) => setShareAnchor(e.currentTarget)}
            />
          )}
          <ActionTile
            icon={<DirectionsWalkIcon />}
            label={t('pvWalkToCar')}
            disabled={!position}
            onClick={(e) => setWalkAnchor(e.currentTarget)}
          />
          <ActionTile
            icon={<TimelineIcon />}
            label={t('cardTodayRoute')}
            disabled={!position}
            onClick={() => {
              const query = new URLSearchParams({
                deviceId,
                from: dayjs().startOf('day').toISOString(),
                to: dayjs().endOf('day').toISOString(),
              });
              navigate(`/replay?${query.toString()}`);
            }}
          />
        </div>

        {/* 4. consultas rápidas */}
        <div className={classes.indicators}>
          <FormControlLabel
            sx={{ m: 0, justifyContent: 'space-between' }}
            labelPlacement="start"
            disabled={!position}
            control={<Switch checked={Boolean(watch)} onChange={(e) => toggleWatch(e.target.checked)} />}
            label={
              <span className={classes.row}>
                <ShieldIcon fontSize="small" color="action" />
                <Typography variant="body2" fontWeight={600}>
                  {t('pvWatchHere')}
                </Typography>
              </span>
            }
          />
          <Button
            startIcon={<NotificationsIcon />}
            onClick={() => setAlertsOpen(true)}
            sx={{ justifyContent: 'flex-start', textTransform: 'none', fontWeight: 600 }}
          >
            {t('pvVehicleAlerts')}
          </Button>
          {otherCommands.length > 0 && (
            <Button
              startIcon={<SettingsRemoteIcon />}
              onClick={() => setCommandsOpen(true)}
              sx={{ justifyContent: 'flex-start', textTransform: 'none', fontWeight: 600 }}
            >
              {t('pvMoreCommands')}
            </Button>
          )}
        </div>
      </Paper>

      <Menu anchorEl={shareAnchor} open={Boolean(shareAnchor)} onClose={() => setShareAnchor(null)}>
        {[1, 4, 24].map((hours) => (
          <MenuItem key={hours} onClick={() => share(hours)}>
            {`${hours} h`}
          </MenuItem>
        ))}
      </Menu>
      <Menu anchorEl={walkAnchor} open={Boolean(walkAnchor)} onClose={() => setWalkAnchor(null)}>
        <MenuItem component="a" href={walkLinks.google} target="_blank" rel="noopener">
          Google Maps
        </MenuItem>
        <MenuItem component="a" href={walkLinks.waze} target="_blank" rel="noopener">
          Waze
        </MenuItem>
      </Menu>

      <Dialog open={lockDialog} onClose={() => setLockDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle>{willLock ? t('pvCutEngine') : t('pvEnableEngine')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {device.name}: {t(willLock ? 'pvCutHint' : 'pvEnableHint')}
          </Typography>
          <SwipeConfirm
            label={t('pvSwipe')}
            color={willLock ? 'error' : 'success'}
            onConfirm={sendLock}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLockDialog(false)}>{t('sharedCancel')}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={commandsOpen} onClose={() => setCommandsOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t('pvMoreCommands')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {otherCommands.map((command) => (
            <Button key={command.id} variant="outlined" onClick={() => sendOther(command)}>
              {command.description}
            </Button>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommandsOpen(false)}>{t('sharedCancel')}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={alertsOpen} onClose={() => setAlertsOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t('pvVehicleAlerts')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column' }}>
          {ALERTS.map((alert) => (
            <FormControlLabel
              key={alert.key}
              sx={{ justifyContent: 'space-between', ml: 0 }}
              labelPlacement="start"
              control={
                <Switch
                  checked={Boolean(alerts[alert.key])}
                  onChange={(e) => toggleAlert(alert, e.target.checked)}
                />
              }
              label={t(alert.label)}
            />
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAlertsOpen(false)}>{t('sharedCancel')}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PersonalVehicleSheet;
