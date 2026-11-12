import { useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

const HANDLE = 52;

// Slider "desliza para confirmar": evita toques accidentales en acciones críticas.
const SwipeConfirm = ({ label, color = 'error', onConfirm, disabled }) => {
  const trackRef = useRef(null);
  const startX = useRef(null);
  const [offset, setOffset] = useState(0);

  const maxOffset = () => (trackRef.current ? trackRef.current.clientWidth - HANDLE - 8 : 0);

  const onDown = (event) => {
    if (disabled) return;
    startX.current = event.clientX - offset;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onMove = (event) => {
    if (startX.current === null) return;
    setOffset(Math.max(0, Math.min(maxOffset(), event.clientX - startX.current)));
  };
  const onUp = () => {
    if (startX.current === null) return;
    startX.current = null;
    if (offset >= maxOffset() * 0.9) {
      setOffset(0);
      onConfirm();
    } else {
      setOffset(0);
    }
  };

  return (
    <Box
      ref={trackRef}
      sx={{
        position: 'relative',
        height: HANDLE + 8,
        borderRadius: 8,
        bgcolor: 'action.hover',
        overflow: 'hidden',
        userSelect: 'none',
        touchAction: 'none',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Typography
        variant="body2"
        fontWeight={600}
        color="textSecondary"
        sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pl: 6 }}
      >
        {label}
      </Typography>
      <Box
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        sx={{
          position: 'absolute',
          top: 4,
          left: 4 + offset,
          width: HANDLE,
          height: HANDLE,
          borderRadius: '50%',
          bgcolor: `${color}.main`,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'grab',
          transition: startX.current === null ? 'left 0.2s' : 'none',
        }}
      >
        <ChevronRightIcon />
      </Box>
    </Box>
  );
};

export default SwipeConfirm;
