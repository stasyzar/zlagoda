import { Alert, Box, Card, CardContent, CircularProgress, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getMyEmployeeProfile } from '../../api/employees';

export default function MyProfilePage() {
  const { data: me, isLoading, error } = useQuery({
    queryKey: ['my-employee-profile'],
    queryFn: getMyEmployeeProfile,
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !me) {
    return <Alert severity="error">Не вдалося завантажити профіль</Alert>;
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} mb={3}>
        Мій профіль
      </Typography>
      <Card>
        <CardContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <Box><Typography color="text.secondary">ID</Typography><Typography>{me.id_employee}</Typography></Box>
            <Box><Typography color="text.secondary">Посада</Typography><Typography>{me.empl_role === 'manager' ? 'Менеджер' : 'Касир'}</Typography></Box>
            <Box><Typography color="text.secondary">Прізвище</Typography><Typography>{me.empl_surname}</Typography></Box>
            <Box><Typography color="text.secondary">Ім'я</Typography><Typography>{me.empl_name}</Typography></Box>
            <Box><Typography color="text.secondary">По батькові</Typography><Typography>{me.empl_patronymic || '—'}</Typography></Box>
            <Box><Typography color="text.secondary">Телефон</Typography><Typography>{me.phone_number}</Typography></Box>
            <Box><Typography color="text.secondary">Зарплата</Typography><Typography>{me.salary} грн</Typography></Box>
            <Box><Typography color="text.secondary">Дата народження</Typography><Typography>{me.date_of_birth}</Typography></Box>
            <Box><Typography color="text.secondary">Дата початку роботи</Typography><Typography>{me.date_of_start}</Typography></Box>
            <Box><Typography color="text.secondary">Місто</Typography><Typography>{me.city}</Typography></Box>
            <Box><Typography color="text.secondary">Вулиця</Typography><Typography>{me.street}</Typography></Box>
            <Box><Typography color="text.secondary">Індекс</Typography><Typography>{me.zip_code}</Typography></Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
