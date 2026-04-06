import { useState } from 'react';
import {
  Box, Typography, TextField, InputAdornment, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, IconButton, CircularProgress
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { Search as SearchIcon, Edit as EditIcon, Add as AddIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { getCustomers, createCustomer, updateCustomer } from '../../api/customers';
import { type CustomerCard } from '../../types';

export default function CashierCustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<CustomerCard | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CustomerCard>();

  const { data: customers = [], isLoading, error } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
  });

  const createMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); handleClose(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CustomerCard> }) => updateCustomer(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); handleClose(); },
  });

  const handleOpen = (customer?: CustomerCard) => {
    if (customer) { setSelected(customer); reset(customer); }
    else { setSelected(null); reset({}); }
    setDialogOpen(true);
  };

  const handleClose = () => { setDialogOpen(false); setSelected(null); reset({}); };

  const onSubmit = (data: CustomerCard) => {
    const payload = { ...data, percent: Number(data.percent) };
    if (selected) updateMutation.mutate({ id: selected.card_number, data: payload });
    else createMutation.mutate(payload);
  };

  const filtered = customers.filter((c) =>
    c.cust_surname.toLowerCase().includes(search.toLowerCase())
  );

  const columns: GridColDef[] = [
    { field: 'card_number', headerName: 'Номер карти', width: 130 },
    { field: 'cust_surname', headerName: 'Прізвище', flex: 1 },
    { field: 'cust_name', headerName: 'Ім\'я', flex: 1 },
    { field: 'phone_number', headerName: 'Телефон', width: 140 },
    { field: 'percent', headerName: 'Знижка %', width: 100,
      renderCell: (params) => `${params.value}%` },
    {
      field: 'actions', headerName: 'Дії', width: 70, sortable: false,
      renderCell: (params) => (
        <IconButton size="small" onClick={() => handleOpen(params.row)}>
          <EditIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  if (error) return <Alert severity="error">Помилка завантаження</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>Карти клієнтів</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
          Додати
        </Button>
      </Box>

      <TextField
        placeholder="Пошук за прізвищем..."
        value={search} onChange={(e) => setSearch(e.target.value)}
        size="small" sx={{ mb: 2, width: 300 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
      />

      <Box sx={{ bgcolor: 'white', borderRadius: 2, overflow: 'hidden' }}>
        <DataGrid
          rows={filtered} columns={columns}
          getRowId={(row) => row.card_number}
          loading={isLoading} autoHeight
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableRowSelectionOnClick
        />
      </Box>

      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{selected ? 'Редагувати клієнта' : 'Новий клієнт'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Номер карти" fullWidth size="small"
              disabled={!!selected}
              {...register('card_number', { required: "Обов'язкове поле" })}
              error={!!errors.card_number}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Прізвище" fullWidth size="small"
                {...register('cust_surname', { required: "Обов'язкове поле" })}
                error={!!errors.cust_surname}
              />
              <TextField
                label="Ім'я" fullWidth size="small"
                {...register('cust_name', { required: "Обов'язкове поле" })}
                error={!!errors.cust_name}
              />
            </Box>
            <TextField label="По батькові" fullWidth size="small" {...register('cust_patronymic')} />
            <TextField
              label="Телефон" fullWidth size="small"
              {...register('phone_number', { required: "Обов'язкове поле", maxLength: 13 })}
              error={!!errors.phone_number}
            />
            <TextField
              label="Знижка %" fullWidth size="small" type="number"
              {...register('percent', { required: "Обов'язкове поле", min: 0, max: 100 })}
              error={!!errors.percent}
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
          <Button variant="contained" onClick={handleSubmit(onSubmit)}
            disabled={createMutation.isPending || updateMutation.isPending}>
            {createMutation.isPending || updateMutation.isPending
              ? <CircularProgress size={20} />
              : selected ? 'Зберегти' : 'Додати'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}