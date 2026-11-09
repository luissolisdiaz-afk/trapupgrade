import { Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import { useTranslation } from '../common/components/LocalizationProvider';
import { formatTime } from '../common/util/formatter';

const OverspeedTable = ({ events, onSelect }) => {
  const t = useTranslation();
  const devices = useSelector((state) => state.devices.items);

  if (events && !events.length) {
    return (
      <Typography color="textSecondary" sx={{ p: 2 }}>
        {t('sharedNoData')}
      </Typography>
    );
  }
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>{t('sharedDevice')}</TableCell>
          <TableCell>{t('positionFixTime')}</TableCell>
          <TableCell>{t('positionSpeed')}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {(events || []).map((event) => (
          <TableRow
            key={event.id}
            hover={Boolean(onSelect)}
            onClick={() => onSelect?.(event)}
            sx={onSelect ? { cursor: 'pointer' } : undefined}
          >
            <TableCell>{devices[event.deviceId]?.name}</TableCell>
            <TableCell>{formatTime(event.eventTime)}</TableCell>
            <TableCell>
              {event.attributes?.speed != null ? Math.round(event.attributes.speed * 1.852) : ''}
              {event.attributes?.speedLimit != null &&
                ` / ${Math.round(event.attributes.speedLimit * 1.852)}`}{' '}
              km/h
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default OverspeedTable;
