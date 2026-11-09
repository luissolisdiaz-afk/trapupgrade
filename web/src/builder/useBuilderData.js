import { useState } from 'react';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { useCatch } from '../reactHelper';
import fetchOrThrow from '../common/util/fetchOrThrow';

const MAX_DEVICES = 100;
const EMPTY = { trips: [], events: [], prev: { trips: [], events: [] } };

export default () => {
  const devices = useSelector((state) => state.devices.items);
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState({ count: 0, truncated: false });

  const load = useCatch(async ({ from, to, groupId, regex }) => {
    let re = null;
    if (regex) {
      try {
        re = new RegExp(regex, 'i');
      } catch {
        throw new Error('Regex');
      }
    }
    let list = Object.values(devices);
    if (groupId) list = list.filter((d) => String(d.groupId) === String(groupId));
    if (re) list = list.filter((d) => re.test(d.name));
    const truncated = list.length > MAX_DEVICES;
    list = list.slice(0, MAX_DEVICES);
    setInfo({ count: list.length, truncated });
    if (!list.length) {
      setData(EMPTY);
      return;
    }
    setLoading(true);
    try {
      const start = dayjs(from);
      const end = dayjs(to);
      const length = end.diff(start);
      const fetchRange = (path, rangeFrom, rangeTo) => {
        const query = new URLSearchParams({
          from: rangeFrom.toISOString(),
          to: rangeTo.toISOString(),
        });
        list.forEach((d) => query.append('deviceId', d.id));
        return fetchOrThrow(`api/reports/${path}?${query.toString()}`, {
          headers: { Accept: 'application/json' },
        }).then((r) => r.json());
      };
      const previousStart = start.subtract(length, 'millisecond');
      const [trips, events, prevTrips, prevEvents] = await Promise.all([
        fetchRange('trips', start, end),
        fetchRange('events', start, end),
        fetchRange('trips', previousStart, start),
        fetchRange('events', previousStart, start),
      ]);
      setData({ trips, events, prev: { trips: prevTrips, events: prevEvents } });
    } finally {
      setLoading(false);
    }
  });

  return [data, loading, load, info];
};
