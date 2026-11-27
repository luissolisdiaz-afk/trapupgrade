import { useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Link,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from '../common/components/LocalizationProvider';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from './components/SettingsMenu';
import useSettingsStyles from './common/useSettingsStyles';
import useLegalUrls from '../common/util/useLegalUrls';
import { openConsentSettings, readConsent } from '../common/util/consent';
import { useAsyncTask, useCatch } from '../reactHelper';
import { formatTime } from '../common/util/formatter';
import fetchOrThrow from '../common/util/fetchOrThrow';

const LegalPage = () => {
  const { classes } = useSettingsStyles();
  const t = useTranslation();
  const { termsUrl, privacyUrl, cookiesUrl, licensesUrl } = useLegalUrls();

  const [records, setRecords] = useState(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [cancelResult, setCancelResult] = useState(null);

  useAsyncTask(
    async ({ signal }) => {
      // Tras una solicitud de baja se vuelve a pedir la lista (sin caché) para mostrarla.
      const suffix = cancelResult ? `?after=${cancelResult.id}` : '';
      const response = await fetchOrThrow(`api/legal/records${suffix}`, { signal });
      setRecords(await response.json());
    },
    [cancelResult],
  );

  const handleCancel = useCatch(async () => {
    const response = await fetchOrThrow('api/legal/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    setCancelResult(await response.json());
    setCancelOpen(false);
    setReason('');
  });

  const consent = readConsent();

  const recordTitle = (record) =>
    record.actionType === 'cancelService'
      ? `${t('legalCancelRequest')} N° ${record.id}`
      : `${t('legalAccepted')} (${t('legalTermsVersion')} ${record.attributes?.version ?? '-'})`;

  return (
    <PageLayout menu={<SettingsMenu />} breadcrumbs={['settingsTitle', 'legalTitle']}>
      <Container maxWidth="sm" className={classes.container}>
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">{t('legalDocuments')}</Typography>
          </AccordionSummary>
          <AccordionDetails className={classes.details}>
            <Link href={privacyUrl} target="_blank" rel="noopener">
              {t('userPrivacy')}
            </Link>
            <Link href={termsUrl} target="_blank" rel="noopener">
              {t('userTerms')}
            </Link>
            <Link href={cookiesUrl} target="_blank" rel="noopener">
              {t('legalCookies')}
            </Link>
            <Link href={licensesUrl} target="_blank" rel="noopener">
              {t('legalLicenses')}
            </Link>
          </AccordionDetails>
        </Accordion>

        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">{t('legalCookies')}</Typography>
          </AccordionSummary>
          <AccordionDetails className={classes.details}>
            <Typography variant="body2">
              {consent?.analytics ? t('legalCookiesAnalyticsOn') : t('legalCookiesAnalyticsOff')}
            </Typography>
            <Button variant="outlined" onClick={openConsentSettings}>
              {t('legalCookiesSettings')}
            </Button>
          </AccordionDetails>
        </Accordion>

        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">{t('legalHistory')}</Typography>
          </AccordionSummary>
          <AccordionDetails className={classes.details}>
            {records && !records.length && (
              <Typography variant="body2">{t('legalNoRecords')}</Typography>
            )}
            {records?.length > 0 && (
              <List dense disablePadding>
                {records.map((record) => (
                  <ListItem key={record.id} disableGutters>
                    <ListItemText
                      primary={recordTitle(record)}
                      secondary={`${formatTime(record.actionTime)} · IP ${record.address || '-'}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </AccordionDetails>
        </Accordion>

        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">{t('legalCancelTitle')}</Typography>
          </AccordionSummary>
          <AccordionDetails className={classes.details}>
            {cancelResult && (
              <Alert severity="success" role="status">
                {`${t('legalCancelDone')} N° ${cancelResult.id} · ${formatTime(cancelResult.actionTime)}`}
              </Alert>
            )}
            <Typography variant="body2">{t('legalCancelText')}</Typography>
            <Button variant="outlined" color="error" onClick={() => setCancelOpen(true)}>
              {t('legalCancelButton')}
            </Button>
          </AccordionDetails>
        </Accordion>
      </Container>

      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} aria-labelledby="cancel-title">
        <DialogTitle id="cancel-title">{t('legalCancelTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('legalCancelText')}</DialogContentText>
          <TextField
            fullWidth
            multiline
            minRows={2}
            margin="normal"
            label={t('legalCancelReason')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 500 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelOpen(false)}>{t('sharedCancel')}</Button>
          <Button variant="contained" color="error" onClick={handleCancel}>
            {t('legalCancelButton')}
          </Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
};

export default LegalPage;
