// Catálogo de comandos por perfil de cliente: [etiqueta, tipo de comando de Traccar].
// El corte y habilitación de motor no están aquí: se configuran por equipo
// (Dispositivos > editar > Método de corte de motor).
export const COMMAND_CATALOG = {
  particular: [
    ['Armar alarma', 'alarmArm'],
    ['Desarmar alarma', 'alarmDisarm'],
    ['Enviar posición una vez', 'positionSingle'],
    ['Configurar alarma de vibración', 'alarmVibration'],
    ['Configurar alarma de desmontaje', 'alarmRemove'],
    ['Configurar alarma de batería', 'alarmBattery'],
    ['Configurar alarma de geocerca', 'alarmGeofence'],
    ['Establecer el número SOS', 'sosNumber'],
    ['Configurar alarma SOS', 'alarmSos'],
    ['Solicitar foto', 'requestPhoto'],
    ['Iniciar video', 'videoStart'],
    ['Detener video', 'videoStop'],
  ],
  empresa: [
    ['Enviar posiciones periódicamente', 'positionPeriodic'],
    ['Establecer odómetro', 'setOdometer'],
    ['Configurar alarma de geocerca', 'alarmGeofence'],
    ['Control de salidas', 'outputControl'],
    ['Establecer límite de velocidad', 'setSpeedLimit'],
    ['Configurar alarma de velocidad', 'alarmSpeed'],
    ['Iniciar video', 'videoStart'],
    ['Detener video', 'videoStop'],
    ['Solicitar foto', 'requestPhoto'],
    ['Establecer el número SOS', 'sosNumber'],
    ['Configurar alarma SOS', 'alarmSos'],
    ['Monitoreo de voz', 'voiceMonitoring'],
    ['Mensaje de voz', 'voiceMessage'],
    ['Mensaje', 'message'],
    ['Obtener estado del dispositivo', 'getDeviceStatus'],
    ['Obtener estado del módem', 'getModemStatus'],
    ['Reiniciar dispositivo', 'rebootDevice'],
    ['Actualizar firmware', 'firmwareUpdate'],
  ],
};
