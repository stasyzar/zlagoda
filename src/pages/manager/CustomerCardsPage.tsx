import { useState } from 'react';
import {
  Box, Button, Typography, TextField, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Alert, CircularProgress, MenuItem, Tooltip,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Print as PrintIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { AxiosError } from 'axios';
import {
  getCustomersSortedBySurname,
  getCustomersSortedByPercent,
  searchCustomersBySurname,
  getCustomersByPercentSortedBySurname,
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../../api/customers';
import { type CustomerCard } from '../../types';
import { openReportPreview } from '../../utils/reportPrint';
import { getApiErrorMessage } from '../../utils/apiError';

const PHONE_PATTERN = /^\+?[0-9]{1,12}$/;
const PHONE_HINT = 'Формат: +XXXXXXXXXXXX (до 12 цифр)';

function getApiError(err: unknown): string {
  if (err instanceof AxiosError) {
    const d = err.response?.data;
    if (d?.validationErrors) {
      return Object.values(d.validationErrors as Record<string, string>).join('; ');
    }
    return d?.message || 'Помилка сервера';
  }
  return 'Невідома помилка';
}

export default function CustomerCardsPage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'all-surname' | 'all-percent' | 'search-surname' | 'by-percent'>('all-surname');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSurname, setAppliedSurname] = useState('');
  const [percentFilter, setPercentFilter] = useState<number | ''>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState<CustomerCard | null>(null);
  const [apiError, setApiError] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CustomerCard>();

  const { data: cards = [], isLoading, error } = useQuery({
    queryKey: ['customer-cards-page', viewMode, appliedSurname, percentFilter],
    queryFn: async () => {
      if (viewMode === 'all-percent') return getCustomersSortedByPercent();
      if (viewMode === 'search-surname') return searchCustomersBySurname(appliedSurname);
      if (viewMode === 'by-percent') return getCustomersByPercentSortedBySurname(Number(percentFilter));
      return getCustomersSortedBySurname();
    },
    enabled:
      viewMode === 'all-surname' ||
      viewMode === 'all-percent' ||
      (viewMode === 'search-surname' && Boolean(appliedSurname.trim())) ||
      (viewMode === 'by-percent' && percentFilter !== ''),
  });

  const createMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customer-cards'] }); handleClose(); },
    onError: (err) => setApiError(getApiError(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ cardNumber, data }: { cardNumber: string; data: Partial<CustomerCard> }) => updateCustomer(cardNumber, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customer-cards'] }); handleClose(); },
    onError: (err) => setApiError(getApiError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-cards'] });
      setDeleteDialogOpen(false);
      setSelected(null);
    },
  });

  const handleOpen = (card?: CustomerCard) => {
    setApiError('');
    if (card) { setSelected(card); reset(card); }
    else { setSelected(null); reset({}); }
    setDialogOpen(true);
  };

  const handleClose = () => { setDialogOpen(false); setSelected(null); setApiError(''); reset({}); };

  const onSubmit = (data: CustomerCard) => {
    setApiError('');
    const payload = { ...data, percent: Number(data.percent) };
    if (selected) updateMutation.mutate({ cardNumber: selected.card_number, data: payload });
    else createMutation.mutate(payload);
  };

  const handlePrintReport = () => {
    getCustomers().then((reportCards) => {
      openReportPreview(
        'Звіт: Карти клієнтів',
        [
          { header: 'Номер карти', getValue: (c: CustomerCard) => c.card_number },
          { header: 'Прізвище', getValue: (c: CustomerCard) => c.cust_surname },
          { header: 'Імʼя', getValue: (c: CustomerCard) => c.cust_name },
          { header: 'Телефон', getValue: (c: CustomerCard) => c.phone_number },
          { header: 'Знижка, %', getValue: (c: CustomerCard) => c.percent },
          { header: 'Адреса', getValue: (c: CustomerCard) => `${c.city ?? ''} ${c.street ?? ''} ${c.zip_code ?? ''}`.trim() },
        ],
        reportCards,
        'Усі постійні клієнти, відсортовані за прізвищем',
      );
    }).catch(() => setApiError('Не вдалося сформувати звіт по картах клієнтів.'));
  };

  const applyFilters = () => {
    if (viewMode === 'search-surname' && !searchInput.trim()) {
      setApiError('Введи прізвище для пошуку.');
      return;
    }
    if (viewMode === 'by-percent' && percentFilter === '') {
      setApiError('Обери відсоток для цього режиму.');
      return;
    }
    setApiError('');
    setAppliedSurname(searchInput.trim());
  };

  const columns: GridColDef[] = [
    { field: 'card_number', headerName: 'Номер карти', width: 130, sortable: false, filterable: false },
    { field: 'cust_surname', headerName: 'Прізвище', width: 130, sortable: false, filterable: false },
    { field: 'cust_name', headerName: 'Ім\'я', width: 120, sortable: false, filterable: false },
    { field: 'cust_patronymic', headerName: 'По батькові', width: 130, sortable: false, filterable: false },
    { field: 'percent', headerName: 'Знижка (%)', width: 100, sortable: false, filterable: false },
    {
      field: 'check_count', headerName: 'Чеків', width: 80, align: 'right', headerAlign: 'right', sortable: false, filterable: false,
      valueGetter: (_value, row) => row.check_count ?? 0,
    },
    { field: 'phone_number', headerName: 'Телефон', width: 140, sortable: false, filterable: false },
    { field: 'city', headerName: 'Місто', width: 110, sortable: false, filterable: false },
    {
      field: 'actions', headerName: 'Дії', width: 100, sortable: false, filterable: false,
      renderCell: (params) => (
        <Box>
          <IconButton size="small" onClick={() => handleOpen(params.row)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <Tooltip
            title={
              (params.row.check_count ?? 0) > 0
                ? 'Неможливо видалити: є чеки з цією карткою'
                : 'Видалити карту'
            }
          >
            <span>
              <IconButton
                size="small"
                color="error"
                disabled={(params.row.check_count ?? 0) > 0}
                onClick={() => {
                  deleteMutation.reset();
                  setSelected(params.row);
                  setDeleteDialogOpen(true);
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      ),
    },
  ];

  if (error) return <Alert severity="error">Помилка завантаження даних</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>Карти клієнтів</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrintReport}>
            Звіт
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
            Додати
          </Button>
        </Box>
      </Box>
      {apiError ? <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert> : null}

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        <Button variant={viewMode === 'all-surname' ? 'contained' : 'outlined'} onClick={() => { setViewMode('all-surname'); setApiError(''); }}>
          Усі клієнти (за прізвищем)
        </Button>
        <Button variant={viewMode === 'all-percent' ? 'contained' : 'outlined'} onClick={() => { setViewMode('all-percent'); setApiError(''); }}>
          Усі клієнти (за відсотком)
        </Button>
        <Button variant={viewMode === 'search-surname' ? 'contained' : 'outlined'} onClick={() => { setViewMode('search-surname'); setApiError(''); }}>
          Пошук за прізвищем
        </Button>
        <Button variant={viewMode === 'by-percent' ? 'contained' : 'outlined'} onClick={() => { setViewMode('by-percent'); setApiError(''); }}>
          Клієнти з певним відсотком
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        {viewMode === 'search-surname' ? (
          <TextField
            placeholder="Пошук за прізвищем..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            size="small"
            sx={{ width: 300 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>
            }}
          />
        ) : null}
        {viewMode === 'by-percent' ? (
          <TextField
            select size="small" sx={{ width: 220 }}
            value={percentFilter}
            onChange={(e) => setPercentFilter(e.target.value === '' ? '' : Number(e.target.value))}
            label="Відсоток"
          >
            <MenuItem value="">—</MenuItem>
            {[0, 5, 10, 15, 20].map((p) => (
              <MenuItem key={p} value={p}>{p}%</MenuItem>
            ))}
          </TextField>
        ) : null}
        {(viewMode === 'search-surname' || viewMode === 'by-percent') ? (
          <Button variant="contained" onClick={applyFilters}>Застосувати</Button>
        ) : null}
      </Box>

      <Box sx={{ bgcolor: 'white', borderRadius: 2, overflow: 'hidden' }}>
        <DataGrid
          rows={cards}
          columns={columns}
          getRowId={(row) => row.card_number}
          loading={isLoading}
          autoHeight
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableColumnFilter
          disableColumnMenu
          disableColumnSorting
          disableRowSelectionOnClick
        />
      </Box>

      {/* Діалог додавання/редагування */}
      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{selected ? 'Редагувати карту' : 'Нова карта клієнта'}</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {apiError && <Alert severity="error">{apiError}</Alert>}
            <TextField
              label="Номер карти" fullWidth size="small"
              disabled={!!selected}
              {...register('card_number', { required: "Обов'язкове поле", maxLength: { value: 13, message: 'Максимум 13 символів' } })}
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
              placeholder="+380XXXXXXXXX"
              {...register('phone_number', {
                required: "Обов'язкове поле",
                pattern: { value: PHONE_PATTERN, message: PHONE_HINT },
              })}
              error={!!errors.phone_number}
              helperText={errors.phone_number?.message ?? PHONE_HINT}
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
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          deleteMutation.reset();
          setDeleteDialogOpen(false);
        }}
      >
        <DialogTitle>Видалити карту клієнта?</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Якщо вже є чеки з цією картою, видалити її неможливо. Спочатку змініть або видаліть відповідні чеки.
          </Alert>
          <Typography gutterBottom>
            Видалити карту <strong>{selected?.card_number}</strong>?
          </Typography>
          {deleteMutation.isError ? (
            <Alert severity="error">{getApiErrorMessage(deleteMutation.error)}</Alert>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              deleteMutation.reset();
              setDeleteDialogOpen(false);
            }}
          >
            Скасувати
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => selected && deleteMutation.mutate(selected.card_number)}
            disabled={deleteMutation.isPending || (selected?.check_count ?? 0) > 0}
          >
            Видалити
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}