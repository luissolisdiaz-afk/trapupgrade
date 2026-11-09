import { Divider, List } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import VideocamIcon from '@mui/icons-material/Videocam';
import SpeedIcon from '@mui/icons-material/Speed';
import { useLocation } from 'react-router-dom';
import { useTranslation } from '../common/components/LocalizationProvider';
import MenuItem from '../common/components/MenuItem';

const CamerasMenu = () => {
  const t = useTranslation();
  const location = useLocation();
  const deviceId = new URLSearchParams(location.search).get('deviceId');
  const link = (path) => (deviceId ? `${path}?deviceId=${deviceId}` : path);

  return (
    <>
      <List>
        <MenuItem
          title={t('cameraPanel')}
          link="/cameras"
          icon={<DashboardIcon />}
          selected={location.pathname === '/cameras'}
        />
      </List>
      <Divider />
      <List>
        <MenuItem
          title={t('linkRecordings')}
          link={link('/cameras/recordings')}
          icon={<VideocamIcon />}
          selected={location.pathname === '/cameras/recordings'}
        />
        <MenuItem
          title={t('cameraSpeeding')}
          link={link('/cameras/speeding')}
          icon={<SpeedIcon />}
          selected={location.pathname === '/cameras/speeding'}
        />
      </List>
    </>
  );
};

export default CamerasMenu;
