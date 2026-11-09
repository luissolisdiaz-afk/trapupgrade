import { useState } from 'react';
import dayjs from 'dayjs';
import { useCatch } from '../reactHelper';
import fetchOrThrow from '../common/util/fetchOrThrow';

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
      query.append('type', 'deviceOverspeed');
      const response = await fetchOrThrow(`api/reports/events?${query.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      const result = await response.json();
      setEvents(result.sort((a, b) => dayjs(b.eventTime).valueOf() - dayjs(a.eventTime).valueOf()));
    } finally {
      setLoading(false);
    }
  });

  return [events, loading, load];
};
