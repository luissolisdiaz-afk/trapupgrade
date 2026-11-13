import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  TextField,
  MenuItem,
  Autocomplete,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditItemView from './components/EditItemView';
import { useTranslation } from '../common/components/LocalizationProvider';
import BaseCommandView from './components/BaseCommandView';
import SettingsMenu from './components/SettingsMenu';
import useSettingsStyles from './common/useSettingsStyles';
import { COMMAND_CATALOG } from './commandCatalog';
import { useAsyncTask } from '../reactHelper';
import { messagesActions } from '../store';
import fetchOrThrow from '../common/util/fetchOrThrow';

const CommandPage = () => {
  const { classes } = useSettingsStyles();
  const t = useTranslation();

  const dispatch = useDispatch();
  const { id } = useParams();

  const [item, setItem] = useState();
  const [profile, setProfile] = useState('');
  const [devices, setDevices] = useState([]);
  const [selected, setSelected] = useState([]);

  useAsyncTask(async ({ signal }) => {
    if (!id) {
      const response = await fetchOrThrow('api/devices?all=true&excludeAttributes=true', { signal });
      setDevices(await response.json());
    }
  }, [id]);

  const auto = Boolean(item?.attributes?.autoDevice);
  const validate = () => item && item.type && item.description && !auto;

  const json = (body) => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  // Al crear: vincula el comando a los equipos elegidos y a los usuarios de esos equipos.
  const onItemSaved = async (command) => {
    if (!selected.length) return;
    const users = new Set();
    for (const device of selected) {
      // eslint-disable-next-line no-await-in-loop
      await fetchOrThrow('api/permissions', json({ deviceId: device.id, commandId: command.id }));
      // eslint-disable-next-line no-await-in-loop
      const list = await (await fetchOrThrow(`api/users?deviceId=${device.id}`)).json();
      list.forEach((u) => users.add(u.id));
    }
    for (const userId of users) {
      // eslint-disable-next-line no-await-in-loop
      await fetchOrThrow('api/permissions', json({ userId, commandId: command.id })).catch(() => {});
    }
    dispatch(messagesActions.push({ message: t('sharedSaved'), severity: 'success' }));
  };

  const pickCatalog = (type) => {
    const entry = COMMAND_CATALOG[profile].find((it) => it[0] === type);
    setItem({
      ...item,
      type: entry[1],
      attributes: entry[2] ? { data: entry[2] } : {},
      description: entry[0],
    });
  };

  return (
    <EditItemView
      endpoint="commands"
      item={item}
      setItem={setItem}
      validate={validate}
      onItemSaved={onItemSaved}
      menu={<SettingsMenu />}
      breadcrumbs={['settingsTitle', 'sharedSavedCommand']}
    >
      {item && (
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">{t('sharedRequired')}</Typography>
          </AccordionSummary>
          <AccordionDetails className={classes.details}>
            {auto && (
              <Typography variant="body2" color="error">
                {t('commandAutoNote')}
              </Typography>
            )}
            {!id && (
              <>
                <TextField select value={profile} onChange={(e) => setProfile(e.target.value)} label={t('commandProfile')}>
                  <MenuItem value="particular">{t('clientParticular')}</MenuItem>
                  <MenuItem value="empresa">{t('clientCompany')}</MenuItem>
                  <MenuItem value="r12l">Seeworld R12L (texto)</MenuItem>
                </TextField>
                {profile && (
                  <TextField
                    select
                    value={COMMAND_CATALOG[profile].some((it) => it[0] === item.description) ? item.description : ''}
                    onChange={(e) => pickCatalog(e.target.value)}
                    label={t('commandCatalog')}
                  >
                    {COMMAND_CATALOG[profile].map(([label]) => (
                      <MenuItem key={label} value={label}>{label}</MenuItem>
                    ))}
                  </TextField>
                )}
              </>
            )}
            <TextField
              value={item.description || ''}
              onChange={(event) => setItem({ ...item, description: event.target.value })}
              label={t('sharedDescription')}
            />
            <BaseCommandView item={item} setItem={setItem} />
            {!id && (
              <Autocomplete
                multiple
                options={devices}
                value={selected}
                onChange={(_, v) => setSelected(v)}
                getOptionLabel={(d) => `${d.name} (${d.uniqueId})`}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                renderInput={(params) => <TextField {...params} label={t('commandAssignDevices')} />}
              />
            )}
          </AccordionDetails>
        </Accordion>
      )}
    </EditItemView>
  );
};

export default CommandPage;
