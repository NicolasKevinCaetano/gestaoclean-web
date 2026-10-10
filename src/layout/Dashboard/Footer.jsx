import { Box, Typography } from '@mui/material';

export default function Footer() {
  return (
    <Box sx={{ p: '24px 16px 0', mt: 'auto', display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', justifyContent: 'space-between' }}>
      <Typography variant="caption">© {new Date().getFullYear()} Higienizei</Typography>
      <Typography variant="caption" color="text.secondary">Tecnologia GestãoClean</Typography>
    </Box>
  );
}
