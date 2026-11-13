import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  TextField,
  FormControlLabel,
  Checkbox,
  Autocomplete,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditItemView from './components/EditItemView';
import EditAttributesAccordion from './components/EditAttributesAccordion';
import { useTranslation } from '../common/components/LocalizationProvider';
import useGeofenceAttributes from '../common/attributes/useGeofenceAttributes';
import SettingsMenu from './components/SettingsMenu';
import SelectField from '../common/components/SelectField';
import { geofencesActions } from '../store';
import useSettingsStyles from './common/useSettingsStyles';
import { useAsyncTask } from '../reactHelper';
import { useAdministrator } from '../common/util/permissions';
import fetchOrThrow from '../common/util/fetchOrThrow';

const GeofencePage = () => {
  const { classes } = useSettingsStyles();
  const dispatch = useDispatch();
  const t = useTranslation();

  const geofenceAttributes = useGeofenceAttributes(t);

  const admin = useAdministrator();
  const { id } = useParams();

  const [item, setItem] = useState();
  const [devices, setDevices] = useState([]);
  const [selected, setSelected] = useState([]);
  const [initial, setInitial] = useState([]);

  // equipos disponibles y los que ya tienen esta geocerca
  useAsyncTask(
    async ({ signal }) => {
      const response = await fetchOrThrow(`api/devices?${admin ? 'all=true&' : ''}excludeAttributes=true`, { signal });
      const list = await response.json();
      setDevices(list);
      if (id) {
        const linked = [];
        await Promise.all(
          list.map(async (device) => {
            const r = await fetchOrThrow(`api/geofences?deviceId=${device.id}`, { signal });
            if ((await r.json()).some((g) => String(g.id) === String(id))) linked.push(device);
          }),
        );
        setSelected(linked);
        setInitial(linked);
      }
    },
    [id, admin],
  );

  const permission = (method, deviceId, geofenceId) =>
    fetchOrThrow('api/permissions', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, geofenceId }),
    });

  const onItemSaved = async (result) => {
    dispatch(geofencesActions.update([result]));
    const before = initial.map((d) => d.id);
    const after = selected.map((d) => d.id);
    for (const deviceId of after.filter((d) => !before.includes(d))) {
      // eslint-disable-next-line no-await-in-loop
      await permission('POST', deviceId, result.id);
    }
    for (const deviceId of before.filter((d) => !after.includes(d))) {
      // eslint-disable-next-line no-await-in-loop
      await permission('DELETE', deviceId, result.id);
    }
  };

  const validate = () => item && item.name;

  return (
    <EditItemView
      endpoint="geofences"
      item={item}
      setItem={setItem}
      validate={validate}
      onItemSaved={onItemSaved}
      menu={<SettingsMenu />}
      breadcrumbs={['settingsTitle', 'sharedGeofence']}
    >
      {item && (
        <>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">{t('sharedRequired')}</Typography>
            </AccordionSummary>
            <AccordionDetails className={classes.details}>
              <TextField
                value={item.name || ''}
                onChange={(event) => setItem({ ...item, name: event.target.value })}
                label={t('sharedName')}
              />
              <Autocomplete
                multiple
                options={devices}
                value={selected}
                onChange={(_, v) => setSelected(v)}
                getOptionLabel={(d) => d.name}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                renderInput={(params) => <TextField {...params} label={t('notificationDevices')} />}
              />
            </AccordionDetails>
          </Accordion>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">{t('sharedExtra')}</Typography>
            </AccordionSummary>
            <AccordionDetails className={classes.details}>
              <TextField
                value={item.description || ''}
                onChange={(event) => setItem({ ...item, description: event.target.value })}
                label={t('sharedDescription')}
              />
              <SelectField
                value={item.calendarId}
                onChange={(event) => setItem({ ...item, calendarId: Number(event.target.value) })}
                endpoint="api/calendars"
                label={t('sharedCalendar')}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={item.attributes.hide}
                    onChange={(e) =>
                      setItem({
                        ...item,
                        attributes: { ...item.attributes, hide: e.target.checked },
                      })
                    }
                  />
                }
                label={t('sharedFilterMap')}
              />
            </AccordionDetails>
          </Accordion>
          <EditAttributesAccordion
            attributes={item.attributes}
            setAttributes={(attributes) => setItem({ ...item, attributes })}
            definitions={geofenceAttributes}
          />
        </>
      )}
    </EditItemView>
  );
};

export default GeofencePage;
