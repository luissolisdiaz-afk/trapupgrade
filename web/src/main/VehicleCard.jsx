import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import StatusCard from '../common/components/StatusCard';
import PersonalVehicleSheet from './PersonalVehicleSheet';
import useClientType from '../common/util/useClientType';

// En celular, los clientes particulares ven la tarjeta inferior simplificada.
// Administradores y clientes con atributo clientType = empresa conservan la tarjeta completa.
const VehicleCard = (props) => {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const clientType = useClientType();
  const personal = !desktop && clientType === 'particular';
  return personal ? <PersonalVehicleSheet {...props} /> : <StatusCard {...props} />;
};

export default VehicleCard;
