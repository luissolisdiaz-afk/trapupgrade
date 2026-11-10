import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, List, ListItemButton, ListItemIcon, ListItemText, Typography } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import dayjs from 'dayjs';
import MapIcon from '@mui/icons-material/Map';
import BarChartIcon from '@mui/icons-material/BarChart';
import DashboardIcon from '@mui/icons-material/Dashboard';
import VideocamIcon from '@mui/icons-material/Videocam';
import SettingsIcon from '@mui/icons-material/Settings';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import useFeatures from '../common/util/useFeatures';
import { useTranslation } from '../common/components/LocalizationProvider';

export const SIDEBAR_WIDTH = 208;

const useStyles = makeStyles()(() => ({
  root: {
    width: SIDEBAR_WIDTH,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    background: '#0b1b3b',
    color: '#cfd9ee',
    '@media print': {
      display: 'none',
    },
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '20px 18px 18px',
    color: '#fff',
  },
  logo: {
    maxWidth: '100%',
    maxHeight: 44,
  },
  list: {
    flex: 1,
    padding: '8px 12px',
    '& .MuiListItemButton-root': {
      borderRadius: 10,
      marginBottom: 4,
      color: '#cfd9ee',
      '&:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
      },
    },
    '& .MuiListItemIcon-root': {
      color: '#9fb2d6',
      minWidth: 40,
    },
    '& .MuiListItemButton-root.Mui-selected, & .MuiListItemButton-root.Mui-selected:hover': {
      background: 'linear-gradient(90deg, #0b5fe8, #0a45c9)',
      color: '#fff',
      '& .MuiListItemIcon-root': {
        color: '#fff',
      },
    },
  },
  status: {
    margin: 12,
    padding: '12px 14px',
    borderRadius: 12,
    background: 'rgba(255, 255, 255, 0.06)',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    display: 'inline-block',
    marginRight: 8,
  },
}));

const MainSidebar = () => {
  const { classes } = useStyles();
  const t = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const server = useSelector((state) => state.session.server);
  const socket = useSelector((state) => state.session.socket);
  const features = useFeatures();
  const devices = useSelector((state) => state.devices.items);
  const selectedId = useSelector((state) => state.devices.selectedId);

  const brandName = server.attributes?.['ui.brandName'] || 'ROADSAFE';
  const brandSubtitle = server.attributes?.['ui.brandSubtitle'] ?? 'GPS & IoT';
  const logo = server.attributes?.logoInverted || server.attributes?.logo;

  const lastUpdate = useMemo(() => {
    const times = Object.values(devices)
      .map((d) => d.lastUpdate)
      .filter(Boolean)
      .map((v) => dayjs(v).valueOf());
    return times.length ? dayjs(Math.max(...times)) : null;
  }, [devices]);

  const report = (path) => (selectedId != null ? `${path}?deviceId=${selectedId}` : path);

  const items = [
    {
      key: 'dashboard',
      title: t('dashboardTitle'),
      icon: <DashboardIcon />,
      link: '/dashboard',
      match: (p) => p.startsWith('/dashboard'),
    },
    { key: 'map', title: t('mapTitle'), icon: <MapIcon />, link: '/', match: (p) => p === '/' },
    {
      key: 'cameras',
      title: t('cameraTitle'),
      icon: <VideocamIcon />,
      link: '/cameras',
      match: (p) => p.startsWith('/cameras'),
    },
    {
      key: 'reports',
      title: t('reportTitle'),
      icon: <BarChartIcon />,
      link: report('/reports/combined'),
      match: (p) => p.startsWith('/reports') || p.startsWith('/builder'),
    },
    {
      key: 'settings',
      title: t('settingsTitle'),
      icon: <SettingsIcon />,
      link: '/settings/preferences?menu=true',
      match: (p) => p.startsWith('/settings') || p.startsWith('/geofences'),
    },
  ];

  return (
    <div className={classes.root}>
      <div className={classes.brand}>
        {logo ? (
          <img className={classes.logo} src={logo} alt="" />
        ) : (
          <>
            <LocationOnIcon sx={{ fontSize: 40, color: '#2a73ff' }} />
            <Box>
              <Typography sx={{ fontWeight: 800, letterSpacing: 0.5, lineHeight: 1.1 }}>
                {brandName}
              </Typography>
              {brandSubtitle && (
                <Typography variant="caption" sx={{ color: '#9fb2d6' }}>
                  {brandSubtitle}
                </Typography>
              )}
            </Box>
          </>
        )}
      </div>
      <List className={classes.list}>
        {items
          .filter(
            (item) =>
              !(item.key === 'cameras' && features.disableCameras) &&
              !(item.key === 'dashboard' && !features.dashboardEnabled),
          )
          .map((item) => (
          <ListItemButton
            key={item.key}
            selected={item.match(location.pathname)}
            onClick={() => navigate(item.link)}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.title} />
          </ListItemButton>
        ))}
      </List>
      <div className={classes.status}>
        <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
          <span className={classes.dot} style={{ background: socket ? '#35c759' : '#e53935' }} />
          {socket ? t('systemOnline') : t('systemOffline')}
        </Typography>
        {lastUpdate && (
          <Typography variant="caption" sx={{ color: '#9fb2d6', display: 'block', mt: 0.5 }}>
            {t('systemLastUpdate')}
            <br />
            {lastUpdate.format('HH:mm · DD/MM/YYYY')}
          </Typography>
        )}
      </div>
    </div>
  );
};

export default MainSidebar;
