import { useSelector } from 'react-redux';

// Perfil del cliente: "empresa" si el administrador le habilitó el Dashboard
// (atributo ui.enableDashboard); en caso contrario "particular".
export default () =>
  useSelector((state) => {
    const user = state.session.user;
    if (!user || user.administrator) return 'admin';
    return user.attributes['ui.enableDashboard'] ? 'empresa' : 'particular';
  });
