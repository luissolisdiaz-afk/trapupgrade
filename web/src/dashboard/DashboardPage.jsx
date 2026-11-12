import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import MapIcon from '@mui/icons-material/Map';
import WifiIcon from '@mui/icons-material/Wifi';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import SpeedIcon from '@mui/icons-material/Speed';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import BatteryAlertIcon from '@mui/icons-material/BatteryAlert';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import AddIcon from '@mui/icons-material/Add';
import RouteIcon from '@mui/icons-material/Route';
import PlaceIcon from '@mui/icons-material/Place';
import DescriptionIcon from '@mui/icons-material/Description';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import PeopleIcon from '@mui/icons-material/People';
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';
import PageLayout from '../common/components/PageLayout';
import ReportsMenu from '../reports/components/ReportsMenu';
import MainSidebar from '../main/MainSidebar';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useManager } from '../common/util/permissions';
import { prefixString } from '../common/util/stringUtils';
import { formatTime } from '../common/util/formatter';
import { blueGradient, brand } from '../builder/style';
import useDashboardData from './useDashboardData';

const DAY = 24 * 3600 * 1000;
// every list of the dashboard shows at most this many rows; critical incidents also expire
const MAX_ITEMS = 4;
const CRITICAL_WINDOW = 3600 * 1000;
const CRITICAL = ['sos', 'powerCut', 'jamming', 'tampering', 'accident', 'removing', 'fault'];

const isTrue = (value) => value === true || value === 'true';

