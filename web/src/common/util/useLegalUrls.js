import { useSelector } from 'react-redux';

// Documentos legales. Si el administrador no puso direcciones propias en Configuración → Servidor,
// se usan los borradores que vienen con la web (carpeta public/legal).
const useLegalUrls = () => {
  const attributes = useSelector((state) => state.session.server?.attributes || {});
  return {
    termsUrl: attributes.termsUrl || 'legal/terminos.html',
    privacyUrl: attributes.privacyUrl || 'legal/privacidad.html',
    cookiesUrl: 'legal/cookies.html',
    licensesUrl: 'legal/licencias.html',
    termsRequired: Boolean(attributes.termsUrl),
    termsVersion: String(attributes.termsVersion || '1'),
  };
};

export default useLegalUrls;
