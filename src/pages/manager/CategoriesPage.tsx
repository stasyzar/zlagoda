import { useState } from 'react';
import {
  Box, Button, Typography, TextField, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Alert, CircularProgress
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
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../api/categories';
import { type Category } from '../../types';

type CategoryForm = Omit<Category, 'category_number'>;

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Category | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CategoryForm>();

  const { data: categories = [], isLoading, error } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['categories'] }); handleClose(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Category> }) => updateCategory(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['categories'] }); handleClose(); },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setDeleteDialogOpen(false);
      setSelected(null);
    },
  });

  const handleOpen = (category?: Category) => {
    if (category) { setSelected(category); reset(category); }
    else { setSelected(null); reset({}); }
    setDialogOpen(true);
  };

  const handleClose = () => { setDialogOpen(false); setSelected(null); reset({}); };

  const onSubmit = (data: CategoryForm) => {
    if (selected) updateMutation.mutate({ id: selected.category_number, data });
    else createMutation.mutate(data);
  };

  const filtered = categories.filter((c) =>
    c.category_name.toLowerCase().includes(search.toLowerCase())
  );

  const columns: GridColDef[] = [
    { field: 'category_number', headerName: '№', width: 80 },
    { field: 'category_name', headerName: 'Назва категорії', flex: 1 },
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
        <Typography variant="h5" fontWeight={600}>Категорії</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
          Додати
        </Button>
      </Box>

      <TextField
        placeholder="Пошук за назвою..."
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
          getRowId={(row) => row.category_number}
          loading={isLoading}
          autoHeight
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableRowSelectionOnClick
        />
      </Box>

      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle>{selected ? 'Редагувати категорію' : 'Нова категорія'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Назва категорії" fullWidth size="small" sx={{ mt: 1 }}
            {...register('category_name', { required: "Обов'язкове поле" })}
            error={!!errors.category_name}
            helperText={errors.category_name?.message}
          />
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

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Видалити категорію?</DialogTitle>
        <DialogContent>
          <Typography>
            Видалити категорію <strong>{selected?.category_name}</strong>?
            Всі товари цієї категорії також будуть видалені.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Скасувати</Button>
          <Button
            color="error" variant="contained"
            onClick={() => selected && deleteMutation.mutate(selected.category_number)}
            disabled={deleteMutation.isPending}
          >
            Видалити
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}