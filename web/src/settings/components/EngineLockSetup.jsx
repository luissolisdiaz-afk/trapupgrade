import { useEffect, useState } from 'react';
import { Button, MenuItem, TextField, Typography } from '@mui/material';
import { useDispatch } from 'react-redux';
import { useTranslation } from '../../common/components/LocalizationProvider';
import { useCatch } from '../../reactHelper';
import { messagesActions } from '../../store';
import fetchOrThrow from '../../common/util/fetchOrThrow';

const json = (method, body) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const link = (body) => fetchOrThrow('api/permissions', json('POST', body));

// Crea (o reemplaza) los comandos de corte/habilitación de un equipo y los asigna al equipo y a sus usuarios.
export const applyEngineLock = async ({ deviceId, deviceName, method, lockData, unlockData, current = [] }) => {
  await Promise.all(current.map((c) => fetchOrThrow(`api/commands/${c.id}`, { method: 'DELETE' })));
  if (method === 'none') return;
  const make = (kind) => {
    const base = {
      description: `${kind === 'lock' ? 'Corte de motor' : 'Desbloqueo de motor'} - ${deviceName}`,
      textChannel: false,
    };
    const attributes = { quickAction: true, quickActionKind: kind, autoDevice: deviceId };
    if (method === 'traccar') {
      return { ...base, type: kind === 'lock' ? 'engineStop' : 'engineResume', attributes };
    }
    const data =
      method === 'relay' ? (kind === 'lock' ? 'Relay,1#' : 'Relay,0#') : kind === 'lock' ? lockData : unlockData;
    return { ...base, type: 'custom', attributes: { ...attributes, data } };
  };
  const users = await (await fetchOrThrow(`api/users?deviceId=${deviceId}`)).json();
  const created = [];
  for (const body of [make('lock'), make('unlock')]) {
    // eslint-disable-next-line no-await-in-loop
    created.push(await (await fetchOrThrow('api/commands', json('POST', body))).json());
  }
  for (const command of created) {
    // eslint-disable-next-line no-await-in-loop
    await link({ deviceId, commandId: command.id });
    for (const user of users) {
      // eslint-disable-next-line no-await-in-loop
      await link({ userId: user.id, commandId: command.id }).catch(() => {});
    }
  }
};

// Método de corte de motor de un equipo (solo administrador).
// Crea los dos comandos rápidos (cortar / habilitar), los vincula al equipo
// y a todos los usuarios del equipo.
const EngineLockSetup = ({ deviceId, deviceName, onChange }) => {
  const t = useTranslation();
  const dispatch = useDispatch();

  const [method, setMethod] = useState('none');
  const [lockData, setLockData] = useState('Relay,1#');
  const [unlockData, setUnlockData] = useState('Relay,0#');
  const [current, setCurrent] = useState([]);

  const load = useCatch(async () => {
    if (!deviceId) return;
    const list = await (await fetchOrThrow(`api/commands?deviceId=${deviceId}`)).json();
    const auto = list.filter((c) => String(c.attributes?.autoDevice) === String(deviceId));
    setCurrent(auto);
    const lock = auto.find((c) => c.attributes?.quickActionKind === 'lock');
    const unlock = auto.find((c) => c.attributes?.quickActionKind === 'unlock');
    if (lock && unlock) {
      if (lock.type === 'engineStop') {
        setMethod('traccar');
      } else {
        setMethod(lock.attributes?.data === 'Relay,1#' ? 'relay' : 'custom');
        setLockData(lock.attributes?.data || '');
        setUnlockData(unlock.attributes?.data || '');
      }
    } else {
      setMethod('none');
    }
  });

  useEffect(() => {
    load();
  }, [deviceId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (onChange) onChange({ method, lockData, unlockData });
  }, [method, lockData, unlockData]); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = useCatch(async () => {
    await applyEngineLock({ deviceId, deviceName, method, lockData, unlockData, current });
    dispatch(messagesActions.push({ message: t('sharedSaved'), severity: 'success' }));
    load();
  });

  return (
    <>
      <TextField select value={method} onChange={(e) => setMethod(e.target.value)} label={t('lockMethod')}>
        <MenuItem value="none">{t('lockMethodNone')}</MenuItem>
        <MenuItem value="relay">{t('lockMethodRelay')}</MenuItem>
        <MenuItem value="traccar">{t('lockMethodTraccar')}</MenuItem>
        <MenuItem value="custom">{t('lockMethodCustom')}</MenuItem>
      </TextField>
      {method === 'custom' && (
        <>
          <TextField value={lockData} onChange={(e) => setLockData(e.target.value)} label={t('lockDataCut')} />
          <TextField value={unlockData} onChange={(e) => setUnlockData(e.target.value)} label={t('lockDataResume')} />
        </>
      )}
      <Typography variant="caption" color="textSecondary">
        {t('lockHint')}
      </Typography>
      {deviceId && (
        <Button variant="outlined" onClick={apply}>
          {t('lockApply')}
        </Button>
      )}
    </>
  );
};

export default EngineLockSetup;
