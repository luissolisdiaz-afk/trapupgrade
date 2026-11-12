import { useId } from 'react';
import { SvgIcon } from '@mui/material';

// Engine with a padlock: closed when the engine is cut, open when it is free.
// Single color (currentColor); the padlock is separated from the engine by a transparent gap.
const LOCK_BODY = 'M20.5 25 H27.5 A2.5 2.5 0 0 1 30 27.5 V36.5 A2.5 2.5 0 0 1 27.5 39 H20.5 A2.5 2.5 0 0 1 18 36.5 V27.5 A2.5 2.5 0 0 1 20.5 25 Z';
const KEYHOLE = 'M24 28.1 A2.2 2.2 0 0 1 25.1 32.2 L25.9 36.2 H22.1 L22.9 32.2 A2.2 2.2 0 0 1 24 28.1 Z';
const SHACKLE_CLOSED = 'M21 25 V21 A3 3 0 0 1 27 21 V25';
const SHACKLE_OPEN = 'M21 25 V19 A3 3 0 0 1 27 19 V21.4';

const EngineLockIcon = ({ locked, ...props }) => {
  const maskId = `engine-lock-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const shackle = locked ? SHACKLE_CLOSED : SHACKLE_OPEN;
  return (
    <SvgIcon viewBox="0 0 48 48" {...props}>
      <defs>
        <mask id={maskId}>
          <rect width="48" height="48" fill="#fff" />
          <path d={LOCK_BODY} fill="#000" stroke="#000" strokeWidth="3.6" strokeLinejoin="round" />
          <path d={shackle} fill="none" stroke="#000" strokeWidth="6.8" strokeLinecap="round" />
        </mask>
      </defs>
      <g mask={`url(#${maskId})`}>
          <rect x="3" y="21" width="4" height="12" rx="1.6" />
          <rect x="6" y="24" width="5" height="6" />
          <path d="M10 18 H16 L19.6 13 H28.4 L32 18 H38 V21.5 H40.5 V31 H38 V36 H10 Z" />
          <rect x="40" y="20.5" width="5" height="13" rx="1.6" />
          <rect x="19" y="5.5" width="10" height="4" rx="1.6" />
          <rect x="22.5" y="9" width="3" height="5" />
      </g>
      <path d={`${LOCK_BODY} ${KEYHOLE}`} fillRule="evenodd" />
      <path d={shackle} fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
    </SvgIcon>
  );
};

export default EngineLockIcon;
