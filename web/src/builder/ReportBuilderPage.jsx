import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import dayjs from 'dayjs';
import { saveAs } from 'file-saver';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import DeleteIcon from '@mui/icons-material/Delete';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import GroupsIcon from '@mui/icons-material/Groups';
import BarChartIcon from '@mui/icons-material/BarChart';
import SpeedIcon from '@mui/icons-material/Speed';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import PageLayout from '../common/components/PageLayout';
import ReportsMenu from '../reports/components/ReportsMenu';
import { useTranslation } from '../common/components/LocalizationProvider';
import { defaultWidgets, SOURCES } from './aggregate';
import useBuilderData from './useBuilderData';
import WidgetView, { KpiContent, typeIcon, widgetTitle } from './WidgetView';
import WidgetDialog from './WidgetDialog';
import { blueGradient, brand } from './style';
import MainSidebar from '../main/MainSidebar';

const useStyles = makeStyles()((theme) => ({
  page: {
    minHeight: '100%',
    background: theme.palette.mode === 'dark' ? theme.palette.background.default : brand.pageBackground,
  },
  container: {
    padding: theme.spacing(2),
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
  },
  toolbar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1.5),
    alignItems: 'center',
    padding: theme.spacing(1.5),
    borderRadius: 14,
    background: theme.palette.background.paper,
    boxShadow: '0 1px 4px rgba(15, 33, 71, 0.08)',
  },
  field: {
    '& .MuiOutlinedInput-root': {
      borderRadius: 10,
    },
  },
  showButton: {
    borderRadius: 10,
    background: blueGradient,
    textTransform: 'none',
    fontWeight: 600,
    padding: theme.spacing(1, 2.5),
  },
  doneButton: {
    borderRadius: 10,
    textTransform: 'none',
    fontWeight: 600,
  },
  linkButton: {
    textTransform: 'none',
    fontWeight: 600,
    color: brand.blue,
  },
  grid: {
    display: 'grid',
    gap: theme.spacing(2),
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    [theme.breakpoints.down('md')]: {
      gridTemplateColumns: 'minmax(0, 1fr)',
    },
  },
  widget: {
    gridColumn: 'span var(--span)',
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    boxShadow: '0 1px 4px rgba(15, 33, 71, 0.08)',
    [theme.breakpoints.down('md')]: {
      gridColumn: 'span 1',
    },
  },
  editing: {
    outline: `2px dashed ${brand.blue}55`,
  },
  dragging: {
    opacity: 0.4,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    padding: theme.spacing(1.25, 2),
    background: brand.navyHeader,
    color: '#fff',
  },
  body: {
    padding: theme.spacing(2),
  },
  kpiControls: {
    position: 'absolute',
    top: 4,
    right: 4,
    display: 'flex',
    alignItems: 'center',
    zIndex: 1,
  },
}));

const read = (key, fallback) => {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable
  }
};

const icon = (Component) => ({
  input: {
    startAdornment: (
      <InputAdornment position="start">
        <Component fontSize="small" sx={{ color: brand.blue }} />
      </InputAdornment>
    ),
  },
});