const Panel = ({ icon, title, action, children, sx }) => (
  <Card sx={{ borderRadius: '16px', p: 2, boxShadow: '0 1px 6px rgba(15, 33, 71, 0.12)', ...sx }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
      <Box sx={{ color: brand.blue, display: 'flex' }}>{icon}</Box>
      <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>
        {title}
      </Typography>
      {action}
    </Box>
    {children}
  </Card>
);

const Stat = ({ label, value, color }) => (
  <Box sx={{ flex: 1, minWidth: 90, p: 1.5, borderRadius: '12px', bgcolor: 'action.hover' }}>
    <Typography variant="h5" fontWeight={700} sx={{ color }}>
      {value}
    </Typography>
    <Typography variant="caption" color="textSecondary">
      {label}
    </Typography>
  </Box>
);

const More = ({ count, label }) =>
  count > 0 ? (
    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', pt: 1 }}>
      {`+${count} ${label}`}
    </Typography>
  ) : null;

const Empty = ({ text }) => (
  <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
    {text}
  </Typography>
);

const DashboardPage = () => {
  const t = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const manager = useManager();

  const devices = useSelector((state) => state.devices.items);
  const positions = useSelector((state) => state.session.positions);

  const [period, setPeriod] = useState('week');
  const [now, setNow] = useState(() => Date.now());

  // refresh once a minute so old incidents leave the list without reloading the page
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const { data, loading, error, truncated } = useDashboardData(period);

  const stats = useMemo(() => {
    const now = Date.now();
    const list = Object.values(devices);
    const connectivity = { online: 0, recent: 0, offline: 0, never: 0 };
    const units = { active: 0, suspended: 0, workshop: 0 };
    const lowBattery = [];
    const expiring = [];

    list.forEach((device) => {
      const last = device.lastUpdate ? new Date(device.lastUpdate).getTime() : null;
      if (device.status === 'online') connectivity.online += 1;
      else if (last == null) connectivity.never += 1;
      else if (now - last >= DAY) connectivity.offline += 1;
      else connectivity.recent += 1;

      const expiration = device.expirationTime ? new Date(device.expirationTime).getTime() : null;
      if (isTrue(device.attributes?.workshop)) units.workshop += 1;
      else if (device.disabled || (expiration != null && expiration < now)) units.suspended += 1;
      else units.active += 1;

      const level = positions[device.id]?.attributes?.batteryLevel;
      if (device.status === 'online' && typeof level === 'number' && level <= 20) {
        lowBattery.push({ device, level });
      }
      if (expiration != null && expiration >= now && expiration - now <= 30 * DAY) {
        expiring.push({ device, expiration, days: Math.ceil((expiration - now) / DAY) });
      }
    });

    return {
      total: list.length,
      connectivity,
      units,
      lowBattery: lowBattery.sort((a, b) => a.level - b.level),
      expiring: expiring.sort((a, b) => a.expiration - b.expiration),
      recent: [...list].sort((a, b) => b.id - a.id).slice(0, MAX_ITEMS),
    };
  }, [devices, positions]);

  const usage = stats.total ? Math.round((data.usedDevices / stats.total) * 100) : 0;
  const deviceName = (id) => devices[id]?.name || id;
  const criticalAll = useMemo(() => {
    // only the last hour; a device repeating the same alarm is shown once with its count
    const groups = {};
    data.alarms
      .filter(
        (e) =>
          CRITICAL.includes(e.attributes?.alarm) &&
          now - new Date(e.eventTime).getTime() <= CRITICAL_WINDOW,
      )
      .forEach((e) => {
        const key = `${e.deviceId}-${e.attributes.alarm}`;
        const time = new Date(e.eventTime).getTime();
        if (!groups[key]) {
          groups[key] = { ...e, count: 1, time };
        } else {
          groups[key].count += 1;
          if (time > groups[key].time) {
            groups[key] = { ...e, count: groups[key].count, time };
          }
        }
      });
    return Object.values(groups).sort((a, b) => b.time - a.time);
  }, [data.alarms, now]);
  const critical = criticalAll.slice(0, MAX_ITEMS);

  const pieData = [
    { name: t('dashOnline'), value: stats.connectivity.online, color: brand.green },
    { name: t('dashRecent'), value: stats.connectivity.recent, color: brand.orange },
    { name: t('dashOffline24'), value: stats.connectivity.offline, color: brand.red },
    { name: t('dashNever'), value: stats.connectivity.never, color: '#9e9e9e' },
  ];

  const quick = [
    { icon: <DescriptionIcon />, label: t('dashDailyReport'), to: '/reports/summary' },
    { icon: <HistoryIcon />, label: t('dashHistory'), to: '/reports/trips' },
    { icon: <SettingsIcon />, label: t('dashManageDevices'), to: '/settings/devices' },
    ...(manager
      ? [{ icon: <PeopleIcon />, label: t('dashManageClients'), to: '/settings/users' }]
      : []),
    { icon: <DashboardCustomizeIcon />, label: t('builderTitle'), to: '/builder' },
  ];

  const content = (
    <Box
      sx={{
        minHeight: '100%',
        p: 2,
        bgcolor: theme.palette.mode === 'dark' ? 'background.default' : brand.pageBackground,
      }}
    >
      <Box sx={{ maxWidth: 1400, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" fontWeight={700} color={brand.navy}>
              {t('dashboardTitle')}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {formatTime(new Date(), 'minutes')}
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="large"
            startIcon={<MapIcon />}
            onClick={() => navigate('/')}
            sx={{ background: blueGradient, borderRadius: '24px', px: 4, fontWeight: 700 }}
          >
            {t('dashGoMap')}
          </Button>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}
        {truncated && <Alert severity="info">{t('builderTruncated')}</Alert>}
        {loading && <LinearProgress />}

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          <Panel icon={<WifiIcon />} title={t('dashConnectivity')}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 150, height: 150 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={2}>
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <Box sx={{ flex: 1 }}>
                {pieData.map((entry) => (
                  <Box key={entry.name} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.3 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: entry.color }} />
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {entry.name}
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {entry.value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Panel>

          <Panel icon={<DirectionsCarIcon />} title={`${t('dashUnits')} · ${stats.total}`}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Stat label={t('dashActive')} value={stats.units.active} color={brand.green} />
              <Stat label={t('dashSuspended')} value={stats.units.suspended} color={brand.red} />
              <Stat label={t('dashWorkshop')} value={stats.units.workshop} color={brand.orange} />
            </Box>
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
              {t('dashWorkshopHint')}
            </Typography>
          </Panel>

          <Panel icon={<SpeedIcon />} title={t('dashDailyUse')}>
            <Typography variant="h3" fontWeight={700} sx={{ color: brand.blue }}>
              {usage}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={usage}
              sx={{ height: 10, borderRadius: 5, my: 1 }}
            />
            <Typography variant="body2" color="textSecondary">
              {`${data.usedDevices} ${t('dashOf')} ${stats.total} · ${t('dashLast24')}`}
            </Typography>
          </Panel>
        </Box>

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))' }}>
          <Panel icon={<WarningAmberIcon sx={{ color: brand.red }} />} title={t('dashCritical')}>
            {critical.length === 0 ? (
              <Empty text={t('dashNoCritical')} />
            ) : (
              <List dense disablePadding>
                {critical.map((e) => (
                  <ListItem key={e.id} disableGutters divider>
                    <ListItemText
                      primary={`${deviceName(e.deviceId)} · ${t(prefixString('alarm', e.attributes.alarm))}`}
                      secondary={`${formatTime(e.eventTime, 'seconds')}${e.count > 1 ? ` · ${e.count} ${t('dashTimes')}` : ''}`}
                    />
                    <Chip size="small" color="error" label={t(prefixString('alarm', e.attributes.alarm))} />
                  </ListItem>
                ))}
              </List>
            )}
            <More count={criticalAll.length - critical.length} label={t('dashMore')} />
          </Panel>

          <Panel icon={<BatteryAlertIcon sx={{ color: brand.orange }} />} title={t('dashHardware')}>
            {stats.lowBattery.length === 0 ? (
              <Empty text={t('dashNoHardware')} />
            ) : (
              <List dense disablePadding>
                {stats.lowBattery.slice(0, MAX_ITEMS).map(({ device, level }) => (
                  <ListItem key={device.id} disableGutters divider>
                    <ListItemText primary={device.name} secondary={t('dashLowBattery')} />
                    <Chip size="small" color="warning" label={`${level}%`} />
                  </ListItem>
                ))}
              </List>
            )}
            <More count={stats.lowBattery.length - MAX_ITEMS} label={t('dashMore')} />
          </Panel>

          <Panel icon={<EventBusyIcon />} title={t('dashExpiring')}>
            {stats.expiring.length === 0 ? (
              <Empty text={t('dashNoExpiring')} />
            ) : (
              <List dense disablePadding>
                {stats.expiring.slice(0, MAX_ITEMS).map(({ device, expiration, days }) => (
                  <ListItem key={device.id} disableGutters divider>
                    <ListItemText
                      primary={device.name}
                      secondary={`${device.phone ? `${device.phone} · ` : ''}${dayjs(expiration).format('DD/MM/YYYY')}`}
                    />
                    <Chip
                      size="small"
                      color={days <= 7 ? 'error' : days <= 15 ? 'warning' : 'default'}
                      label={`${days} ${t('dashDays')}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
            <More count={stats.expiring.length - MAX_ITEMS} label={t('dashMore')} />
          </Panel>

          <Panel icon={<AddIcon />} title={t('dashInstalls')}>
            <List dense disablePadding>
              {stats.recent.map((device) => (
                <ListItem key={device.id} disableGutters divider>
                  <ListItemText
                    primary={device.name}
                    secondary={
                      device.lastUpdate
                        ? `${t('dashFirstReport')}: ${formatTime(device.lastUpdate, 'minutes')}`
                        : t('dashNoReport')
                    }
                  />
                  <Chip
                    size="small"
                    color={device.status === 'online' ? 'success' : 'default'}
                    label={device.lastUpdate ? t('dashReporting') : t('dashPending')}
                  />
                </ListItem>
              ))}
            </List>
          </Panel>
        </Box>

        <Panel
          icon={<RouteIcon />}
          title={t('dashEfficiency')}
          action={
            <ToggleButtonGroup
              size="small"
              exclusive
              value={period}
              onChange={(_, value) => value && setPeriod(value)}
            >
              <ToggleButton value="week">{t('dashWeek')}</ToggleButton>
              <ToggleButton value="month">{t('dashMonth')}</ToggleButton>
            </ToggleButtonGroup>
          }
        >
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Stat label={t('dashKm')} value={`${Math.round(data.km).toLocaleString()} km`} color={brand.blue} />
            <Stat label={t('dashIdle')} value={`${data.idleHours.toFixed(1)} h`} color={brand.orange} />
            <Stat label={t('dashOverspeedToday')} value={data.overspeedToday} color={brand.red} />
          </Box>
          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
            {t('dashIdleHint')}
          </Typography>
        </Panel>

        <Panel icon={<PlaceIcon />} title={t('dashQuick')}>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {quick.map((item) => (
              <Button
                key={item.to}
                variant="outlined"
                startIcon={item.icon}
                onClick={() => navigate(item.to)}
                sx={{ borderRadius: '24px', fontWeight: 600 }}
              >
                {item.label}
              </Button>
            ))}
          </Box>
        </Panel>
      </Box>
    </Box>
  );

  if (desktop) {
    return (
      <div style={{ height: '100%', display: 'flex' }}>
        <MainSidebar />
        <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>{content}</div>
      </div>
    );
  }
  return (
    <PageLayout menu={<ReportsMenu />} breadcrumbs={['dashboardTitle']}>
      {content}
    </PageLayout>
  );
};

export default DashboardPage;
