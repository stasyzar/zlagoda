import { useState } from 'react';
import {
  Box, Button, Typography, TextField, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Chip, Alert, CircularProgress, Tooltip, Table, TableBody, TableCell, TableHead, TableRow,
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
  getEmployeesSortedBySurname,
  getCashiersSortedBySurname,
  searchEmployeesBySurname,
  searchEmployeeContactsBySurname,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  type EmployeeCreatePayload,
} from '../../api/employees';
import { type Employee } from '../../types';
import { openReportPreview } from '../../utils/reportPrint';
import { getApiErrorMessage } from '../../utils/apiError';
import { MAX_NAME_LEN, PHONE_HINT, PHONE_PATTERN } from '../../utils/validation';

const MAX_EMPLOYEE_ID_LEN = 10;

type EmployeeForm = Omit<Employee, 'id_employee'> & {
  id_employee?: string;
  password?: string;
};

function maxBirthDateForAge18(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().slice(0, 10);
}

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

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'all' | 'cashiers' | 'search' | 'contacts'>('all');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSurname, setAppliedSurname] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [apiError, setApiError] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EmployeeForm>();

  const { data: employees = [], isLoading, error } = useQuery({
    queryKey: ['employees-page', viewMode, appliedSurname],
    queryFn: async () => {
      if (viewMode === 'cashiers') return getCashiersSortedBySurname();
      if (viewMode === 'search') {
        return searchEmployeesBySurname(appliedSurname);
      }
      return getEmployeesSortedBySurname();
    },
    enabled: viewMode !== 'contacts' && (viewMode !== 'search' || Boolean(appliedSurname.trim())),
  });

  const { data: contacts = [], isLoading: loadingContacts, error: contactsError } = useQuery({
    queryKey: ['employee-contacts', appliedSurname],
    queryFn: () => searchEmployeeContactsBySurname(appliedSurname),
    enabled: viewMode === 'contacts' && Boolean(appliedSurname.trim()),
  });

  const createMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      handleClose();
    },
    onError: (err) => setApiError(getApiError(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Employee> }) =>
      updateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      handleClose();
    },
    onError: (err) => setApiError(getApiError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setDeleteDialogOpen(false);
      setSelected(null);
    },
  });

  const handleOpen = (employee?: Employee) => {
    setApiError('');
    if (employee) {
      setSelected(employee);
      reset({ ...employee });
    } else {
      setSelected(null);
      reset({ empl_role: 'cashier' });
    }
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setSelected(null);
    setApiError('');
    reset({});
  };

  const onSubmit = (data: EmployeeForm) => {
    setApiError('');
    if (selected) {
      const { id_employee: _, password: __, ...updateData } = data;
      updateMutation.mutate({ id: selected.id_employee, data: updateData });
    } else {
      createMutation.mutate(data as EmployeeCreatePayload);
    }
  };

  const handlePrintReport = async () => {
    try {
      const reportEmployees = await getEmployeesSortedBySurname();
      openReportPreview(
        'Звіт: Працівники',
        [
          { header: 'ID', getValue: (e: Employee) => e.id_employee },
          { header: 'Прізвище', getValue: (e: Employee) => e.empl_surname },
          { header: 'Імʼя', getValue: (e: Employee) => e.empl_name },
          { header: 'По батькові', getValue: (e: Employee) => e.empl_patronymic },
          { header: 'Посада', getValue: (e: Employee) => e.empl_role },
          { header: 'Телефон', getValue: (e: Employee) => e.phone_number },
          { header: 'Адреса', getValue: (e: Employee) => `${e.city}, ${e.street}, ${e.zip_code}` },
        ],
        reportEmployees,
        'Усі працівники, відсортовані за прізвищем',
      );
    } catch {
      setApiError('Не вдалося сформувати звіт по працівниках.');
    }
  };

  const applySearch = () => {
    const value = searchInput.trim();
    if (!value && (viewMode === 'search' || viewMode === 'contacts')) {
      setApiError('Для пошуку введи прізвище.');
      return;
    }
    setApiError('');
    setAppliedSurname(value);
  };

  const columns: GridColDef[] = [
    { field: 'id_employee', headerName: 'ID', width: 100, sortable: false, filterable: false },
    { field: 'empl_surname', headerName: 'Прізвище', width: 130, sortable: false, filterable: false },
    { field: 'empl_name', headerName: 'Ім\'я', width: 120, sortable: false, filterable: false },
    { field: 'empl_patronymic', headerName: 'По батькові', width: 130, sortable: false, filterable: false },
    {
      field: 'empl_role', headerName: 'Посада', width: 120, sortable: false, filterable: false,
      renderCell: (params) => (
        <Chip
          label={params.value === 'manager' ? 'Менеджер' : 'Касир'}
          color={params.value === 'manager' ? 'primary' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'salary', headerName: 'Зарплата', width: 120, sortable: false, filterable: false,
      renderCell: (params) => `${params.value} грн`,
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
                ? 'Неможливо видалити: є чеки, оформлені цим працівником'
                : 'Видалити працівника'
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

  if (error) return <Alert severity="error">Помилка завантаження даних працівників</Alert>;
  if (contactsError) return <Alert severity="error">Помилка завантаження контактів</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>Працівники</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrintReport}>
            Звіт
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
            Додати
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        <Button variant={viewMode === 'all' ? 'contained' : 'outlined'} onClick={() => { setViewMode('all'); setAppliedSurname(''); setApiError(''); }}>
          Усі працівники (за прізвищем)
        </Button>
        <Button variant={viewMode === 'cashiers' ? 'contained' : 'outlined'} onClick={() => { setViewMode('cashiers'); setAppliedSurname(''); setApiError(''); }}>
          Усі касири (за прізвищем)
        </Button>
        <Button variant={viewMode === 'search' ? 'contained' : 'outlined'} onClick={() => { setViewMode('search'); setApiError(''); }}>
          Пошук працівника за прізвищем
        </Button>
        <Button variant={viewMode === 'contacts' ? 'contained' : 'outlined'} onClick={() => { setViewMode('contacts'); setApiError(''); }}>
          Телефон і адреса за прізвищем
        </Button>
      </Box>

      {(viewMode === 'search' || viewMode === 'contacts') ? (
        <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Введи прізвище..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            size="small"
            sx={{ width: 320 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
          />
          <Button variant="contained" onClick={applySearch}>Застосувати</Button>
        </Box>
      ) : null}

      {viewMode === 'contacts' ? (
        <Box sx={{ bgcolor: 'white', borderRadius: 2, overflow: 'hidden', p: 2 }}>
          {loadingContacts ? <CircularProgress /> : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>ПІБ</TableCell>
                  <TableCell>Телефон</TableCell>
                  <TableCell>Адреса</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contacts.map((c) => (
                  <TableRow key={c.id_employee}>
                    <TableCell>{c.id_employee}</TableCell>
                    <TableCell>{c.full_name}</TableCell>
                    <TableCell>{c.phone_number}</TableCell>
                    <TableCell>{c.address}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Box>
      ) : (
        <Box sx={{ bgcolor: 'white', borderRadius: 2, overflow: 'hidden' }}>
          <DataGrid
            rows={employees}
            columns={columns}
            getRowId={(row) => row.id_employee}
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
      )}

      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{selected ? 'Редагувати працівника' : 'Новий працівник'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {apiError && <Alert severity="error">{apiError}</Alert>}

            {/* ID та пароль — тільки при створенні */}
            {!selected && (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="ID працівника" fullWidth size="small"
                  inputProps={{ maxLength: MAX_EMPLOYEE_ID_LEN }}
                  {...register('id_employee', { required: "Обов'язкове поле", maxLength: MAX_EMPLOYEE_ID_LEN })}
                  error={!!errors.id_employee}
                  helperText={errors.id_employee?.message}
                />
                <TextField
                  label="Пароль" type="password" fullWidth size="small"
                  {...register('password', { required: "Обов'язкове поле", minLength: { value: 6, message: 'Мінімум 6 символів' } })}
                  error={!!errors.password}
                  helperText={errors.password?.message}
                />
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Прізвище" fullWidth size="small"
                inputProps={{ maxLength: MAX_NAME_LEN }}
                {...register('empl_surname', { required: "Обов'язкове поле" })}
                error={!!errors.empl_surname}
                helperText={errors.empl_surname?.message}
              />
              <TextField
                label="Ім'я" fullWidth size="small"
                inputProps={{ maxLength: MAX_NAME_LEN }}
                {...register('empl_name', { required: "Обов'язкове поле" })}
                error={!!errors.empl_name}
                helperText={errors.empl_name?.message}
              />
            </Box>

            <TextField
              label="По батькові" fullWidth size="small"
              inputProps={{ maxLength: MAX_NAME_LEN }}
              {...register('empl_patronymic')}
            />

            <TextField
              label="Посада" fullWidth size="small" select
              defaultValue="cashier"
              {...register('empl_role', { required: "Обов'язкове поле" })}
              SelectProps={{ native: true }}
            >
              <option value="manager">Менеджер</option>
              <option value="cashier">Касир</option>
            </TextField>

            <TextField
              label="Зарплата (грн)" fullWidth size="small" type="number"
              {...register('salary', { required: "Обов'язкове поле", min: { value: 0, message: 'Не може бути від\'ємною' } })}
              error={!!errors.salary}
              helperText={errors.salary?.message}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Дата народження" fullWidth size="small" type="date"
                InputLabelProps={{ shrink: true }}
                {...register('date_of_birth', {
                  required: "Обов'язкове поле",
                  validate: (v) =>
                    !v || v <= maxBirthDateForAge18() || 'Вік працівника має бути не менше 18 років',
                })}
                error={!!errors.date_of_birth}
                helperText={errors.date_of_birth?.message}
              />
              <TextField
                label="Дата початку роботи" fullWidth size="small" type="date"
                InputLabelProps={{ shrink: true }}
                {...register('date_of_start', { required: "Обов'язкове поле" })}
                error={!!errors.date_of_start}
                helperText={errors.date_of_start?.message}
              />
            </Box>

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
              <TextField
                label="Місто"
                fullWidth
                size="small"
                inputProps={{ maxLength: MAX_NAME_LEN }}
                {...register('city', { required: "Обов'язкове поле" })}
                error={!!errors.city}
              />
              <TextField
                label="Вулиця"
                fullWidth
                size="small"
                inputProps={{ maxLength: MAX_NAME_LEN }}
                {...register('street', { required: "Обов'язкове поле" })}
                error={!!errors.street}
              />
              <TextField label="Індекс" fullWidth size="small" {...register('zip_code', { required: "Обов'язкове поле" })} error={!!errors.zip_code} />
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

      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          deleteMutation.reset();
          setDeleteDialogOpen(false);
        }}
      >
        <DialogTitle>Видалити працівника?</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Видалити <strong>{selected?.empl_surname} {selected?.empl_name}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Поки існує хоча б один чек, оформлений цим працівником, видалити запис неможливо.
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