const ReportBuilderPage = ({ readOnly = false }) => {
  const { classes, cx } = useStyles();
  const t = useTranslation();
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const fileRef = useRef(null);

  const groups = useSelector((state) => state.groups.items);
  const devices = useSelector((state) => state.devices.items);

  const [widgets, setWidgets] = useState(() => (readOnly ? defaultWidgets : read('reportBuilderWidgets', defaultWidgets)));
  const [templates, setTemplates] = useState(() => (readOnly ? {} : read('reportBuilderTemplates', {})));
  const [filter, setFilter] = useState({
    from: dayjs().subtract(7, 'day').startOf('day').format('YYYY-MM-DDTHH:mm'),
    to: dayjs().endOf('day').format('YYYY-MM-DDTHH:mm'),
    groupId: '',
    deviceIds: [],
  });
  const [editing, setEditing] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  const [templateAnchor, setTemplateAnchor] = useState(null);
  const [kpiAnchor, setKpiAnchor] = useState(null);
  const [error, setError] = useState(null);

  const [data, loading, load, info] = useBuilderData();

  useEffect(() => {
    if (!readOnly) write('reportBuilderWidgets', widgets);
  }, [widgets, readOnly]);

  useEffect(() => {
    load(filter);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const reveal = (id) => {
    setEditing(true);
    setTimeout(
      () => document.getElementById(`widget-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      150,
    );
  };

  const moveWidget = (id, delta) => {
    setWidgets((list) => {
      const index = list.findIndex((w) => w.id === id);
      const target = index + delta;
      if (index < 0 || target < 0 || target >= list.length) return list;
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const resizeWidget = (id) => {
    setWidgets((list) => list.map((w) => (w.id === id ? { ...w, span: (w.span % 3) + 1 } : w)));
  };

  const saveWidget = (widget) => {
    if (!widgets.some((w) => w.id === widget.id)) reveal(widget.id);
    setWidgets((list) =>
      list.some((w) => w.id === widget.id)
        ? list.map((w) => (w.id === widget.id ? widget : w))
        : [...list, widget],
    );
    setDialog(null);
  };

  const drop = (index) => {
    if (dragIndex === null || dragIndex === index) return;
    setWidgets((list) => {
      const next = [...list];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(index, 0, moved);
      return next;
    });
    setDragIndex(null);
  };

  const saveTemplate = () => {
    const name = window.prompt(t('sharedName'));
    if (name) {
      const next = { ...templates, [name]: widgets };
      setTemplates(next);
      write('reportBuilderTemplates', next);
    }
  };

  const exportTemplate = () => {
    const blob = new Blob([JSON.stringify({ version: 1, widgets }, null, 2)], {
      type: 'application/json',
    });
    saveAs(blob, 'report.tpl');
  };

  const importTemplate = async (event) => {
    const [file] = event.target.files;
    event.target.value = '';
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed.widgets)) throw new Error('Invalid template');
      setWidgets(parsed.widgets.map((w, i) => ({ ...w, id: `i${Date.now()}${i}` })));
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  };

  const apply = () => {
    setError(null);
    load(filter);
  };

  const addKpi = (source, metric) => {
    const id = `k${Date.now()}`;
    setWidgets((list) => [...list, { id, type: 'kpi', title: '', source, metric, groupBy: 'none', span: 1 }]);
    reveal(id);
    setKpiAnchor(null);
  };

  const newWidget = () => ({
    id: `w${Date.now()}`,
    type: 'bar',
    title: '',
    source: 'trips',
    metric: 'distance',
    groupBy: 'device',
    span: 1,
  });

  const controls = (widget, light) => (
    <>
      <Tooltip title={t('builderMoveBefore')}>
        <IconButton size="small" sx={{ color: light ? '#fff' : 'inherit' }} onClick={() => moveWidget(widget.id, -1)}>
          <ChevronLeftIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title={t('builderMoveAfter')}>
        <IconButton size="small" sx={{ color: light ? '#fff' : 'inherit' }} onClick={() => moveWidget(widget.id, 1)}>
          <ChevronRightIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title={t('builderWidth')}>
        <Button
          size="small"
          sx={{ color: light ? '#fff' : 'inherit', minWidth: 0, px: 0.75, fontWeight: 700 }}
          onClick={() => resizeWidget(widget.id)}
        >
          {`↔ ${widget.span}`}
        </Button>
      </Tooltip>
      <IconButton size="small" sx={{ color: light ? '#fff' : 'inherit' }} onClick={() => setDialog(widget)}>
        <EditIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        sx={{ color: light ? '#fff' : 'inherit' }}
        onClick={() => setWidgets((l) => l.filter((w) => w.id !== widget.id))}
      >
        <DeleteIcon fontSize="small" />
      </IconButton>
    </>
  );

  const content = (
    <>
      <div className={classes.page}>
        <div className={classes.container}>
          {readOnly && (
            <Typography variant="h5" fontWeight={700} color={brand.navy}>
              {t('dashboardTitle')}
            </Typography>
          )}
          <div className={classes.toolbar}>
            <TextField
              className={classes.field}
              size="small"
              type="datetime-local"
              label={t('reportFrom')}
              value={filter.from}
              onChange={(e) => setFilter({ ...filter, from: e.target.value })}
              slotProps={{ inputLabel: { shrink: true }, ...icon(CalendarTodayIcon) }}
            />
            <TextField
              className={classes.field}
              size="small"
              type="datetime-local"
              label={t('reportTo')}
              value={filter.to}
              onChange={(e) => setFilter({ ...filter, to: e.target.value })}
              slotProps={{ inputLabel: { shrink: true }, ...icon(CalendarTodayIcon) }}
            />
            <TextField
              select
              className={classes.field}
              size="small"
              label={t('reportGroup')}
              value={filter.groupId}
              onChange={(e) =>
                setFilter({
                  ...filter,
                  groupId: e.target.value,
                  deviceIds: filter.deviceIds.filter(
                    (id) => !e.target.value || String(devices[id]?.groupId) === e.target.value,
                  ),
                })
              }
              sx={{ minWidth: 190 }}
              slotProps={icon(GroupsIcon)}
            >
              <MenuItem value="">{t('builderAllGroups')}</MenuItem>
              {Object.values(groups).map((g) => (
                <MenuItem key={g.id} value={String(g.id)}>
                  {g.name}
                </MenuItem>
              ))}
            </TextField>
            <Autocomplete
              multiple
              size="small"
              limitTags={2}
              disableCloseOnSelect
              className={classes.field}
              sx={{ minWidth: 260, maxWidth: 420 }}
              options={Object.values(devices)
                .filter((d) => !filter.groupId || String(d.groupId) === filter.groupId)
                .sort((a, b) => a.name.localeCompare(b.name))}
              getOptionLabel={(d) => d.name}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              value={filter.deviceIds.map((id) => devices[id]).filter(Boolean)}
              onChange={(_, value) => setFilter({ ...filter, deviceIds: value.map((d) => d.id) })}
              noOptionsText={t('sharedNoData')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('deviceTitle')}
                  placeholder={filter.deviceIds.length ? '' : t('builderAllDevices')}
                />
              )}
            />
            <Button
              variant="contained"
              className={classes.showButton}
              startIcon={<BarChartIcon />}
              onClick={apply}
              disabled={loading}
            >
              {t('reportShow')}
            </Button>
            <Box sx={{ flexGrow: 1 }} />
            {!readOnly && editing && (
              <>
                <Button
                  className={classes.linkButton}
                  startIcon={<SpeedIcon />}
                  endIcon={<KeyboardArrowDownIcon />}
                  onClick={(e) => setKpiAnchor(e.currentTarget)}
                >
                  {t('builderAddKpi')}
                </Button>
                <Menu anchorEl={kpiAnchor} open={Boolean(kpiAnchor)} onClose={() => setKpiAnchor(null)}>
                  {Object.entries(SOURCES).flatMap(([source, def]) =>
                    Object.entries(def.metrics).map(([metric, m]) => (
                      <MenuItem key={`${source}.${metric}`} onClick={() => addKpi(source, metric)}>
                        {t(`builderSource_${source}`)} · {t(m.label)}
                        {m.unit ? ` (${m.unit})` : ''}
                      </MenuItem>
                    )),
                  )}
                </Menu>
                <Button className={classes.linkButton} startIcon={<AddIcon />} onClick={() => setDialog(newWidget())}>
                  {t('builderAddWidget')}
                </Button>
              </>
            )}
            {!readOnly && (
              <>
            <Button
              className={classes.linkButton}
              endIcon={<KeyboardArrowDownIcon />}
              onClick={(e) => setTemplateAnchor(e.currentTarget)}
            >
              {t('builderTemplates')}
            </Button>
            <Button
              variant="contained"
              className={classes.doneButton}
              sx={{ background: editing ? '#1b7f3a' : brand.navyHeader }}
              startIcon={editing ? <CheckIcon /> : <EditIcon />}
              onClick={() => setEditing(!editing)}
            >
              {editing ? t('builderDone') : t('builderEdit')}
            </Button>
              </>
            )}
          </div>
          <Menu anchorEl={templateAnchor} open={Boolean(templateAnchor)} onClose={() => setTemplateAnchor(null)}>
            <MenuItem onClick={() => { setTemplateAnchor(null); saveTemplate(); }}>{t('builderTemplateSave')}</MenuItem>
            <MenuItem onClick={() => { setTemplateAnchor(null); exportTemplate(); }}>{t('builderExport')}</MenuItem>
            <MenuItem onClick={() => { setTemplateAnchor(null); fileRef.current.click(); }}>{t('builderImport')}</MenuItem>
            {Object.keys(templates).map((name) => (
              <MenuItem key={name} onClick={() => { setTemplateAnchor(null); setWidgets(templates[name]); }}>
                {name}
              </MenuItem>
            ))}
          </Menu>
          <input ref={fileRef} type="file" accept=".tpl,application/json" hidden onChange={importTemplate} />
          {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
          {info.truncated && <Alert severity="info">{t('builderTruncated')}</Alert>}
          {editing && <Alert severity="info">{t('builderEditHint')}</Alert>}
          {!widgets.length && <Typography color="textSecondary">{t('builderEmpty')}</Typography>}
          <div className={classes.grid}>
            {widgets.map((widget, index) => (
              <Card
                key={widget.id}
                id={`widget-${widget.id}`}
                className={cx(
                  classes.widget,
                  editing && classes.editing,
                  dragIndex === index && classes.dragging,
                )}
                style={{ '--span': widget.span }}
                draggable={editing}
                onDragStart={() => setDragIndex(index)}
                onDragEnd={() => setDragIndex(null)}
                onDragOver={(e) => editing && e.preventDefault()}
                onDrop={() => drop(index)}
              >
                {widget.type === 'kpi' ? (
                  <>
                    {editing && (
                      <div className={classes.kpiControls}>
                        <DragIndicatorIcon fontSize="small" sx={{ cursor: 'grab', color: brand.muted }} />
                        {controls(widget, false)}
                      </div>
                    )}
                    <KpiContent widget={widget} data={data} />
                  </>
                ) : (
                  <>
                    <div className={classes.header}>
                      {typeIcon(widget.type)}
                      <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1 }} noWrap>
                        {widgetTitle(widget, t)}
                      </Typography>
                      {editing && (
                        <>
                          <DragIndicatorIcon fontSize="small" sx={{ cursor: 'grab' }} />
                          {controls(widget, true)}
                        </>
                      )}
                    </div>
                    <div className={classes.body}>
                      <WidgetView widget={widget} data={data} />
                    </div>
                  </>
                )}
              </Card>
            ))}
          </div>
        </div>
      </div>
      {!readOnly && dialog && (
        <WidgetDialog key={dialog.id} open widget={dialog} onClose={() => setDialog(null)} onSave={saveWidget} />
      )}
    </>
  );

  if (readOnly && desktop) {
    return (
      <div style={{ height: '100%', display: 'flex' }}>
        <MainSidebar />
        <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>{content}</div>
      </div>
    );
  }

  return (
    <PageLayout
      menu={<ReportsMenu />}
      breadcrumbs={readOnly ? ['dashboardTitle'] : ['reportTitle', 'builderTitle']}
    >
      {content}
    </PageLayout>
  );
};

export default ReportBuilderPage;
