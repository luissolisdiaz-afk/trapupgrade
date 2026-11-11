import { lazy, Suspense, useState, useCallback, useEffect } from 'react';
import { IconButton, Paper, Typography } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useDispatch, useSelector } from 'react-redux';
import DeviceList from './DeviceList';
import BottomMenu from '../common/components/BottomMenu';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import RefreshIcon from '@mui/icons-material/Refresh';
import MainSidebar, { SIDEBAR_WIDTH } from './MainSidebar';
import MainTopBar from './MainTopBar';
import { useTranslation } from '../common/components/LocalizationProvider';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { useCatch } from '../reactHelper';
import StatusCard from '../common/components/StatusCard';
import { devicesActions } from '../store';
import usePersistedState from '../common/util/usePersistedState';
import EventsDrawer from './EventsDrawer';
import useFilter from './useFilter';
import MainToolbar from './MainToolbar';
import { useAttributePreference } from '../common/util/preferences';
import useFeatures from '../common/util/useFeatures';

const MainMap = lazy(() => import('./MainMap'));

const useStyles = makeStyles()((theme) => ({
  root: {
    height: '100%',
  },
  sidebar: {
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
    [theme.breakpoints.up('md')]: {
      position: 'fixed',
      left: 0,
      top: 0,
      height: `calc(100% - ${theme.spacing(3)})`,
      width: theme.dimensions.drawerWidthDesktop,
      margin: theme.spacing(1.5),
      zIndex: 3,
    },
    [theme.breakpoints.down('md')]: {
      height: '100%',
      width: '100%',
    },
  },
  header: {
    pointerEvents: 'auto',
    zIndex: 6,
  },
  footer: {
    pointerEvents: 'auto',
    zIndex: 5,
  },
  middle: {
    flex: 1,
    display: 'grid',
    minHeight: 0,
  },
  contentMap: {
    pointerEvents: 'auto',
    gridArea: '1 / 1',
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
    background: theme.palette.background.paper,
    boxShadow: '0 1px 6px rgba(15, 33, 71, 0.12)',
  },
  listHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    padding: theme.spacing(1.5, 2),
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  listBody: {
    flex: 1,
    minHeight: 0,
  },
  mapArea: {
    flex: 1,
    minWidth: 0,
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 1px 6px rgba(15, 33, 71, 0.12)',
  },
  contentList: {
    pointerEvents: 'auto',
    gridArea: '1 / 1',
    zIndex: 4,
    display: 'flex',
    minHeight: 0,
  },
}));

