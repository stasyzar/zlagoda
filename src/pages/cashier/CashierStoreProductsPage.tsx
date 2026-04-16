import { useState } from 'react';
import {
  Box, Typography, TextField, InputAdornment, Alert,
  Chip, ToggleButton, ToggleButtonGroup, Button,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { Search as SearchIcon } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { getStoreProductsList, getStoreProductsSearch } from '../../api/storeProducts';
import { getProducts } from '../../api/products';

export default function CashierStoreProductsPage() {
  const [listFilter, setListFilter] = useState<'all' | 'promo' | 'regular'>('all');
  const [sortMode, setSortMode] = useState<'name' | 'quantity'>('name');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  const { data: storeProducts = [], isLoading: loadingSP, error: errorSP } = useQuery({
    queryKey: ['store-products-cashier', listFilter, sortMode, appliedSearch],
    queryFn: () => {
      const q = appliedSearch.trim();
      if (q) return getStoreProductsSearch(q, listFilter, sortMode);
      return getStoreProductsList(listFilter, sortMode);
    },
  });

  const { data: products = [], isLoading: loadingP, error: errorP } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  const columns: GridColDef[] = [
    { field: 'upc', headerName: 'UPC', width: 140, sortable: false, filterable: false },
    {
      field: 'id_product', headerName: 'Назва товару', flex: 1, sortable: false, filterable: false,
      renderCell: (params) =>
        params.row.product_name ?? products.find((p) => p.id_product === params.value)?.product_name ?? params.value,
    },
    {
      field: 'selling_price', headerName: 'Ціна', width: 120, sortable: false, filterable: false,
      renderCell: (params) => `${params.value} грн`,
    },
    { field: 'products_number', headerName: 'Залишок (шт)', width: 130, sortable: false, filterable: false },
    {
      field: 'promotional_product', headerName: 'Тип', width: 120, sortable: false, filterable: false,
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

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <ToggleButtonGroup
          value={listFilter}
          exclusive
          onChange={(_, val) => val && setListFilter(val)}
          size="small"
          sx={{ bgcolor: 'white' }}
        >
          <ToggleButton value="all">Усі</ToggleButton>
          <ToggleButton value="promo">Акційні</ToggleButton>
          <ToggleButton value="regular">Звичайні</ToggleButton>
        </ToggleButtonGroup>
        <ToggleButtonGroup
          value={sortMode}
          exclusive
          onChange={(_, val) => val && setSortMode(val)}
          size="small"
          sx={{ bgcolor: 'white' }}
        >
          <ToggleButton value="name">За назвою</ToggleButton>
          <ToggleButton value="quantity">За кількістю</ToggleButton>
        </ToggleButtonGroup>
        <TextField
          placeholder="Пошук за UPC або назвою…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          size="small"
          sx={{ width: 320, bgcolor: 'white', borderRadius: 1 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setAppliedSearch(searchInput.trim());
          }}
        />
        <Button variant="outlined" size="small" onClick={() => setAppliedSearch(searchInput.trim())}>
          Застосувати
        </Button>
      </Box>

      <Box sx={{ bgcolor: 'white', borderRadius: 2, overflow: 'hidden' }}>
        <DataGrid
          rows={storeProducts}
          columns={columns}
          getRowId={(row) => row.upc}
          loading={loadingSP || loadingP}
          autoHeight
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableRowSelectionOnClick
          disableColumnMenu
          disableColumnFilter
          disableColumnSorting
        />
      </Box>
    </Box>
  );
}
