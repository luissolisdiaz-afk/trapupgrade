import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useMediaQuery, useTheme } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import BottomMenu from './common/components/BottomMenu';
import SocketController from './SocketController';
import CachingController from './CachingController';
import { useCatch, useAsyncTask } from './reactHelper';
import { sessionActions } from './store';
import UpdateController from './UpdateController';
import MotionController from './main/MotionController';
import TermsDialog from './common/components/TermsDialog';
import useLegalUrls from './common/util/useLegalUrls';
import Loader from './common/components/Loader';
import useFeatures from './common/util/useFeatures';
import fetchOrThrow from './common/util/fetchOrThrow';

const useStyles = makeStyles()(() => ({
  page: {
    flexGrow: 1,
    overflow: 'auto',
  },
  menu: {
    zIndex: 4,
    '@media print': {
      display: 'none',
    },
  },
}));

const App = () => {
  const { classes } = useStyles();
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const features = useFeatures();

  const desktop = useMediaQuery(theme.breakpoints.up('md'));

  const newServer = useSelector((state) => state.session.server.newServer);
  const { termsRequired, termsVersion } = useLegalUrls();
  const user = useSelector((state) => state.session.user);

  const acceptTerms = useCatch(async () => {
    const response = await fetchOrThrow('api/legal/terms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: termsVersion }),
    });
    dispatch(sessionActions.updateUser(await response.json()));
  });

  const rejectTerms = useCatch(async () => {
    await fetch('api/session', { method: 'DELETE' });
    navigate('/login');
    dispatch(sessionActions.updateUser(null));
  });

  useEffect(() => {
    if (!user) return;
    try {
      if (!window.sessionStorage.getItem('landed')) {
        window.sessionStorage.setItem('landed', '1');
        if (location.pathname === '/') navigate('/dashboard', { replace: true });
      }
    } catch {
      // sessionStorage no disponible
    }
  }, [user]);

  useAsyncTask(
    async ({ signal }) => {
      if (!user) {
        const response = await fetch('api/session', { signal });
        if (response.ok) {
          dispatch(sessionActions.updateUser(await response.json()));
        } else {
          window.sessionStorage.setItem('postLogin', location.pathname + location.search);
          navigate(newServer ? '/register' : '/login', { replace: true });
        }
      }
      return null;
    },
    [user, dispatch, navigate, newServer, location.pathname, location.search],
  );

  if (user == null) {
    return <Loader />;
  }
  if (termsRequired && String(user.attributes.termsVersion ?? '') !== termsVersion) {
    return (
      <TermsDialog
        open
        updated={Boolean(user.attributes.termsVersion)}
        onCancel={rejectTerms}
        onAccept={acceptTerms}
      />
    );
  }
  return (
    <>
      <SocketController />
      <CachingController />
      <UpdateController />
      <MotionController />
      <div className={classes.page}>
        <Outlet />
      </div>
      {!desktop && !features.disableTabs && (
        <div className={classes.menu}>
          <BottomMenu />
        </div>
      )}
    </>
  );
};

export default App;
