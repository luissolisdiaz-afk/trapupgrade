import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Badge,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import NotificationsIcon from '@mui/icons-material/NotificationsNone';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import { useTranslation } from '../common/components/LocalizationProvider';
import { sessionActions } from '../store';
import { nativePostMessage } from '../common/components/NativeInterface';
import MainToolbar from './MainToolbar';

const useStyles = makeStyles()((theme) => ({
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(2),
    height: 72,
    flexShrink: 0,
    padding: theme.spacing(0, 2),
  },
  search: {
    flex: 1,
    maxWidth: 560,
    '& .MuiToolbar-root': {
      padding: 0,
      minHeight: 0,
    },
    '& .MuiOutlinedInput-root': {
      borderRadius: 24,
      background: theme.palette.background.paper,
    },
  },
  spacer: {
    flex: 1,
  },
}));

const initials = (name) =>
  (name || '?')
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

const MainTopBar = ({ toolbarProps, onEventsClick, showSearch }) => {
  const { classes } = useStyles();
  const t = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const user = useSelector((state) => state.session.user);
  const eventCount = useSelector((state) => state.events.items.length);

  const [anchorEl, setAnchorEl] = useState(null);

  const handleLogout = async () => {
    setAnchorEl(null);
    const notificationToken = window.localStorage.getItem('notificationToken');
    if (notificationToken && !user.readonly) {
      window.localStorage.removeItem('notificationToken');
      const tokens = user.attributes.notificationTokens?.split(',') || [];
      if (tokens.includes(notificationToken)) {
        const updatedUser = {
          ...user,
          attributes: {
            ...user.attributes,
            notificationTokens:
              tokens.length > 1
                ? tokens.filter((it) => it !== notificationToken).join(',')
                : undefined,
          },
        };
        await fetch(`api/users/${user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedUser),
        });
      }
    }
    await fetch('api/session', { method: 'DELETE' });
    nativePostMessage('logout');
    navigate('/login');
    dispatch(sessionActions.updateUser(null));
  };

  return (
    <div className={classes.root}>
      {showSearch && (
        <div className={classes.search}>
          <MainToolbar {...toolbarProps} />
        </div>
      )}
      <div className={classes.spacer} />
      <IconButton onClick={onEventsClick}>
        <Badge color="error" badgeContent={eventCount} max={99}>
          <NotificationsIcon />
        </Badge>
      </IconButton>
      <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ p: 0 }}>
        <Avatar sx={{ bgcolor: '#0f2147', width: 40, height: 40, fontSize: 16 }}>
          {initials(user.name)}
        </Avatar>
      </IconButton>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            navigate(`/settings/user/${user.id}`);
          }}
        >
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          {t('settingsUser')}
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          {t('loginLogout')}
        </MenuItem>
      </Menu>
    </div>
  );
};

export default MainTopBar;
