import { useState } from 'react';
import {
  Box, Button, Typography, TextField, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Alert, CircularProgress, MenuItem
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
import { getCustomerCards, createCustomerCard, updateCustomerCard, deleteCustomerCard } from '../../api/customerCards';
import { type CustomerCard } from '../../types'; // Заміни на правильний шлях до типів

export default function CustomerCardsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [percentFilter, setPercentFilter] = useState<number | ''>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState<CustomerCard | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CustomerCard>();

  const { data: cards = [], isLoading, error } = useQuery({
    queryKey: ['customer-cards'],
    queryFn: getCustomerCards,
  });

  const createMutation = useMutation({
    mutationFn: createCustomerCard,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customer-cards'] }); handleClose(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ cardNumber, data }: { cardNumber: string; data: Partial<CustomerCard> }) => updateCustomerCard(cardNumber, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customer-cards'] }); handleClose(); },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCustomerCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-cards'] });
      setDeleteDialogOpen(false);
      setSelected(null);
    },
  });

  const handleOpen = (card?: CustomerCard) => {
    if (card) { setSelected(card); reset(card); }
    else { setSelected(null); reset({}); }
    setDialogOpen(true);
  };

  const handleClose = () => { setDialogOpen(false); setSelected(null); reset({}); };

  const onSubmit = (data: CustomerCard) => {
    // Перетворення відсотка в число
    const payload = { ...data, percent: Number(data.percent) };
    if (selected) updateMutation.mutate({ cardNumber: selected.card_number, data: payload });
    else createMutation.mutate(payload);
  };

  // Фільтрація за прізвищем та відсотком
  const filtered = cards
    .filter((c) => c.cust_surname.toLowerCase().includes(search.toLowerCase()))
    .filter((c) => percentFilter === '' || c.percent === percentFilter);

  const columns: GridColDef[] = [
    { field: 'card_number', headerName: 'Номер карти', width: 130 },
    { field: 'cust_surname', headerName: 'Прізвище', width: 130 },
    { field: 'cust_name', headerName: 'Ім\'я', width: 120 },
    { field: 'cust_patronymic', headerName: 'По батькові', width: 130 },
    { field: 'percent', headerName: 'Знижка (%)', width: 100 },
    { field: 'phone_number', headerName: 'Телефон', width: 140 },
    { field: 'city', headerName: 'Місто', width: 110 },
    {
      field: 'actions', headerName: 'Дії', width: 100, sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton size="small" onClick={() => handleOpen(params.row)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" color="error" onClick={() => { setSelected(params.row); setDeleteDialogOpen(true); }}>
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
        <Typography variant="h5" fontWeight={600}>Карти клієнтів</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
          Додати
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          placeholder="Пошук за прізвищем..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ width: 300 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>
          }}
        />
        <TextField
          select size="small" sx={{ width: 200 }}
          value={percentFilter}
          onChange={(e) => setPercentFilter(e.target.value === '' ? '' : Number(e.target.value))}
          label="Фільтр за знижкою"
        >
          <MenuItem value="">Всі відсотки</MenuItem>
          {[0, 5, 10, 15, 20].map((p) => (
            <MenuItem key={p} value={p}>{p}%</MenuItem>
          ))}
        </TextField>
      </Box>

      <Box sx={{ bgcolor: 'white', borderRadius: 2, overflow: 'hidden' }}>
        <DataGrid
          rows={filtered}
          columns={columns}
          getRowId={(row) => row.card_number}
          loading={isLoading}
          autoHeight
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableRowSelectionOnClick
        />
      </Box>

      {/* Діалог додавання/редагування */}
      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{selected ? 'Редагувати карту' : 'Нова карта клієнта'}</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Номер карти" fullWidth size="small"
              disabled={!!selected} // Номер карти не можна змінювати після створення
              {...register('card_number', { required: "Обов'язкове поле", maxLength: 13 })}
              error={!!errors.card_number}
              helperText={errors.card_number?.message}
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
              label="Відсоток знижки" fullWidth size="small" type="number"
              {...register('percent', { required: "Обов'язкове поле", min: 0, max: 100 })}
              error={!!errors.percent}
            />
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
        <DialogTitle>Видалити карту клієнта?</DialogTitle>
        <DialogContent>
          <Typography>
            Ви впевнені, що хочете видалити карту <strong>{selected?.card_number}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Скасувати</Button>
          <Button
            color="error" variant="contained"
            onClick={() => selected && deleteMutation.mutate(selected.card_number)}
            disabled={deleteMutation.isPending}
          >
            Видалити
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}