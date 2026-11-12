import {
  Snackbar,
  Alert,
  Button,
  Link,
  Dialog,
  DialogContent,
  DialogContentText,
  DialogActions,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { usePrevious } from '../../reactHelper';
import { messagesActions } from '../../store';
import { useTranslation } from './LocalizationProvider';
import { snackBarDurationShortMs } from '../util/duration';
import ConnectionBanner, { isNetworkError, useConnectionMessage } from './ConnectionBanner';

const MessageHandler = () => {
  const dispatch = useDispatch();
  const t = useTranslation();
  const connectionMessage = useConnectionMessage();

  const messages = useSelector((state) => state.messages.messages);
  const hasMessage = messages.length > 0;
  const currentMessage = messages[0];
  const cachedMessage = usePrevious(currentMessage);

  const activeMessage = hasMessage ? currentMessage : cachedMessage;
  const rawMessage =
    (typeof activeMessage === 'string' ? activeMessage : activeMessage?.message) ||
    t('errorGeneral');
  const message = isNetworkError(rawMessage) ? connectionMessage : rawMessage;
  const severity = activeMessage?.severity || 'error';
  const { duration = severity === 'error' ? null : snackBarDurationShortMs } = activeMessage || {};
  const multiline = message.includes('\n');
  const displayMessage = multiline
    ? message.split('\n')[0].replace(/^(?:(?:[\w$]+\.)*[\w$]+(?:Exception|Error)?:\s*)+/i, '')
    : message;

  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <ConnectionBanner />
      <Snackbar
        key={`${severity}:${message}`}
        open={hasMessage && !expanded}
        autoHideDuration={duration}
        onClose={(_, reason) => {
          if (duration !== null && reason !== 'clickaway') {
            dispatch(messagesActions.pop());
          }
        }}
      >
        <Alert
          elevation={6}
          onClose={() => dispatch(messagesActions.pop())}
          severity={severity}
          variant="filled"
        >
          {displayMessage}
          {multiline && (
            <>
              {' | '}
              <Link
                color="inherit"
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  setExpanded(true);
                }}
              >
                {t('sharedShowDetails')}
              </Link>
            </>
          )}
        </Alert>
      </Snackbar>
      <Dialog open={expanded} onClose={() => setExpanded(false)} maxWidth={false}>
        <DialogContent>
          <DialogContentText component="div">
            <Typography component="pre" variant="caption">
              {message}
            </Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExpanded(false)} autoFocus>
            {t('sharedHide')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MessageHandler;
