import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  Container,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from './components/SettingsMenu';
import { useTranslation } from '../common/components/LocalizationProvider';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { useCatch } from '../reactHelper';
import { messagesActions } from '../store';

const TYPES = [
  'deviceOnline',
  'deviceOffline',
  'deviceMoving',
  'deviceStopped',
  'deviceOverspeed',
  'geofenceEnter',
  'geofenceExit',
  'ignitionOn',
  'ignitionOff',
  'alarm',
  'deviceInactive',
  'maintenance',
];

const VARIABLES = ['device', 'event', 'time', 'address', 'speed', 'geofence', 'alarm', 'link'];

const label = (t, type) => t(`event${type.charAt(0).toUpperCase()}${type.slice(1)}`);

const defaultText = (t, type) => {
  const name = label(t, type);
  const lines = [`${t('tplDevice')}: {device}`, name];
  if (type === 'deviceOverspeed') lines.push(`${t('tplSpeed')}: {speed}`);
  if (type.startsWith('geofence')) lines.push(`${t('tplGeofence')}: {geofence}`);
  if (type === 'alarm') lines.push('{alarm}');
  lines.push(`${t('tplTime')}: {time}`, `${t('tplPlace')}: {address}`);
  return { subject: `{device}: ${name}`, body: lines.join('\n') };
};

const preview = (text, t, type) => {
  const sample = {
    device: 'Camión 01',
    event: label(t, type),
    time: '2026-11-09 09:30:00',
    address: 'Av. Providencia 1234, Santiago',
    speed: '62.0 km/h',
    geofence: 'Bodega central',
    alarm: 'SOS',
    link: 'https://tu-servidor/event/123',
  };
  return Object.entries(sample).reduce((acc, [key, value]) => acc.split(`{${key}}`).join(value), text);
};

const TemplateEditor = ({ type, custom, onChanged }) => {
  const t = useTranslation();
  const dispatch = useDispatch();
  const base = custom || defaultText(t, type);
  const [subject, setSubject] = useState(base.subject);
  const [body, setBody] = useState(base.body);
  const [focus, setFocus] = useState('body');

  useEffect(() => {
    const next = custom || defaultText(t, type);
    setSubject(next.subject);
    setBody(next.body);
  }, [custom, type, t]);

  const insert = (variable) => {
    const token = `{${variable}}`;
    if (focus === 'subject') setSubject((value) => value + token);
    else setBody((value) => value + token);
  };

  const save = useCatch(async () => {
    await fetchOrThrow(`api/notificationtemplates/${type}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, body }),
    });
    dispatch(messagesActions.push(t('tplSaved')));
    onChanged();
  });

  const restore = useCatch(async () => {
    await fetchOrThrow(`api/notificationtemplates/${type}`, { method: 'DELETE' });
    dispatch(messagesActions.push(t('tplRestored')));
    onChanged();
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <TextField
        label={t('tplSubject')}
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        onFocus={() => setFocus('subject')}
        slotProps={{ htmlInput: { maxLength: 2000 } }}
      />
      <TextField
        label={t('tplMessage')}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onFocus={() => setFocus('body')}
        multiline
        minRows={5}
        slotProps={{ htmlInput: { maxLength: 2000 } }}
      />
      <Box>
        <Typography variant="caption" color="textSecondary">
          {t('tplVariables')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
          {VARIABLES.map((variable) => (
            <Chip
              key={variable}
              size="small"
              label={`{${variable}}`}
              onClick={() => insert(variable)}
              clickable
            />
          ))}
        </Box>
      </Box>
      <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
        <Typography variant="caption" color="textSecondary">
          {t('tplPreview')}
        </Typography>
        <Typography variant="subtitle2" sx={{ mt: 0.5 }}>
          {preview(subject, t, type)}
        </Typography>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
          {preview(body, t, type)}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button variant="contained" onClick={save} disabled={!subject.trim() || !body.trim()}>
          {t('sharedSave')}
        </Button>
        <Button variant="outlined" onClick={restore} disabled={!custom}>
          {t('tplRestore')}
        </Button>
      </Box>
    </Box>
  );
};

const NotificationTemplatesPage = () => {
  const t = useTranslation();
  const [templates, setTemplates] = useState({});
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchOrThrow('api/notificationtemplates')
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setTemplates(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [version]);

  return (
    <PageLayout menu={<SettingsMenu />} breadcrumbs={['settingsTitle', 'tplTitle']}>
      <Container maxWidth="md" sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Alert severity="info">{t('tplHint')}</Alert>
        {TYPES.map((type) => (
          <Accordion key={type} disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ flex: 1 }}>{label(t, type)}</Typography>
              <Chip
                size="small"
                color={templates[type] ? 'primary' : 'default'}
                label={templates[type] ? t('tplCustom') : t('tplDefault')}
                sx={{ mr: 1 }}
              />
            </AccordionSummary>
            <AccordionDetails>
              <TemplateEditor
                type={type}
                custom={templates[type]}
                onChanged={() => setVersion((v) => v + 1)}
              />
            </AccordionDetails>
          </Accordion>
        ))}
      </Container>
    </PageLayout>
  );
};

export default NotificationTemplatesPage;
