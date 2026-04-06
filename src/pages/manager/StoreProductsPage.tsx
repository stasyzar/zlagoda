import { useState } from 'react';
import {
  Box, Button, Typography, TextField, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Alert, CircularProgress, MenuItem, Chip, ToggleButton, ToggleButtonGroup
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { getStoreProducts, createStoreProduct, updateStoreProduct, deleteStoreProduct } from '../../api/storeProducts';
import { getProducts } from '../../api/products';
import { type StoreProduct } from '../../types';

export default function StoreProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'promo' | 'regular'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState<StoreProduct | null>(null);

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<StoreProduct>();

  const { data: storeProducts = [], isLoading, error } = useQuery({
    queryKey: ['store-products'],
    queryFn: getStoreProducts,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  const createMutation = useMutation({
    mutationFn: createStoreProduct,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['store-products'] }); handleClose(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ upc, data }: { upc: string; data: Partial<StoreProduct> }) => updateStoreProduct(upc, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['store-products'] }); handleClose(); },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStoreProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-products'] });
      setDeleteDialogOpen(false);
      setSelected(null);
    },
  });

  const handleOpen = (product?: StoreProduct) => {
    if (product) { setSelected(product); reset(product); }
    else { setSelected(null); reset({ promotional_product: false }); }
    setDialogOpen(true);
  };

  const handleClose = () => { setDialogOpen(false); setSelected(null); reset({}); };

  const onSubmit = (data: StoreProduct) => {
    const payload = {
      ...data,
      selling_price: Number(data.selling_price),
      products_number: Number(data.products_number),
      promotional_product: Boolean(data.promotional_product),
    };
    if (selected) updateMutation.mutate({ upc: selected.UPC, data: payload });
    else createMutation.mutate(payload);
  };

  const filtered = storeProducts
    .filter((p) => {
      const product = products.find((pr) => pr.id_product === p.id_product);
      return product?.product_name.toLowerCase().includes(search.toLowerCase()) ?? true;
    })
    .filter((p) => {
      if (filter === 'promo') return p.promotional_product;
      if (filter === 'regular') return !p.promotional_product;
      return true;
    });

  const columns: GridColDef[] = [
    { field: 'UPC', headerName: 'UPC', width: 130 },
    {
      field: 'id_product', headerName: 'Товар', flex: 1,
      renderCell: (params) => {
        const product = products.find((p) => p.id_product === params.value);
        return product?.product_name ?? params.value;
      },
    },
    {
      field: 'selling_price', headerName: 'Ціна', width: 100,
      renderCell: (params) => `${params.value} грн`,
    },
    { field: 'products_number', headerName: 'К-сть', width: 80 },
    {
      field: 'promotional_product', headerName: 'Акція', width: 90,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Акційний' : 'Звичайний'}
          color={params.value ? 'warning' : 'default'}
          size="small"
        />
      ),
    },
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
        <Typography variant="h5" fontWeight={600}>Товари у магазині</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
          Додати
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
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
        <ToggleButtonGroup
          value={filter}
          exclusive
          onChange={(_, val) => val && setFilter(val)}
          size="small"
        >
          <ToggleButton value="all">Всі</ToggleButton>
          <ToggleButton value="promo">Акційні</ToggleButton>
          <ToggleButton value="regular">Звичайні</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ bgcolor: 'white', borderRadius: 2, overflow: 'hidden' }}>
        <DataGrid
          rows={filtered}
          columns={columns}
          getRowId={(row) => row.UPC}
          loading={isLoading}
          autoHeight
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableRowSelectionOnClick
        />
      </Box>

      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{selected ? 'Редагувати товар у магазині' : 'Новий товар у магазині'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="UPC" fullWidth size="small"
              disabled={!!selected}
              {...register('UPC', { required: "Обов'язкове поле" })}
              error={!!errors.UPC}
              helperText={errors.UPC?.message}
            />
            <TextField
              select label="Товар" fullWidth size="small"
              defaultValue=""
              {...register('id_product', { required: "Обов'язкове поле" })}
              error={!!errors.id_product}
            >
              {products.map((p) => (
                <MenuItem key={p.id_product} value={p.id_product}>
                  {p.product_name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Ціна продажу (грн)" fullWidth size="small" type="number"
              {...register('selling_price', { required: "Обов'язкове поле", min: 0 })}
              error={!!errors.selling_price}
            />
            <TextField
              label="Кількість одиниць" fullWidth size="small" type="number"
              {...register('products_number', { required: "Обов'язкове поле", min: 0 })}
              error={!!errors.products_number}
            />
            <Controller
              name="promotional_product"
              control={control}
              defaultValue={false}
              render={({ field }) => (
                <TextField
                  select label="Тип товару" fullWidth size="small"
                  value={field.value ? 'true' : 'false'}
                  onChange={(e) => field.onChange(e.target.value === 'true')}
                >
                  <MenuItem value="false">Звичайний</MenuItem>
                  <MenuItem value="true">Акційний</MenuItem>
                </TextField>
              )}
            />
            <TextField
              label="UPC акційного (необов'язково)" fullWidth size="small"
              {...register('UPC_prom')}
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
            Видалити товар з UPC <strong>{selected?.UPC}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Скасувати</Button>
          <Button
            color="error" variant="contained"
            onClick={() => selected && deleteMutation.mutate(selected.UPC)}
            disabled={deleteMutation.isPending}
          >
            Видалити
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}