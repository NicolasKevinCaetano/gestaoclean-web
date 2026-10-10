import useMediaQuery from '@mui/material/useMediaQuery';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Profile from './Profile';
import MobileSection from './MobileSection';
export default function HeaderContent(){const mobile=useMediaQuery(theme=>theme.breakpoints.down('lg'));return <><Box sx={{flexGrow:1}}><Typography fontWeight={700} color='#00005c'>Higienizei <Typography component='span' variant='caption' color='text.secondary'> | GestãoClean</Typography></Typography></Box>{mobile?<MobileSection/>:<Profile/>}</>;}
