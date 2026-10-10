
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Stack,
  TextField,
  Button,
  Typography,
  Alert
} from '@mui/material';
import { login } from 'services/api';

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, senha);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        bgcolor: '#eef4ff',
        p: 2,
        backgroundImage: 'linear-gradient(145deg,#f5f9ff 45%,#dceaff)'
      }}
    >
      <Paper
        sx={{
          p: { xs: 3, sm: 5 },
          width: '100%',
          maxWidth: 460,
          borderRadius: 3
        }}
        elevation={5}
      >
        <Stack spacing={3} component="form" onSubmit={submit}>
          <Box
            component="img"
            src={`${import.meta.env.BASE_URL}branding/higienizei-logo.png`}
            alt="Higienizei"
            sx={{
              width: '100%',
              maxHeight: 180,
              objectFit: 'contain'
            }}
          />

          <Box>
            <Typography variant="h4" color="#00005c">
              Bem-vindo ao GestãoClean
            </Typography>
            <Typography color="text.secondary">
              Entre com seu usuário para acessar a gestão da Higienizei.
            </Typography>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="E-mail"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <TextField
            label="Senha"
            type="password"
            required
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading}
            sx={{
              bgcolor: '#00005c',
              py: 1.4,
              '&:hover': { bgcolor: '#0788f9' }
            }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>

          <Typography
            textAlign="center"
            variant="caption"
            color="text.secondary"
          >
            Higienizei • Tecnologia GestãoClean
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}

