// Plantillas de mantenimiento por perfil de cliente.
// kinds: distance (cada X km, según la distancia total), hours (cada X horas de motor), date (fecha de vencimiento).
export const MAINTENANCE_TEMPLATES = {
  particular: [
    { key: 'aceite', label: 'Cambio de aceite de motor', kinds: ['distance'], defaultValue: 5000 },
    { key: 'revision', label: 'Renovación de Revisión Técnica', kinds: ['date'] },
    { key: 'permiso', label: 'Renovación de Permiso de Circulación y SOAP', kinds: ['date'] },
    { key: 'pastillas', label: 'Cambio de pastillas de freno', kinds: ['distance'], defaultValue: 30000 },
    { key: 'neumaticos', label: 'Rotación / Cambio de neumáticos', kinds: ['distance'], defaultValue: 10000 },
    { key: 'correas', label: 'Cambio de correas / Distribución', kinds: ['distance'], defaultValue: 60000 },
  ],
  empresa: [
    { key: 'preventivo', label: 'Pauta de mantenimiento preventivo general', kinds: ['distance', 'hours'], defaultValue: 10000 },
    { key: 'aceite', label: 'Cambio de aceite y filtros de maquinaria/camión', kinds: ['hours', 'distance'], defaultValue: 250 },
    { key: 'engrase', label: 'Engrase y lubricación de chasis/ejes', kinds: ['distance'], defaultValue: 10000 },
    { key: 'frenos', label: 'Revisión de sistema de frenos/balatas', kinds: ['distance'], defaultValue: 30000 },
    { key: 'neumaticos', label: 'Renovación de neumáticos de carga', kinds: ['distance'], defaultValue: 80000 },
    { key: 'refrigeracion', label: 'Mantenimiento de equipos de refrigeración de carga', kinds: ['hours'], defaultValue: 500 },
    { key: 'correas', label: 'Cambio de correas / Distribución', kinds: ['distance'], defaultValue: 60000 },
    { key: 'revision', label: 'Renovación de Revisión Técnica', kinds: ['date'] },
    { key: 'permiso', label: 'Renovación de Permiso de Circulación y SOAP', kinds: ['date'] },
    { key: 'seguros', label: 'Renovación de seguros de carga y flota', kinds: ['date'] },
    { key: 'extintores', label: 'Vencimiento de extintores', kinds: ['date'] },
  ],
};
