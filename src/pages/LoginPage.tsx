import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Snackbar,
  InputAdornment,
} from '@mui/material';
import { ErrorOutline as ErrorOutlineIcon, Person as PersonIcon, Lock as LockIcon } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { loginRequest } from '../api/auth';
import { getApiErrorMessage } from '../utils/apiError';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const clearError = () => setError('');

  const handleSubmit = async () => {
    clearError();
    setLoading(true);
    try {
      const user = await loginRequest(id, password);
      login(user);
      navigate(user.role === 'Manager' ? '/manager/employees' : '/cashier/products');
    } catch (e) {
      const msg = getApiErrorMessage(e, 'Невірний ID або пароль');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f5f5f5',
      }}
    >
      <Snackbar
        open={!!error}
        autoHideDuration={8000}
        onClose={clearError}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ mt: 2 }}
      >
        <Alert
          severity="error"
          variant="filled"
          icon={<ErrorOutlineIcon />}
          onClose={clearError}
          elevation={6}
          sx={{
            alignItems: 'center',
            minWidth: { xs: '90vw', sm: 380 },
            borderRadius: 2,
            '& .MuiAlert-message': { fontWeight: 500 },
          }}
        >
          {error}
        </Alert>
      </Snackbar>

      <Paper sx={{ p: 4, width: 360, maxWidth: '92vw', borderRadius: 3 }} elevation={3}>
        <Typography variant="h5" fontWeight={600} mb={1}>
          ZLAGODA
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Увійдіть у свій акаунт
        </Typography>

        <TextField
          label="ID працівника"
          fullWidth
          value={id}
          onChange={(e) => {
            setId(e.target.value);
            if (error) clearError();
          }}
          error={!!error}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PersonIcon color={error ? 'error' : 'action'} fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />
        <TextField
          label="Пароль"
          type="password"
          fullWidth
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (error) clearError();
          }}
          error={!!error}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockIcon color={error ? 'error' : 'action'} fontSize="small" />
              </InputAdornment>
            ),
          }}
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
