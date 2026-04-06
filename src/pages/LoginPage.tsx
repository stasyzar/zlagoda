import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, TextField, Typography, Paper, Alert, CircularProgress
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
// import { loginRequest } from '../api/auth';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
//   const [error, setError] = useState('');
//   const [loading, setLoading] = useState(false);
  const [error] = useState('');
  const [loading] = useState(false);

  const handleSubmit = async () => {
  login({ id_employee: 'M001', role: 'Manager', token: 'mock-token' });
  navigate('/manager/employees');
};

//   const handleSubmit = async () => {
//     setError('');
//     setLoading(true);
//     try {
//       const user = await loginRequest(id, password);
//       login(user);
//       navigate(user.role === 'Manager' ? '/manager/employees' : '/cashier/products');
//     } catch {
//       setError('Невірний ID або пароль');
//     } finally {
//       setLoading(false);
//     }
//   };

  return (
    <Box sx={{
      height: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      bgcolor: '#f5f5f5'
    }}>
      <Paper sx={{ p: 4, width: 360, borderRadius: 3 }} elevation={3}>
        <Typography variant="h5" fontWeight={600} mb={1}>
          ZLAGODA
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Увійдіть у свій акаунт
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TextField
          label="ID працівника"
          fullWidth
          value={id}
          onChange={(e) => setId(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          label="Пароль"
          type="password"
          fullWidth
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          sx={{ mb: 3 }}
        />

        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={handleSubmit}
          disabled={loading || !id || !password}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Увійти'}
        </Button>
      </Paper>
    </Box>
  );
}