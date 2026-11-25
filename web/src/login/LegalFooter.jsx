import { Link, Typography } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { useTranslation } from '../common/components/LocalizationProvider';
import useLegalUrls from '../common/util/useLegalUrls';
import { openConsentSettings } from '../common/util/consent';

const useStyles = makeStyles()((theme) => ({
  root: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: theme.spacing(0.5, 2),
    padding: theme.spacing(0, 2, 2),
  },
}));

const LegalFooter = () => {
  const { classes } = useStyles();
  const t = useTranslation();
  const { termsUrl, privacyUrl, licensesUrl } = useLegalUrls();

  return (
    <Typography
      component="nav"
      variant="caption"
      className={classes.root}
      aria-label={t('legalTitle')}
    >
      <Link href={privacyUrl} target="_blank" rel="noopener" color="inherit">
        {t('userPrivacy')}
      </Link>
      <Link href={termsUrl} target="_blank" rel="noopener" color="inherit">
        {t('userTerms')}
      </Link>
      <Link
        component="button"
        type="button"
        variant="caption"
        color="inherit"
        onClick={openConsentSettings}
      >
        {t('legalCookiesSettings')}
      </Link>
      <Link href={licensesUrl} target="_blank" rel="noopener" color="inherit">
        {t('legalLicenses')}
      </Link>
    </Typography>
  );
};

export default LegalFooter;
