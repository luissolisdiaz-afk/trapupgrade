import { Navigate } from 'react-router-dom';
import useFeatures from '../common/util/useFeatures';

const CamerasGate = ({ children }) => {
  const features = useFeatures();
  if (features.disableCameras) {
    return <Navigate to="/" replace />;
  }
  return children;
};

export default CamerasGate;
