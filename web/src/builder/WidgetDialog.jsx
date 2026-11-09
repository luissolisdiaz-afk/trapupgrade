import { useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  InputAdornment,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import TitleIcon from '@mui/icons-material/Title';
import BarChartIcon from '@mui/icons-material/BarChart';
import StorageIcon from '@mui/icons-material/Storage';
import SpeedIcon from '@mui/icons-material/Speed';
import GroupsIcon from '@mui/icons-material/Groups';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import { useTranslation } from '../common/components/LocalizationProvider';
import { SOURCES } from './aggregate';
import { blueGradient, brand } from './style';

const TYPES = ['kpi', 'bar', 'line', 'pie', 'table'];

const field = (Icon) => ({
  input: {
    startAdornment: (
      <InputAdornment position="start">
        <Icon fontSize="small" sx={{ color: brand.navyHeader }} />
      </InputAdornment>
    ),
  },
});

const WidgetDialog = ({ open, widget, onClose, onSave }) => {
  const t = useTranslation();
  const [draft, setDraft] = useState(widget);

  const set = (patch) => {
    const next = { ...draft, ...patch };
    const source = SOURCES[next.source];
    if (!source.metrics[next.metric]) next.metric = Object.keys(source.metrics)[0];
    if (!source.groupBys.includes(next.groupBy)) next.groupBy = source.groupBys[0];
    if (next.type === 'kpi') next.groupBy = 'none';
    else if (next.groupBy === 'none') next.groupBy = source.groupBys.find((g) => g !== 'none');
    setDraft(next);
  };
  const source = SOURCES[draft.source];
  const sx = { '& .MuiOutlinedInput-root': { borderRadius: 2.5 } };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      slotProps={{ paper: { sx: { borderRadius: 4, p: 1 } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, pt: 2, pb: 1 }}>
        <Avatar sx={{ background: blueGradient, width: 40, height: 40 }}>
          <AddIcon />
        </Avatar>
        <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>
          {t('builderAddWidget')}
        </Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.75, pt: '12px !important' }}>
        <TextField
          sx={sx}
          label={t('sharedName')}
          value={draft.title}
          onChange={(e) => set({ title: e.target.value })}
          slotProps={field(TitleIcon)}
        />
        <TextField
          select
          sx={sx}
          label={t('builderChart')}
          value={draft.type}
          onChange={(e) => set({ type: e.target.value })}
          slotProps={field(BarChartIcon)}
        >
          {TYPES.map((it) => (
            <MenuItem key={it} value={it}>{t(`builder_${it}`)}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          sx={sx}
          label={t('builderSource')}
          value={draft.source}
          onChange={(e) => set({ source: e.target.value })}
          slotProps={field(StorageIcon)}
        >
          {Object.keys(SOURCES).map((it) => (
            <MenuItem key={it} value={it}>{t(`builderSource_${it}`)}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          sx={sx}
          label={t('builderMetric')}
          value={draft.metric}
          onChange={(e) => set({ metric: e.target.value })}
          slotProps={field(SpeedIcon)}
        >
          {Object.entries(source.metrics).map(([key, m]) => (
            <MenuItem key={key} value={key}>{t(m.label)}</MenuItem>
          ))}
        </TextField>
        {draft.type !== 'kpi' && (
          <TextField
            select
            sx={sx}
            label={t('builderGroupBy')}
            value={draft.groupBy}
            onChange={(e) => set({ groupBy: e.target.value })}
            slotProps={field(GroupsIcon)}
          >
            {source.groupBys.filter((g) => g !== 'none').map((g) => (
              <MenuItem key={g} value={g}>{t(`builderBy_${g}`)}</MenuItem>
            ))}
          </TextField>
        )}
        <TextField
          select
          sx={sx}
          label={t('builderWidth')}
          value={draft.span}
          onChange={(e) => set({ span: Number(e.target.value) })}
          slotProps={field(ViewWeekIcon)}
        >
          {[1, 2, 3].map((n) => (
            <MenuItem key={n} value={n}>{n}/3</MenuItem>
          ))}
        </TextField>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button sx={{ textTransform: 'none', fontWeight: 600, color: brand.blue }} onClick={onClose}>
          {t('sharedCancel')}
        </Button>
        <Button
          variant="contained"
          startIcon={<CheckIcon />}
          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2.5, background: blueGradient }}
          onClick={() => onSave(draft)}
        >
          {t('sharedSave')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WidgetDialog;
