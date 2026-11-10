import dayjs from 'dayjs';

export const SOURCES = {
  trips: {
    path: 'trips',
    time: (r) => r.startTime,
    groupBys: ['device', 'day', 'none'],
    metrics: {
      distance: { label: 'builderDistance', unit: 'km', agg: 'sum', value: (r) => r.distance / 1000 },
      count: { label: 'builderTripCount', unit: '', agg: 'sum', value: () => 1 },
      maxSpeed: { label: 'builderMaxSpeed', unit: 'km/h', agg: 'max', value: (r) => r.maxSpeed * 1.852 },
      duration: { label: 'builderDuration', unit: 'h', agg: 'sum', value: (r) => r.duration / 3600000 },
    },
  },
  summary: {
    path: 'summary',
    time: (r) => r.startTime,
    groupBys: ['device', 'day', 'none'],
    metrics: {
      maxSpeed: { label: 'builderMaxSpeed', unit: 'km/h', agg: 'max', value: (r) => (r.maxSpeed || 0) * 1.852 },
      averageSpeed: { label: 'builderAverageSpeed', unit: 'km/h', agg: 'max', value: (r) => (r.averageSpeed || 0) * 1.852 },
      distance: { label: 'builderDistance', unit: 'km', agg: 'sum', value: (r) => (r.distance || 0) / 1000 },
      engineHours: { label: 'builderEngineHours', unit: 'h', agg: 'sum', value: (r) => (r.engineHours || 0) / 3600000 },
    },
  },
  events: {
    path: 'events',
    time: (r) => r.eventTime,
    groupBys: ['device', 'day', 'type', 'none'],
    metrics: {
      count: { label: 'builderEventCount', unit: '', agg: 'sum', value: () => 1 },
    },
  },
  overspeed: {
    path: 'events',
    filter: (r) => r.type === 'deviceOverspeed',
    time: (r) => r.eventTime,
    groupBys: ['device', 'day', 'none'],
    metrics: {
      count: { label: 'builderOverspeedCount', unit: '', agg: 'sum', value: () => 1 },
      maxSpeed: {
        label: 'builderMaxSpeed',
        unit: 'km/h',
        agg: 'max',
        value: (r) => (r.attributes?.speed || 0) * 1.852,
      },
    },
  },
};

export const aggregate = (rows, widget, deviceName) => {
  const source = SOURCES[widget.source];
  const metric = source?.metrics[widget.metric];
  if (!source || !metric) return [];
  const map = new Map();
  rows
    .filter((r) => !source.filter || source.filter(r))
    .forEach((r) => {
      let key = 'total';
      if (widget.groupBy === 'device') key = deviceName(r.deviceId);
      else if (widget.groupBy === 'day') key = dayjs(source.time(r)).format('YYYY-MM-DD');
      else if (widget.groupBy === 'type') key = r.type;
      const value = metric.value(r);
      const current = map.get(key);
      if (current === undefined) map.set(key, value);
      else map.set(key, metric.agg === 'max' ? Math.max(current, value) : current + value);
    });
  const result = [...map].map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));
  result.sort(
    widget.groupBy === 'day' ? (a, b) => a.name.localeCompare(b.name) : (a, b) => b.value - a.value,
  );
  return result;
};

export const defaultWidgets = [
  { id: 'w1', type: 'kpi', title: '', source: 'trips', metric: 'distance', groupBy: 'none', span: 1 },
  { id: 'w2', type: 'kpi', title: '', source: 'overspeed', metric: 'count', groupBy: 'none', span: 1 },
  { id: 'w3', type: 'kpi', title: '', source: 'summary', metric: 'maxSpeed', groupBy: 'none', span: 1 },
  { id: 'w4', type: 'bar', title: '', source: 'overspeed', metric: 'count', groupBy: 'device', span: 2 },
  { id: 'w5', type: 'pie', title: '', source: 'trips', metric: 'distance', groupBy: 'device', span: 1 },
  { id: 'w6', type: 'line', title: '', source: 'trips', metric: 'distance', groupBy: 'day', span: 3 },
];
