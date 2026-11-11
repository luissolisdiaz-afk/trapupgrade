import { useEffect, useMemo, useReducer } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';
import { List } from 'react-window';
import { ListItemButton, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { devicesActions } from '../store';
import { useAsyncTask } from '../reactHelper';
import DeviceRow from './DeviceRow';
import fetchOrThrow from '../common/util/fetchOrThrow';
import usePersistedState from '../common/util/usePersistedState';
import { useTranslation } from '../common/components/LocalizationProvider';

const DEVICE_HEIGHT = 72;
const HEADER_HEIGHT = 44;
const NO_GROUP = 0;

const useStyles = makeStyles()((theme) => ({
  list: {
    height: '100%',
    direction: theme.direction,
  },
  header: {
    height: HEADER_HEIGHT,
    gap: theme.spacing(1),
    backgroundColor: theme.palette.action.hover,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  chevron: {
    transition: 'transform 0.2s',
  },
  collapsed: {
    transform: 'rotate(-90deg)',
  },
  groupName: {
    flex: 1,
    fontWeight: 700,
  },
  count: {
    color: theme.palette.text.secondary,
    whiteSpace: 'nowrap',
  },
  online: {
    color: theme.palette.success.main,
    fontWeight: 600,
  },
}));

const GroupHeader = ({ row, style, collapsed, onToggle }) => {
  const { classes, cx } = useStyles();
  return (
    <div style={style}>
      <ListItemButton className={classes.header} onClick={() => onToggle(row.key)}>
        <ExpandMoreIcon
          fontSize="small"
          className={cx(classes.chevron, collapsed && classes.collapsed)}
        />
        <Typography variant="body2" noWrap className={classes.groupName}>
          {row.name}
        </Typography>
        <Typography variant="caption" className={classes.count}>
          {row.online > 0 && <span className={classes.online}>{row.online} • </span>}
          {row.count}
        </Typography>
      </ListItemButton>
    </div>
  );
};

const Row = ({ rows, collapsedGroups, onToggle, index, style }) => {
  const row = rows[index];
  if (row.type === 'header') {
    return (
      <GroupHeader
        row={row}
        style={style}
        collapsed={!!collapsedGroups[row.key]}
        onToggle={onToggle}
      />
    );
  }
  return <DeviceRow devices={[row.device]} index={0} style={style} />;
};

const DeviceList = ({ devices }) => {
  const { classes } = useStyles();
  const dispatch = useDispatch();
  const t = useTranslation();

  const groups = useSelector((state) => state.groups.items);
  const [collapsedGroups, setCollapsedGroups] = usePersistedState('collapsedGroups', {});

  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  useEffect(() => {
    const interval = setInterval(forceUpdate, 60000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  useAsyncTask(
    async ({ signal }) => {
      const response = await fetchOrThrow('api/devices', { signal });
      dispatch(devicesActions.refresh(await response.json()));
    },
    [dispatch],
  );

  const onToggle = (key) => setCollapsedGroups({ ...collapsedGroups, [key]: !collapsedGroups[key] });

  const rows = useMemo(() => {
    // full name of a group including its parents, e.g. "Empresa / Flota"
    const groupPath = (id) => {
      const names = [];
      const seen = new Set();
      let current = groups[id];
      while (current && !seen.has(current.id)) {
        seen.add(current.id);
        names.unshift(current.name);
        current = groups[current.groupId];
      }
      return names.join(' / ');
    };

    const buckets = {};
    devices.forEach((device) => {
      const key = device.groupId && groups[device.groupId] ? device.groupId : NO_GROUP;
      (buckets[key] ||= []).push(device);
    });

    const keys = Object.keys(buckets)
      .map(Number)
      .sort((a, b) => {
        if (a === NO_GROUP) return 1;
        if (b === NO_GROUP) return -1;
        return groupPath(a).localeCompare(groupPath(b));
      });

    const result = [];
    keys.forEach((key) => {
      const list = buckets[key];
      result.push({
        type: 'header',
        key,
        name: key === NO_GROUP ? t('groupNoGroup') : groupPath(key),
        count: list.length,
        online: list.filter((device) => device.status === 'online').length,
      });
      if (!collapsedGroups[key]) {
        list.forEach((device) => result.push({ type: 'device', device }));
      }
    });
    return result;
  }, [devices, groups, collapsedGroups, t]);

  return (
    <List
      className={classes.list}
      rowComponent={Row}
      rowCount={rows.length}
      rowHeight={(index) => (rows[index].type === 'header' ? HEADER_HEIGHT : DEVICE_HEIGHT)}
      rowProps={{ rows, collapsedGroups, onToggle }}
      overscanCount={5}
    />
  );
};

export default DeviceList;
