import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from '../../common/components/LocalizationProvider';
import { useCatch } from '../../reactHelper';
import fetchOrThrow from '../../common/util/fetchOrThrow';

const json = (body) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

// El cliente cambia su propio teléfono con un código: llega por WhatsApp al número nuevo
// (o por correo si el servidor no tiene WhatsApp) y el cambio se guarda solo al confirmarlo.
const PhoneChangeDialog = ({ open, onClose, onChanged }) => {
  const t = useTranslation();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [channel, setChannel] = useState(null);
  const [sending, setSending] = useState(false);

  const close = () => {
    setPhone('');
    setCode('');
    setChannel(null);
    onClose();
  };

  const requestCode = useCatch(async () => {
    setSending(true);
    try {
      const response = await fetchOrThrow('api/phone/code', json({ phone }));
      setChannel((await response.json()).channel);
    } finally {
      setSending(false);
    }
  });

  const confirm = useCatch(async () => {
    const response = await fetchOrThrow('api/phone/confirm', json({ code }));
    onChanged(await response.json());
    close();
  });

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle>{t('userPhoneChange')}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <TextField
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          label={t('userPhoneNew')}
          placeholder="+56 9 1234 5678"
          type="tel"
          autoComplete="tel"
          disabled={Boolean(channel)}
          margin="dense"
        />
        {channel && (
          <>
            <Typography variant="body2">
              {t(channel === 'whatsapp' ? 'userPhoneCodeWhatsapp' : 'userPhoneCodeEmail')}
            </Typography>
            <TextField
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              label={t('userPhoneCode')}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>{t('sharedCancel')}</Button>
        {channel ? (
          <Button onClick={confirm} disabled={code.length !== 6} variant="contained">
            {t('userPhoneConfirm')}
          </Button>
        ) : (
          <Button onClick={requestCode} disabled={!phone.trim() || sending} variant="contained">
            {t('userPhoneSendCode')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PhoneChangeDialog;
