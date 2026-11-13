import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  Autocomplete,
  Button,
  Container,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useTranslation } from '../common/components/LocalizationProvider';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from './components/SettingsMenu';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { useAsyncTask, useCatchCallback } from '../reactHelper';
import { messagesActions } from '../store';
import { formatTime } from '../common/util/formatter';

const useStyles = makeStyles()((theme) => ({
  container: { padding: theme.spacing(2), display: 'flex', flexDirection: 'column', gap: theme.spacing(2) },
  add: { display: 'flex', gap: theme.spacing(1), padding: theme.spacing(2) },
}));

const post = (method, userId, deviceId) =>
  fetchOrThrow('api/permissions', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: Number(userId), deviceId }),
  });

const UserDevicesPage = () => {
  const { classes } = useStyles();
  const t = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();

  const [all, setAll] = useState([]);
  const [linked, setLinked] = useState([]);
  const [user, setUser] = useState(null);
  const [selected, setSelected] = useState(null);
  const [version, setVersion] = useState(0);

  useAsyncTask(
    async ({ signal }) => {
      const [a, l, u] = await Promise.all([
        fetchOrThrow('api/devices?all=true&excludeAttributes=true', { signal }).then((r) => r.json()),
        fetchOrThrow(`api/devices?userId=${id}&excludeAttributes=true`, { signal }).then((r) => r.json()),
        fetchOrThrow(`api/users/${id}`, { signal }).then((r) => r.json()),
      ]);
      setAll(a);
      setLinked(l);
      setUser(u);
    },
    [id, version],
  );

  const add = useCatchCallback(async () => {
    if (!selected) return;
    await post('POST', id, selected.id);
    // comandos de corte de motor del equipo: también para este usuario
    const commands = await (await fetchOrThrow(`api/commands?deviceId=${selected.id}`)).json();
    await Promise.all(
      commands
        .filter((c) => c.attributes?.autoDevice)
        .map((c) =>
          fetchOrThrow('api/permissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: Number(id), commandId: c.id }),
          }).catch(() => {}),
        ),
    );
    setSelected(null);
    setVersion((v) => v + 1);
    dispatch(messagesActions.push({ message: t('sharedSaved'), severity: 'success' }));
  }, [selected, id]);

  const remove = useCatchCallback(
    async (deviceId) => {
      await post('DELETE', id, deviceId);
      setVersion((v) => v + 1);
      dispatch(messagesActions.push({ message: t('sharedSaved'), severity: 'success' }));
    },
    [id],
  );

  const linkedIds = linked.map((d) => d.id);
  const options = all.filter((d) => !linkedIds.includes(d.id));

  return (
    <PageLayout menu={<SettingsMenu />} breadcrumbs={['settingsTitle', 'settingsUser', 'deviceTitle']}>
      <Container maxWidth="md" className={classes.container}>
        <Typography variant="h6">{`${user?.name || ''} · ${t('deviceTitle')} (${linked.length})`}</Typography>
        <Paper className={classes.add}>
          <Autocomplete
            size="small"
            fullWidth
            value={selected}
            onChange={(_, v) => setSelected(v)}
            options={options}
            getOptionLabel={(d) => `${d.name} (${d.uniqueId})`}
            renderInput={(params) => <TextField {...params} label={t('sharedAdd')} />}
          />
          <Button variant="contained" disabled={!selected} onClick={add}>
            {t('sharedAdd')}
          </Button>
          <Button variant="outlined" onClick={() => navigate('/settings/device')}>
            {t('sharedCreateDevice')}
          </Button>
        </Paper>
        <Paper>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('sharedName')}</TableCell>
                <TableCell>{t('deviceIdentifier')}</TableCell>
                <TableCell>{t('deviceModel')}</TableCell>
                <TableCell>{t('userExpirationTime')}</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {linked.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{d.name}</TableCell>
                  <TableCell>{d.uniqueId}</TableCell>
                  <TableCell>{d.model}</TableCell>
                  <TableCell>{d.expirationTime ? formatTime(d.expirationTime, 'date') : ''}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => navigate(`/settings/device/${d.id}`)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => remove(d.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Container>
    </PageLayout>
  );
};

export default UserDevicesPage;