const MainPage = () => {
  const { classes } = useStyles();
  const dispatch = useDispatch();
  const theme = useTheme();
  const t = useTranslation();

  const features = useFeatures();

  const desktop = useMediaQuery(theme.breakpoints.up('md'));

  const mapOnSelect = useAttributePreference('mapOnSelect', true);

  const selectedDeviceId = useSelector((state) => state.devices.selectedId);
  const positions = useSelector((state) => state.session.positions);
  const [filteredPositions, setFilteredPositions] = useState([]);
  const selectedPosition = filteredPositions.find(
    (position) => selectedDeviceId && position.deviceId === selectedDeviceId,
  );

  const [filteredDevices, setFilteredDevices] = useState([]);

  const [keyword, setKeyword] = useState('');
  const [filter, setFilter] = usePersistedState('deviceFilter', {
    statuses: [],
    groups: [],
    geofences: [],
  });
  const [filterSort, setFilterSort] = usePersistedState('filterSort', '');
  const [filterMap, setFilterMap] = usePersistedState('filterMap', false);

  const [devicesOpen, setDevicesOpen] = useState(desktop);
  const [eventsOpen, setEventsOpen] = useState(false);

  const onEventsClick = useCallback(() => setEventsOpen(true), [setEventsOpen]);

  useEffect(() => {
    if (!desktop && mapOnSelect && selectedDeviceId) {
      setDevicesOpen(false);
    }
  }, [desktop, mapOnSelect, selectedDeviceId]);

  useFilter(
    keyword,
    filter,
    filterSort,
    filterMap && !features.disableDeviceList,
    positions,
    setFilteredDevices,
    setFilteredPositions,
  );

  const refreshDevices = useCatch(async () => {
    const response = await fetchOrThrow('api/devices');
    dispatch(devicesActions.refresh(await response.json()));
  });

  if (desktop) {
    const showSidebar = !features.disableTabs;
    const showList = !features.disableDeviceList && devicesOpen;
    const cardPadding =
      (showSidebar ? SIDEBAR_WIDTH : 0) +
      (showList ? parseInt(theme.dimensions.drawerWidthDesktop, 10) : 0);

    return (
      <div className={classes.desktopRoot}>
        {showSidebar && <MainSidebar />}
        <div className={classes.desktopColumn}>
          <MainTopBar
            showSearch={!features.disableDeviceList}
            onEventsClick={onEventsClick}
            toolbarProps={{
              filteredDevices,
              devicesOpen,
              setDevicesOpen,
              keyword,
              setKeyword,
              filter,
              setFilter,
              filterSort,
              setFilterSort,
              filterMap,
              setFilterMap,
            }}
          />
          <div className={classes.desktopBody}>
            {showList && (
              <div className={classes.listPanel}>
                <div className={classes.listHeader}>
                  <DirectionsCarIcon />
                  <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>
                    {t('deviceTitle')} ({filteredDevices.length})
                  </Typography>
                  <IconButton size="small" onClick={refreshDevices}>
                    <RefreshIcon />
                  </IconButton>
                </div>
                <div className={classes.listBody}>
                  <DeviceList devices={filteredDevices} />
                </div>
              </div>
            )}
            <div className={classes.mapArea}>
              <Suspense fallback={null}>
                <MainMap
                  docked
                  filteredPositions={filteredPositions}
                  selectedPosition={selectedPosition}
                  onEventsClick={onEventsClick}
                />
              </Suspense>
            </div>
          </div>
        </div>
        <EventsDrawer open={eventsOpen} onClose={() => setEventsOpen(false)} />
        {selectedDeviceId && !features.disableStatusCard && (
          <StatusCard
            deviceId={selectedDeviceId}
            position={selectedPosition}
            onClose={() => dispatch(devicesActions.selectId(null))}
            desktopPadding={`${cardPadding}px`}
          />
        )}
      </div>
    );
  }

  return (
    <div className={classes.root}>
      {desktop && (
        <Suspense fallback={null}>
          <MainMap
            filteredPositions={filteredPositions}
            selectedPosition={selectedPosition}
            onEventsClick={onEventsClick}
          />
        </Suspense>
      )}
      <div className={classes.sidebar}>
        {!features.disableDeviceList && (
          <Paper square elevation={3} className={classes.header}>
            <MainToolbar
              filteredDevices={filteredDevices}
              devicesOpen={devicesOpen}
              setDevicesOpen={setDevicesOpen}
              keyword={keyword}
              setKeyword={setKeyword}
              filter={filter}
              setFilter={setFilter}
              filterSort={filterSort}
              setFilterSort={setFilterSort}
              filterMap={filterMap}
              setFilterMap={setFilterMap}
            />
          </Paper>
        )}
        <div className={classes.middle}>
          {!desktop && (
            <div className={classes.contentMap}>
              <Suspense fallback={null}>
                <MainMap
                  filteredPositions={filteredPositions}
                  selectedPosition={selectedPosition}
                  onEventsClick={onEventsClick}
                />
              </Suspense>
            </div>
          )}
          {!features.disableDeviceList && (
            <Paper
              square
              className={classes.contentList}
              style={devicesOpen ? {} : { visibility: 'hidden' }}
            >
              <DeviceList devices={filteredDevices} />
            </Paper>
          )}
        </div>
        {desktop && !features.disableTabs && (
          <div className={classes.footer}>
            <BottomMenu />
          </div>
        )}
      </div>
      <EventsDrawer open={eventsOpen} onClose={() => setEventsOpen(false)} />
      {selectedDeviceId && !features.disableStatusCard && (
        <StatusCard
          deviceId={selectedDeviceId}
          position={selectedPosition}
          onClose={() => dispatch(devicesActions.selectId(null))}
          desktopPadding={features.disableDeviceList ? 0 : theme.dimensions.drawerWidthDesktop}
        />
      )}
    </div>
  );
};

export default MainPage;
