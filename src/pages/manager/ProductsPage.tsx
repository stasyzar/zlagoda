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
import { getProducts, createProduct, updateProduct, deleteProduct } from '../../api/products';
import { getCategories } from '../../api/categories';
import { type Product } from '../../types';

type ProductForm = Omit<Product, 'id_product'>;

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | ''>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProductForm>();

  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); handleClose(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Product> }) => updateProduct(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); handleClose(); },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDeleteDialogOpen(false);
      setSelected(null);
    },
  });

  const handleOpen = (product?: Product) => {
    if (product) { setSelected(product); reset(product); }
    else { setSelected(null); reset({}); }
    setDialogOpen(true);
  };

  const handleClose = () => { setDialogOpen(false); setSelected(null); reset({}); };

  const onSubmit = (data: ProductForm) => {
    if (selected) updateMutation.mutate({ id: selected.id_product, data });
    else createMutation.mutate(data);
  };

  const filtered = products
    .filter((p) => p.product_name.toLowerCase().includes(search.toLowerCase()))
    .filter((p) => categoryFilter === '' || p.category_number === categoryFilter);

  const columns: GridColDef[] = [
    { field: 'id_product', headerName: 'ID', width: 70 },
    { field: 'product_name', headerName: 'Назва', flex: 1 },
    {
      field: 'category_number', headerName: 'Категорія', width: 160,
      renderCell: (params) => {
        const cat = categories.find((c) => c.category_number === params.value);
        return cat?.category_name ?? params.value;
      },
    },
    { field: 'characteristics', headerName: 'Характеристики', flex: 1 },
    {
      field: 'actions', headerName: 'Дії', width: 90, sortable: false,
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
        <Typography variant="h5" fontWeight={600}>Товари</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
          Додати
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          placeholder="Пошук за назвою..."
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
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value === '' ? '' : Number(e.target.value))}
          label="Фільтр за категорією"
        >
          <MenuItem value="">Всі категорії</MenuItem>
          {categories.map((c) => (
            <MenuItem key={c.category_number} value={c.category_number}>
              {c.category_name}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <Box sx={{ bgcolor: 'white', borderRadius: 2, overflow: 'hidden' }}>
        <DataGrid
          rows={filtered}
          columns={columns}
          getRowId={(row) => row.id_product}
          loading={isLoading}
          autoHeight
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableRowSelectionOnClick
        />
      </Box>

      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{selected ? 'Редагувати товар' : 'Новий товар'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Назва товару" fullWidth size="small"
              {...register('product_name', { required: "Обов'язкове поле" })}
              error={!!errors.product_name}
              helperText={errors.product_name?.message}
            />
            <TextField
              select label="Категорія" fullWidth size="small"
              defaultValue=""
              {...register('category_number', { required: "Обов'язкове поле" })}
              error={!!errors.category_number}
              helperText={errors.category_number?.message}
            >
              {categories.map((c) => (
                <MenuItem key={c.category_number} value={c.category_number}>
                  {c.category_name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Характеристики" fullWidth size="small" multiline rows={3}
              {...register('characteristics', { required: "Обов'язкове поле" })}
              error={!!errors.characteristics}
              helperText={errors.characteristics?.message}
            />
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

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Видалити товар?</DialogTitle>
        <DialogContent>
          <Typography>
            Видалити товар <strong>{selected?.product_name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Скасувати</Button>
          <Button
            color="error" variant="contained"
            onClick={() => selected && deleteMutation.mutate(selected.id_product)}
            disabled={deleteMutation.isPending}
          >
            Видалити
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}