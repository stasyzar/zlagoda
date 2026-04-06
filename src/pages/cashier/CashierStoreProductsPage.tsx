import { useState } from 'react';
import { 
  Box, Typography, TextField, InputAdornment, Alert, 
  Chip, ToggleButton, ToggleButtonGroup 
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { Search as SearchIcon } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { getStoreProducts } from '../../api/storeProducts';
import { getProducts } from '../../api/products';

export default function CashierStoreProductsPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'promo' | 'regular'>('all');

  const { data: storeProducts = [], isLoading: loadingSP, error: errorSP } = useQuery({
    queryKey: ['store-products'],
    queryFn: getStoreProducts,
  });

  const { data: products = [], isLoading: loadingP, error: errorP } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  const filtered = storeProducts
    .filter((p) => {
      // Пошук за UPC або за назвою товару
      const product = products.find((pr) => pr.id_product === p.id_product);
      const matchName = product?.product_name.toLowerCase().includes(search.toLowerCase()) ?? false;
      const matchUPC = p.UPC.toLowerCase().includes(search.toLowerCase());
      return matchName || matchUPC;
    })
    .filter((p) => {
      if (filter === 'promo') return p.promotional_product;
      if (filter === 'regular') return !p.promotional_product;
      return true;
    });

  const columns: GridColDef[] = [
    { field: 'UPC', headerName: 'UPC', width: 140 },
    {
      field: 'id_product', headerName: 'Назва товару', flex: 1,
      renderCell: (params) => {
        const product = products.find((p) => p.id_product === params.value);
        return product?.product_name ?? params.value;
      },
    },
    {
      field: 'selling_price', headerName: 'Ціна', width: 120,
      renderCell: (params) => `${params.value} грн`,
    },
    { field: 'products_number', headerName: 'Залишок (шт)', width: 130 },
    {
      field: 'promotional_product', headerName: 'Тип', width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Акційний' : 'Звичайний'}
          color={params.value ? 'warning' : 'default'}
          size="small"
        />
      ),
    },
  ];

  if (errorSP || errorP) return <Alert severity="error">Помилка завантаження даних</Alert>;

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} mb={3}>Товари у магазині</Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
        <TextField
          placeholder="Пошук за UPC або назвою..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          size="small" sx={{ width: 350, bgcolor: 'white', borderRadius: 1 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
        />
        <ToggleButtonGroup
          value={filter} exclusive
          onChange={(_, val) => val && setFilter(val)}
          size="small" sx={{ bgcolor: 'white' }}
        >
          <ToggleButton value="all">Всі товари</ToggleButton>
          <ToggleButton value="promo">Акційні</ToggleButton>
          <ToggleButton value="regular">Звичайні</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ bgcolor: 'white', borderRadius: 2, overflow: 'hidden' }}>
        <DataGrid
          rows={filtered} columns={columns}
          getRowId={(row) => row.UPC}
          loading={loadingSP || loadingP} autoHeight
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableRowSelectionOnClick
        />
      </Box>
    </Box>
  );
}