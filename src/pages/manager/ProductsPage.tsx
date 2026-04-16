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
import {
  getProductsSortedByName,
  getProductsByCategorySortedByName,
  searchProductsByName,
  createProduct,
  updateProduct,
  deleteProduct,
  getProducts,
} from '../../api/products';
import { getCategories } from '../../api/categories';
import { type Product } from '../../types';
import { openReportPreview } from '../../utils/reportPrint';
import { getApiErrorMessage } from '../../utils/apiError';

type ProductForm = Omit<Product, 'id_product'>;

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'all' | 'by-category' | 'search'>('all');
  const [searchInput, setSearchInput] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | ''>('');
  const [appliedCategory, setAppliedCategory] = useState<number | ''>('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProductForm>();
  const [apiError, setApiError] = useState('');

  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ['products-page', viewMode, appliedCategory, appliedQuery],
    queryFn: async () => {
      if (viewMode === 'by-category') return getProductsByCategorySortedByName(Number(appliedCategory));
      if (viewMode === 'search') return searchProductsByName(appliedQuery);
      return getProductsSortedByName();
    },
    enabled:
      viewMode === 'all' ||
      (viewMode === 'by-category' && appliedCategory !== '') ||
      (viewMode === 'search' && Boolean(appliedQuery.trim())),
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

  const handlePrintReport = () => {
    getProducts().then((reportProducts) => {
      openReportPreview(
        'Звіт: Товари',
        [
          { header: 'ID', getValue: (p: Product) => p.id_product },
          { header: 'Назва', getValue: (p: Product) => p.product_name },
          { header: 'Виробник', getValue: (p: Product) => p.producer },
          { header: 'Категорія', getValue: (p: Product) => categories.find((c) => c.category_number === p.category_number)?.category_name ?? p.category_number },
          { header: 'Характеристики', getValue: (p: Product) => p.characteristics },
        ],
        reportProducts,
        'Усі товари, відсортовані за назвою',
      );
    }).catch(() => setApiError('Не вдалося сформувати звіт по товарах.'));
  };

  const applyFilters = () => {
    if (viewMode === 'by-category' && categoryFilter === '') {
      setApiError('Обери категорію для цього режиму.');
      return;
    }
    if (viewMode === 'search' && !searchInput.trim()) {
      setApiError('Введи назву товару для пошуку.');
      return;
    }
    setApiError('');
    if (viewMode === 'by-category') {
      setAppliedCategory(Number(categoryFilter));
    }
    if (viewMode === 'search') {
      setAppliedQuery(searchInput.trim());
    }
  };

  const columns: GridColDef[] = [
    { field: 'id_product', headerName: 'ID', width: 70, sortable: false, filterable: false },
    { field: 'product_name', headerName: 'Назва', flex: 1, sortable: false, filterable: false },
    { field: 'producer', headerName: 'Виробник', width: 150, sortable: false, filterable: false },
    {
      field: 'category_number', headerName: 'Категорія', width: 160, sortable: false, filterable: false,
      renderCell: (params) => {
        const cat = categories.find((c) => c.category_number === params.value);
        return cat?.category_name ?? params.value;
      },
    },
    { field: 'characteristics', headerName: 'Характеристики', flex: 1, sortable: false, filterable: false },
    {
      field: 'actions', headerName: 'Дії', width: 90, sortable: false, filterable: false,
      renderCell: (params) => (
        <Box>
          <IconButton size="small" onClick={() => handleOpen(params.row)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <Tooltip
            title={
              (params.row.store_product_count ?? 0) > 0
                ? 'Неможливо видалити: у магазині є позиції (UPC) цього товару'
                : 'Видалити товар з каталогу'
            }
          >
            <span>
              <IconButton
                size="small"
                color="error"
                disabled={(params.row.store_product_count ?? 0) > 0}
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
        <Typography variant="h5" fontWeight={600}>Товари</Typography>
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
        <Button
          variant={viewMode === 'all' ? 'contained' : 'outlined'}
          onClick={() => {
            setViewMode('all');
            setApiError('');
            setAppliedCategory('');
          }}
        >
          Усі товари (за назвою)
        </Button>
        <Button
          variant={viewMode === 'by-category' ? 'contained' : 'outlined'}
          onClick={() => {
            setViewMode('by-category');
            setApiError('');
            setAppliedCategory('');
          }}
        >
          Товари певної категорії
        </Button>
        <Button
          variant={viewMode === 'search' ? 'contained' : 'outlined'}
          onClick={() => {
            setViewMode('search');
            setApiError('');
            setAppliedQuery('');
          }}
        >
          Пошук за назвою
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        {viewMode === 'search' ? (
          <TextField
            placeholder="Пошук за назвою..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            size="small"
            sx={{ width: 300 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyFilters();
            }}
          />
        ) : null}
        {viewMode === 'by-category' ? (
          <TextField
            select size="small" sx={{ width: 260 }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value === '' ? '' : Number(e.target.value))}
            label="Обери категорію"
          >
            <MenuItem value="">—</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c.category_number} value={c.category_number}>
                {c.category_name}
              </MenuItem>
            ))}
          </TextField>
        ) : null}
        {(viewMode === 'search' || viewMode === 'by-category') ? (
          <Button variant="contained" onClick={applyFilters}>Застосувати</Button>
        ) : null}
      </Box>

      <Box sx={{ bgcolor: 'white', borderRadius: 2, overflow: 'hidden' }}>
        <DataGrid
          rows={products}
          columns={columns}
          getRowId={(row) => row.id_product}
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
              label="Виробник" fullWidth size="small"
              {...register('producer', { required: "Обов'язкове поле" })}
              error={!!errors.producer}
              helperText={errors.producer?.message}
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

      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          deleteMutation.reset();
          setDeleteDialogOpen(false);
        }}
      >
        <DialogTitle>Видалити товар з каталогу?</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Видалити <strong>{selected?.product_name}</strong> (id_product)?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Спочатку видаліть усі позиції цього товару (UPC) в розділі «Товари в магазині».
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