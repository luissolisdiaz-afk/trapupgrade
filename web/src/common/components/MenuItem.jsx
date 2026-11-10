import { makeStyles } from 'tss-react/mui';
import { ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { Link } from 'react-router-dom';

const useStyles = makeStyles()(() => ({
  menuItemText: {
    whiteSpace: 'nowrap',
  },
}));

const MenuItem = ({ title, link, icon, selected, nested }) => {
  const { classes } = useStyles();
  return (
    <ListItemButton
      key={link}
      component={Link}
      to={link}
      selected={selected}
      sx={nested ? { pl: 9 } : undefined}
    >
      {icon && <ListItemIcon>{icon}</ListItemIcon>}
      <ListItemText primary={title} className={classes.menuItemText} />
    </ListItemButton>
  );
};

export default MenuItem;
