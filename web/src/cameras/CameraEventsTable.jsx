import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import PlaceIcon from '@mui/icons-material/Place';
import { useTranslation } from '../common/components/LocalizationProvider';
import { formatTime } from '../common/util/formatter';
import { prefixString } from '../common/util/stringUtils';
import AlarmAttachments from '../common/components/AlarmAttachments';
import { groupColor } from './useCameraEvents';

const CameraEventsTable = ({ events }) => {
  const t = useTranslation();
  const navigate = useNavigate();
  const devices = useSelector((state) => state.devices.items);
  const [clip, setClip] = useState(null);

  const alertName = (event) =>
    event.type === 'deviceOverspeed'
      ? t('alarmOverspeed')
      : t(prefixString('alarm', event.attributes?.alarm));

  const detail = (event) =>
    event.type === 'deviceOverspeed' && event.attributes?.speed != null
      ? `${Math.round(event.attributes.speed * 1.852)}${
          event.attributes.speedLimit != null
            ? ` / ${Math.round(event.attributes.speedLimit * 1.852)}`
            : ''
        } km/h`
      : '';

  if (events && !events.length) {
    return (
      <Typography color="textSecondary" sx={{ p: 2 }}>
        {t('sharedNoData')}
      </Typography>
    );
  }

  return (
    <>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t('sharedDevice')}</TableCell>
            <TableCell>{t('positionFixTime')}</TableCell>
            <TableCell>{t('cameraEventType')}</TableCell>
            <TableCell>{t('cameraEventDetail')}</TableCell>
            <TableCell align="right" />
          </TableRow>
        </TableHead>
        <TableBody>
          {(events || []).map((event) => (
            <TableRow key={event.id} hover>
              <TableCell>{devices[event.deviceId]?.name}</TableCell>
              <TableCell>{formatTime(event.eventTime)}</TableCell>
              <TableCell>
                <Chip size="small" color={groupColor[event.group]} label={alertName(event)} />
              </TableCell>
              <TableCell>{detail(event)}</TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                {event.label && (
                  <Button size="small" startIcon={<VideocamIcon />} onClick={() => setClip(event)}>
                    {t('cameraViewClip')}
                  </Button>
                )}
                {event.type === 'deviceOverspeed' && (
                  <Button
                    size="small"
                    startIcon={<VideocamIcon />}
                    onClick={() =>
                      navigate(
                        `/cameras/recordings?deviceId=${event.deviceId}&at=${encodeURIComponent(event.eventTime)}`,
                      )
                    }
                  >
                    {t('linkRecordings')}
                  </Button>
                )}
                {event.type === 'alarm' && !event.label && (
                  <Typography component="span" variant="caption" color="textSecondary" sx={{ mr: 1 }}>
                    {t('cameraNoClip')}
                  </Typography>
                )}
                <Button
                  size="small"
                  startIcon={<PlaceIcon />}
                  onClick={() => navigate(`/event/${event.id}`)}
                >
                  {t('cameraEventLocation')}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Dialog open={Boolean(clip)} onClose={() => setClip(null)} fullWidth maxWidth="sm">
        {clip && (
          <>
            <DialogTitle>
              {alertName(clip)}
              <Typography variant="body2" color="textSecondary">
                {`${devices[clip.deviceId]?.name || ''} · ${formatTime(clip.eventTime, 'seconds')}`}
              </Typography>
            </DialogTitle>
            <DialogContent>
              <AlarmAttachments inline deviceId={clip.deviceId} label={clip.label} />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => navigate(`/event/${clip.id}`)}>{t('cameraEventLocation')}</Button>
              <Button onClick={() => setClip(null)}>{t('sharedCancel')}</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
};

export default CameraEventsTable;
