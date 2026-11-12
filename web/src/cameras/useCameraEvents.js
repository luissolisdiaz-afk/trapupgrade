import { useState } from 'react';
import dayjs from 'dayjs';
import { useCatch } from '../reactHelper';
import fetchOrThrow from '../common/util/fetchOrThrow';

// alarms raised by the camera AI (ADAS, driver monitoring and blind spot detection)
export const ADAS_ALARMS = ['forwardCollision', 'laneDeparture', 'closeDistance', 'pedestrianCollision'];
export const DMS_ALARMS = [
  'fatigueDriving',
  'phoneUse',
  'smoking',
  'distraction',
  'driverAbnormal',
  'seatBelt',
  'cameraOcclusion',
  'driverChange',
  'infraredBlocking',
];
export const BLIND_ALARMS = ['blindSpotRear', 'blindSpotLeft', 'blindSpotRight'];

export const eventGroup = (event) => {
  if (event.type === 'deviceOverspeed') return 'overspeed';
  const alarm = event.attributes?.alarm;
  if (ADAS_ALARMS.includes(alarm)) return 'adas';
  if (DMS_ALARMS.includes(alarm)) return 'dms';
  if (BLIND_ALARMS.includes(alarm)) return 'blind';
  return null;
};

export const groupColor = { overspeed: 'error', adas: 'warning', dms: 'secondary', blind: 'info' };

const chunk = (list, size) => {
  const result = [];
  for (let i = 0; i < list.length; i += size) result.push(list.slice(i, i + size));
  return result;
};

export default () => {
  const [events, setEvents] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCatch(async (deviceIds, from, to) => {
    if (!deviceIds.length) {
      setEvents([]);
      return;
    }
    setLoading(true);
    try {
      const query = new URLSearchParams({
        from: dayjs(from).toISOString(),
        to: dayjs(to).toISOString(),
      });
      deviceIds.forEach((id) => query.append('deviceId', id));
      query.append('type', 'alarm');
      query.append('type', 'deviceOverspeed');
      const response = await fetchOrThrow(`api/reports/events?${query.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      const list = (await response.json())
        .map((event) => ({ ...event, group: eventGroup(event) }))
        .filter((event) => event.group)
        .sort((a, b) => dayjs(b.eventTime).valueOf() - dayjs(a.eventTime).valueOf());

      // the clip of an alarm is found through the alarm label stored in its position
      const positionIds = [
        ...new Set(list.filter((e) => e.type === 'alarm' && e.positionId).map((e) => e.positionId)),
      ];
      const labels = {};
      await Promise.all(
        chunk(positionIds.slice(0, 300), 50).map(async (ids) => {
          const query = new URLSearchParams();
          ids.forEach((id) => query.append('id', id));
          const positions = await fetchOrThrow(`api/positions?${query.toString()}`);
          (await positions.json()).forEach((position) => {
            if (position.attributes?.alarmLabel) {
              labels[position.id] = position.attributes.alarmLabel;
            }
          });
        }),
      );
      setEvents(list.map((event) => ({ ...event, label: labels[event.positionId] || null })));
    } finally {
      setLoading(false);
    }
  });

  return [events, loading, load];
};
