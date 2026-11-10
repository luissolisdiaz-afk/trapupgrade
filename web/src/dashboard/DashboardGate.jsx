import { Navigate } from 'react-router-dom';
import useFeatures from '../common/util/useFeatures';

const DashboardGate = ({ children }) => {
  const features = useFeatures();
  if (!features.dashboardEnabled) {
    return <Navigate to="/" replace />;
  }
  return children;
};

export default DashboardGate;
