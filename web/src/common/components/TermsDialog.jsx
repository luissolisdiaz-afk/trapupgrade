import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Link,
} from '@mui/material';
import { useTranslation } from './LocalizationProvider';
import useLegalUrls from '../util/useLegalUrls';

// Se muestra hasta que la persona acepta la versión vigente. La aceptación queda registrada
// en el servidor (api/legal/terms) con fecha, hora, IP y versión.
const TermsDialog = ({ open, updated, onCancel, onAccept }) => {
  const t = useTranslation();
  const { termsUrl, privacyUrl, termsVersion } = useLegalUrls();

  return (
    <Dialog open={open} aria-labelledby="terms-dialog-title" disableEscapeKeyDown>
      <DialogTitle id="terms-dialog-title">{t('legalTitle')}</DialogTitle>
      <DialogContent>
        <DialogContentText component="div">
          {updated && <p>{t('legalTermsUpdated')}</p>}
          {t('userTermsPrompt')}
          <ul>
            <li>
              <Link href={termsUrl} target="_blank" rel="noopener">
                {t('userTerms')}
              </Link>
            </li>
            <li>
              <Link href={privacyUrl} target="_blank" rel="noopener">
                {t('userPrivacy')}
              </Link>
            </li>
          </ul>
          {`${t('legalTermsVersion')}: ${termsVersion}`}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>{t('legalReject')}</Button>
        <Button variant="contained" onClick={onAccept}>
          {t('sharedAccept')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TermsDialog;
