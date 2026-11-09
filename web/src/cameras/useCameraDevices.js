import { useSelector } from 'react-redux';

export const isCameraDevice = (device, position) =>
  Boolean(device?.attributes?.camera) || position?.protocol === 'jt808';

export default () => {
  const devices = useSelector((state) => state.devices.items);
  const positions = useSelector((state) => state.session.positions);
  return Object.values(devices)
    .map((device) => ({
      device,
      position: positions[device.id],
      camera: isCameraDevice(device, positions[device.id]),
    }))
    .sort((a, b) => Number(b.camera) - Number(a.camera) || a.device.name.localeCompare(b.device.name));
};
