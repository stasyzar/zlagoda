import { useState } from 'react';
import {
  Box, Button, Typography, TextField, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Chip, Alert, CircularProgress
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee } from '../../api/employees';
import { type Employee } from '../../types';

type EmployeeForm = Omit<Employee, 'id_employee'>;

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Employee | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EmployeeForm>();

  // Завантаження даних
  const { data: employees = [], isLoading, error } = useQuery({
    queryKey: ['employees'],
    queryFn: getEmployees,
  });

  // Створення
  const createMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      handleClose();
    },
  });

  // Оновлення
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Employee> }) =>
      updateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      handleClose();
    },
  });

  // Видалення
  const deleteMutation = useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setDeleteDialogOpen(false);
      setSelected(null);
    },
  });

  const handleOpen = (employee?: Employee) => {
    if (employee) {
      setSelected(employee);
      reset(employee);
    } else {
      setSelected(null);
      reset({});
    }
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setSelected(null);
    reset({});
  };

  const onSubmit = (data: EmployeeForm) => {
    if (selected) {
      updateMutation.mutate({ id: selected.id_employee, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDeleteClick = (employee: Employee) => {
    setSelected(employee);
    setDeleteDialogOpen(true);
  };

  // Фільтрація за прізвищем
  const filtered = employees.filter((e) =>
    e.empl_surname.toLowerCase().includes(search.toLowerCase())
  );

  const columns: GridColDef[] = [
    { field: 'id_employee', headerName: 'ID', width: 100 },
    { field: 'empl_surname', headerName: 'Прізвище', width: 130 },
    { field: 'empl_name', headerName: 'Ім\'я', width: 120 },
    { field: 'empl_patronymic', headerName: 'По батькові', width: 130 },
    {
      field: 'empl_role', headerName: 'Посада', width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value === 'Manager' ? 'Менеджер' : 'Касир'}
          color={params.value === 'Manager' ? 'primary' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'salary', headerName: 'Зарплата', width: 120,
      renderCell: (params) => `${params.value} грн`,
    },
    { field: 'phone_number', headerName: 'Телефон', width: 140 },
    { field: 'city', headerName: 'Місто', width: 110 },
    {
      field: 'actions', headerName: 'Дії', width: 100, sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton size="small" onClick={() => handleOpen(params.row)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" color="error" onClick={() => handleDeleteClick(params.row)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  if (error) return <Alert severity="error">Помилка завантаження даних</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>Працівники</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
          Додати
        </Button>
      </Box>

      <TextField
        placeholder="Пошук за прізвищем..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        size="small"
        sx={{ mb: 2, width: 300 }}
        InputProps={{
          startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>
        }}
      />

      <Box sx={{ bgcolor: 'white', borderRadius: 2, overflow: 'hidden' }}>
        <DataGrid
          rows={filtered}
          columns={columns}
          getRowId={(row) => row.id_employee}
          loading={isLoading}
          autoHeight
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableRowSelectionOnClick
        />
      </Box>

      {/* Діалог додавання/редагування */}
      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{selected ? 'Редагувати працівника' : 'Новий працівник'}</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Прізвище" fullWidth size="small"
                {...register('empl_surname', { required: "Обов'язкове поле" })}
                error={!!errors.empl_surname}
                helperText={errors.empl_surname?.message}
              />
              <TextField
                label="Ім'я" fullWidth size="small"
                {...register('empl_name', { required: "Обов'язкове поле" })}
                error={!!errors.empl_name}
                helperText={errors.empl_name?.message}
              />
            </Box>
            <TextField
              label="По батькові" fullWidth size="small"
              {...register('empl_patronymic')}
            />
            <TextField
              label="Посада" fullWidth size="small" select
              defaultValue="Cashier"
              {...register('empl_role', { required: "Обов'язкове поле" })}
              SelectProps={{ native: true }}
            >
              <option value="Manager">Менеджер</option>
              <option value="Cashier">Касир</option>
            </TextField>
            <TextField
              label="Зарплата" fullWidth size="small" type="number"
              {...register('salary', { required: "Обов'язкове поле", min: 0 })}
              error={!!errors.salary}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Дата народження" fullWidth size="small" type="date"
                InputLabelProps={{ shrink: true }}
                {...register('date_of_birth', { required: "Обов'язкове поле" })}
              />
              <TextField
                label="Дата початку роботи" fullWidth size="small" type="date"
                InputLabelProps={{ shrink: true }}
                {...register('date_of_start', { required: "Обов'язкове поле" })}
              />
            </Box>
            <TextField
              label="Телефон" fullWidth size="small"
              {...register('phone_number', { required: "Обов'язкове поле", maxLength: 13 })}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Місто" fullWidth size="small" {...register('city')} />
              <TextField label="Вулиця" fullWidth size="small" {...register('street')} />
              <TextField label="Індекс" fullWidth size="small" {...register('zip_code')} />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Скасувати</Button>
          <Button
            variant="contained"
            onClick={handleSubmit(onSubmit)}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending
              ? <CircularProgress size={20} />
              : selected ? 'Зберегти' : 'Додати'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Діалог підтвердження видалення */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Видалити працівника?</DialogTitle>
        <DialogContent>
          <Typography>
            Ви впевнені що хочете видалити{' '}
            <strong>{selected?.empl_surname} {selected?.empl_name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Скасувати</Button>
          <Button
            color="error" variant="contained"
            onClick={() => selected && deleteMutation.mutate(selected.id_employee)}
            disabled={deleteMutation.isPending}
          >
            Видалити
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}