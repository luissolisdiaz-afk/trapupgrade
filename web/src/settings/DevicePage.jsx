import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  FormControlLabel,
  Checkbox,
  Switch,
  TextField,
  Button,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FileInput from '../common/components/FileInput';
import EditItemView from './components/EditItemView';
import EngineLockSetup from './components/EngineLockSetup';
import EditAttributesAccordion from './components/EditAttributesAccordion';
import SelectField from '../common/components/SelectField';
import deviceCategories from '../common/util/deviceCategories';
import { useTranslation } from '../common/components/LocalizationProvider';
import useDeviceAttributes from '../common/attributes/useDeviceAttributes';
import { useAdministrator, useManager } from '../common/util/permissions';
import SettingsMenu from './components/SettingsMenu';
import useCommonDeviceAttributes from '../common/attributes/useCommonDeviceAttributes';
import { useCatch } from '../reactHelper';
import useSettingsStyles from './common/useSettingsStyles';
import ServerQrCodeDialog from '../common/components/ServerQrCodeDialog';
import fetchOrThrow from '../common/util/fetchOrThrow';

const DevicePage = () => {
  const { classes } = useSettingsStyles();
  const t = useTranslation();

  const navigate = useNavigate();
  const manager = useManager();
  const admin = useAdministrator();

  const commonDeviceAttributes = useCommonDeviceAttributes(t);
  const deviceAttributes = useDeviceAttributes(t);

  const [searchParams] = useSearchParams();
  const uniqueId = searchParams.get('uniqueId');

  const [item, setItem] = useState(uniqueId ? { uniqueId } : null);
  const [showQr, setShowQr] = useState(false);
  const [imageFile, setImageFile] = useState(null);

  const handleFileInput = useCatch(async (newFile) => {
    setImageFile(newFile);
    if (newFile && item?.id) {
      const response = await fetchOrThrow(`api/devices/${item.id}/image`, {
        method: 'POST',
        body: newFile,
      });
      setItem({ ...item, attributes: { ...item.attributes, deviceImage: await response.text() } });
    } else if (!newFile) {
      // eslint-disable-next-line no-unused-vars
      const { deviceImage, ...remainingAttributes } = item.attributes || {};
      setItem({ ...item, attributes: remainingAttributes });
    }
  });

  const validate = () => item && item.name && item.uniqueId;

  return (
    <EditItemView
      endpoint="devices"
      item={item}
      setItem={setItem}
      validate={validate}
      menu={<SettingsMenu />}
      breadcrumbs={['settingsTitle', 'sharedDevice']}
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
              {admin && (
              <TextField
                value={item.uniqueId || ''}
                onChange={(event) => setItem({ ...item, uniqueId: event.target.value })}
                label={t('deviceIdentifier')}
                helperText={t('deviceIdentifierHelp')}
                disabled={Boolean(uniqueId)}
              />
              )}
            </AccordionDetails>
          </Accordion>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">{t('sharedExtra')}</Typography>
            </AccordionSummary>
            <AccordionDetails className={classes.details}>
              <SelectField
                value={item.groupId}
                onChange={(event) => setItem({ ...item, groupId: Number(event.target.value) })}
                endpoint="api/groups"
                label={t('groupParent')}
              />
              {admin && (
              <TextField
                value={item.phone || ''}
                onChange={(event) => setItem({ ...item, phone: event.target.value })}
                label={t('sharedPhone')}
              />
              )}
              {admin && (
              <TextField
                value={item.model || ''}
                onChange={(event) => setItem({ ...item, model: event.target.value })}
                label={t('deviceModel')}
              />
              )}
              {admin && (
              <TextField
                value={item.contact || ''}
                onChange={(event) => setItem({ ...item, contact: event.target.value })}
                label={t('deviceContact')}
              />
              )}
              <SelectField
                value={item.category || 'default'}
                onChange={(event) => setItem({ ...item, category: event.target.value })}
                data={deviceCategories
                  .map((category) => ({
                    id: category,
                    name: t(`category${category.replace(/^\w/, (c) => c.toUpperCase())}`),
                  }))
                  .sort((a, b) => a.name.localeCompare(b.name))}
                label={t('deviceCategory')}
              />
              <TextField
                value={item.attributes?.plate || ''}
                onChange={(e) =>
                  setItem({ ...item, attributes: { ...item.attributes, plate: e.target.value.toUpperCase() } })
                }
                label={t('devicePlate')}
              />
              {admin && (
              <SelectField
                value={item.calendarId}
                onChange={(event) => setItem({ ...item, calendarId: Number(event.target.value) })}
                endpoint="api/calendars"
                label={t('sharedCalendar')}
              />
              )}
              {admin && (
                <>
              <TextField
                label={t('userExpirationTime')}
                type="date"
                value={item.expirationTime ? item.expirationTime.split('T')[0] : '2099-01-01'}
                onChange={(e) => {
                  if (e.target.value) {
                    setItem({ ...item, expirationTime: new Date(e.target.value).toISOString() });
                  }
                }}
                disabled={!manager}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={item.disabled}
                    onChange={(event) => setItem({ ...item, disabled: event.target.checked })}
                  />
                }
                label={t('sharedDisabled')}
                disabled={!manager}
              />
              <Button variant="outlined" color="primary" onClick={() => setShowQr(true)}>
                {t('sharedQrCode')}
              </Button>
                </>
              )}
            </AccordionDetails>
          </Accordion>
          {item.id && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">{t('attributeDeviceImage')}</Typography>
              </AccordionSummary>
              <AccordionDetails className={classes.details}>
                <FileInput
                  placeholder={t('attributeDeviceImage')}
                  value={imageFile}
                  onChange={handleFileInput}
                  slotProps={{ htmlInput: { accept: 'image/*' } }}
                />
              </AccordionDetails>
            </Accordion>
          )}
          {admin && item.id && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">{t('lockMethod')}</Typography>
              </AccordionSummary>
              <AccordionDetails className={classes.details}>
                <EngineLockSetup deviceId={item.id} deviceName={item.name} />
              </AccordionDetails>
            </Accordion>
          )}
          {admin && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">{t('sharedDeviceAccumulators')}</Typography>
              </AccordionSummary>
              <AccordionDetails className={classes.details}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(item.attributes?.allowOdometer)}
                      onChange={(e) =>
                        setItem({ ...item, attributes: { ...item.attributes, allowOdometer: e.target.checked } })
                      }
                    />
                  }
                  label={t('deviceAllowOdometer')}
                />
              </AccordionDetails>
            </Accordion>
          )}
          {item.id && (admin || item.attributes?.allowOdometer) && (
            <Button variant="outlined" onClick={() => navigate(`/settings/accumulators/${item.id}`)}>
              {t('deviceEditOdometer')}
            </Button>
          )}
          {admin && (
          <EditAttributesAccordion
            attributes={item.attributes}
            setAttributes={(attributes) => setItem({ ...item, attributes })}
            definitions={{ ...commonDeviceAttributes, ...deviceAttributes }}
          />
          )}
        </>
      )}
      <ServerQrCodeDialog open={showQr} onClose={() => setShowQr(false)} />
    </EditItemView>
  );
};

export default DevicePage;
