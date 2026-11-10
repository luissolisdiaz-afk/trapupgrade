import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Avatar,
  Box,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';
import SpeedIcon from '@mui/icons-material/Speed';
import RouteIcon from '@mui/icons-material/Route';
import TimerIcon from '@mui/icons-material/Timer';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import BarChartIcon from '@mui/icons-material/BarChart';
import PieChartIcon from '@mui/icons-material/PieChart';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import TableChartIcon from '@mui/icons-material/TableChart';
import { useTranslation } from '../common/components/LocalizationProvider';
import { aggregate, SOURCES } from './aggregate';
import { blueGradient, brand, chartColors } from './style';

export const widgetTitle = (widget, t) =>
  widget.title ||
  `${t(SOURCES[widget.source]?.metrics[widget.metric]?.label || 'sharedName')}${
    widget.groupBy !== 'none' ? ` · ${t(`builderBy_${widget.groupBy}`)}` : ''
  }`;

export const typeIcon = (type) =>
  ({
    bar: <BarChartIcon />,
    pie: <PieChartIcon />,
    line: <ShowChartIcon />,
    table: <TableChartIcon />,
  })[type] || <BarChartIcon />;

const metricIcon = (widget) => {
  if (widget.metric === 'maxSpeed') return <SpeedIcon />;
  if (widget.metric === 'distance') return <PlaceIcon />;
  if (widget.metric === 'duration') return <TimerIcon />;
  if (widget.source === 'trips') return <RouteIcon />;
  return widget.source === 'overspeed' ? <SpeedIcon /> : <NotificationsIcon />;
};

const total = (rows, metric) => {
  if (metric === 'averageSpeed') {
    return rows.length ? rows.reduce((acc, r) => acc + r.value, 0) / rows.length : 0;
  }
  return rows.reduce((acc, r) => (metric === 'maxSpeed' ? Math.max(acc, r.value) : acc + r.value), 0);
};

const format = (value, digits = 1) =>
  value.toLocaleString(undefined, { maximumFractionDigits: digits });

const useRows = (widget, data) => {
  const devices = useSelector((state) => state.devices.items);
  return useMemo(() => {
    const source = SOURCES[widget.source];
    const name = (id) => devices[id]?.name || String(id);
    return {
      rows: aggregate(data[source.path] || [], widget, name),
      daily: aggregate(data[source.path] || [], { ...widget, groupBy: 'day' }, name),
      previous: aggregate(data.prev?.[source.path] || [], { ...widget, groupBy: 'none' }, name),
    };
  }, [widget, data, devices]);
};

const axisTick = { fill: brand.muted, fontSize: 12 };

export const KpiContent = ({ widget, data }) => {
  const t = useTranslation();
  const { rows, daily, previous } = useRows(widget, data);
  const metric = SOURCES[widget.source]?.metrics[widget.metric];
  const value = total(rows, widget.metric);
  const before = total(previous, widget.metric);
  const delta = before > 0 ? ((value - before) / before) * 100 : null;
  const up = delta !== null && delta >= 0;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
      <Avatar sx={{ width: 56, height: 56, background: blueGradient, color: '#fff' }}>
        {metricIcon(widget)}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" fontWeight={600} noWrap>
          {widget.title || t(metric?.label || 'sharedName')}
        </Typography>
        <Typography component="div" sx={{ lineHeight: 1.15 }}>
          <Typography component="span" sx={{ fontSize: 34, fontWeight: 700 }}>
            {format(value)}
          </Typography>
          <Typography component="span" color="textSecondary" sx={{ fontSize: 16, ml: 0.5 }}>
            {metric?.unit}
          </Typography>
        </Typography>
        {delta !== null && (
          <Typography
            component="div"
            variant="body2"
            sx={{
              color: up ? brand.up : brand.down,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {up ? <ArrowUpwardIcon fontSize="inherit" /> : <ArrowDownwardIcon fontSize="inherit" />}
            {format(Math.abs(delta))}%
          </Typography>
        )}
      </Box>
      {daily.length > 1 && (
        <Box sx={{ width: '42%', height: 72 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`spark-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={brand.blue} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={brand.blue} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={brand.blue}
                strokeWidth={2}
                fill={`url(#spark-${widget.id})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Box>
  );
};

const Empty = () => {
  const t = useTranslation();
  return (
    <Typography color="textSecondary" sx={{ py: 3, textAlign: 'center' }}>
      {t('sharedNoData')}
    </Typography>
  );
};

const WidgetView = ({ widget, data }) => {
  const theme = useTheme();
  const { rows } = useRows(widget, data);
  const unit = SOURCES[widget.source]?.metrics[widget.metric]?.unit || '';
  const grid = theme.palette.divider;

  if (!rows.length) return <Empty />;

  switch (widget.type) {
    case 'bar':
      return (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={rows} margin={{ top: 24, right: 8, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id={`bar-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2a73ff" />
                <stop offset="100%" stopColor={brand.blueDark} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={grid} />
            <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v) => `${v} ${unit}`} cursor={{ fill: 'rgba(11,95,232,0.06)' }} />
            <Bar
              dataKey="value"
              fill={`url(#bar-${widget.id})`}
              radius={[4, 4, 0, 0]}
              maxBarSize={56}
              isAnimationActive={false}
            >
              <LabelList dataKey="value" position="top" style={{ fontWeight: 700, fontSize: 13 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    case 'line':
      return (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={rows} margin={{ top: 16, right: 16, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id={`area-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={brand.blue} stopOpacity={0.3} />
                <stop offset="100%" stopColor={brand.blue} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={grid} />
            <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v) => `${v} ${unit}`} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={brand.blue}
              strokeWidth={2.5}
              fill={`url(#area-${widget.id})`}
              dot={{ r: 4, fill: brand.blue, stroke: '#fff', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    case 'pie': {
      const sum = rows.reduce((a, r) => a + r.value, 0);
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ position: 'relative', width: 210, height: 210, flexShrink: 0, mx: 'auto' }}>
            <PieChart width={210} height={210}>
              <Pie
                data={rows}
                dataKey="value"
                nameKey="name"
                innerRadius={62}
                outerRadius={98}
                stroke="none"
                isAnimationActive={false}
              >
                {rows.map((r, i) => (
                  <Cell key={r.name} fill={chartColors[i % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `${v} ${unit}`} />
            </PieChart>
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              <Typography sx={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>
                {format(sum)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {unit}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ flex: 1, minWidth: 150 }}>
            {rows.map((r, i) => (
              <Box key={r.name} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    flexShrink: 0,
                    bgcolor: chartColors[i % chartColors.length],
                  }}
                />
                <Typography variant="body2" sx={{ flex: 1 }} noWrap>
                  {r.name}
                </Typography>
                <Typography variant="body2" sx={{ textAlign: 'right', lineHeight: 1.2 }}>
                  <b>
                    {format(r.value)} {unit}
                  </b>
                  <br />
                  <span style={{ color: brand.muted }}>
                    {sum ? format((r.value / sum) * 100) : 0}%
                  </span>
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      );
    }
    default:
      return (
        <Table size="small">
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.name}>
                <TableCell>{r.name}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  {format(r.value)} {unit}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
  }
};

export default WidgetView;
