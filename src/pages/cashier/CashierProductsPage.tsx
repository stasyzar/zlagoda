import { useState } from 'react';
import {
  Box, Typography, TextField, InputAdornment,
  Alert, MenuItem, ToggleButton, ToggleButtonGroup, Chip
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { Search as SearchIcon } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { getStoreProducts } from '../../api/storeProducts';
import { getProducts } from '../../api/products';
import { getCategories } from '../../api/categories';

export default function CashierProductsPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | ''>('');
  const [filter, setFilter] = useState<'all' | 'promo' | 'regular'>('all');

  const { data: storeProducts = [], isLoading, error } = useQuery({
    queryKey: ['store-products'],
    queryFn: getStoreProducts,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const getProductName = (id: number) => products.find((p) => p.id_product === id)?.product_name ?? '';
  const getCategoryNumber = (id: number) => products.find((p) => p.id_product === id)?.category_number;

  const filtered = storeProducts
    .filter((sp) => getProductName(sp.id_product).toLowerCase().includes(search.toLowerCase()))
    .filter((sp) => categoryFilter === '' || getCategoryNumber(sp.id_product) === categoryFilter)
    .filter((sp) => {
      if (filter === 'promo') return sp.promotional_product;
      if (filter === 'regular') return !sp.promotional_product;
      return true;
    });

  const columns: GridColDef[] = [
    { field: 'UPC', headerName: 'UPC', width: 130 },
    {
      field: 'id_product', headerName: 'Назва', flex: 1,
      renderCell: (params) => getProductName(params.value),
    },
    {
      field: 'selling_price', headerName: 'Ціна', width: 110,
      renderCell: (params) => `${params.value} грн`,
    },
    { field: 'products_number', headerName: 'К-сть', width: 80 },
    {
      field: 'promotional_product', headerName: 'Тип', width: 110,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Акційний' : 'Звичайний'}
          color={params.value ? 'warning' : 'default'}
          size="small"
        />
      ),
    },
  ];

  if (error) return <Alert severity="error">Помилка завантаження</Alert>;

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} mb={3}>Товари у магазині</Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          placeholder="Пошук за назвою..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          size="small" sx={{ width: 280 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
        />
        <TextField
          select label="Категорія" size="small" sx={{ width: 200 }}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value === '' ? '' : Number(e.target.value))}
        >
          <MenuItem value="">Всі категорії</MenuItem>
          {categories.map((c) => (
            <MenuItem key={c.category_number} value={c.category_number}>{c.category_name}</MenuItem>
          ))}
        </TextField>
        <ToggleButtonGroup
          value={filter} exclusive size="small"
          onChange={(_, val) => val && setFilter(val)}
        >
          <ToggleButton value="all">Всі</ToggleButton>
          <ToggleButton value="promo">Акційні</ToggleButton>
          <ToggleButton value="regular">Звичайні</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ bgcolor: 'white', borderRadius: 2, overflow: 'hidden' }}>
        <DataGrid
          rows={filtered} columns={columns}
          getRowId={(row) => row.UPC}
          loading={isLoading} autoHeight
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableRowSelectionOnClick
        />
      </Box>
    </Box>
  );
}