import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import fetchOrThrow from '../common/util/fetchOrThrow';

const MAX_DEVICES = 100;
const EMPTY = { alarms: [], overspeedToday: 0, usedDevices: 0, km: 0, idleHours: 0 };

const get = (path, ids, from, to, extra = []) => {
  const query = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
  ids.forEach((id) => query.append('deviceId', id));
  extra.forEach(([k, v]) => query.append(k, v));
  return fetchOrThrow(`api/reports/${path}?${query.toString()}`, {
    headers: { Accept: 'application/json' },
  }).then((r) => r.json());
};

export default (period) => {
  const devices = useSelector((state) => state.devices.items);
  const ids = Object.values(devices)
    .slice(0, MAX_DEVICES)
    .map((d) => d.id);
  const key = ids.join(',');

  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!ids.length) {
      setData(EMPTY);
      return undefined;
    }
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const now = dayjs();
        const rangeStart = now.startOf(period);
        const [events, trips, summary, stops] = await Promise.all([
          get('events', ids, now.subtract(7, 'day'), now, [
            ['type', 'alarm'],
            ['type', 'deviceOverspeed'],
          ]),
          get('trips', ids, now.subtract(24, 'hour'), now),
          get('summary', ids, rangeStart, now),
          get('stops', ids, rangeStart, now),
        ]);
        if (cancelled) return;
        const today = now.startOf('day').valueOf();
        setData({
          alarms: events
            .filter((e) => e.type === 'alarm')
            .sort((a, b) => new Date(b.eventTime) - new Date(a.eventTime)),
          overspeedToday: events.filter(
            (e) => e.type === 'deviceOverspeed' && new Date(e.eventTime).getTime() >= today,
          ).length,
          usedDevices: new Set(trips.map((trip) => trip.deviceId)).size,
          km: summary.reduce((sum, item) => sum + (item.distance || 0), 0) / 1000,
          idleHours: stops.reduce((sum, item) => sum + (item.engineHours || 0), 0) / 3600000,
        });
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, period]);

  return { data, loading, error, truncated: Object.keys(devices).length > MAX_DEVICES };
};
