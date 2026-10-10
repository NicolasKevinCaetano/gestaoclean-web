import { Box, Typography } from '@mui/material';

export default function NavCard() {
  return (
    <Box sx={{ mx: 2, my: 2, p: 2, borderRadius: 2, bgcolor: '#f1f7ff', border: '1px solid #dbeafe', minWidth: 0 }}>
      <Typography fontWeight={700} color="#00005c">Higienizei</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'normal', overflowWrap: 'anywhere', lineHeight: 1.5 }}>
        Gestão de higienização e impermeabilização
      </Typography>
    </Box>
  );
}
