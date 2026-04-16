import { useState } from 'react';
import {
  Box, Typography, TextField, InputAdornment,
  Alert, MenuItem, Button,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { Search as SearchIcon } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import {
  getProductsSortedByName,
  getProductsByCategorySortedByName,
  searchProductsByName,
} from '../../api/products';
import { getCategories } from '../../api/categories';
import { type Product } from '../../types';

export default function CashierProductsPage() {
  const [viewMode, setViewMode] = useState<'all' | 'by-category' | 'search'>('all');
  const [searchInput, setSearchInput] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | ''>('');
  const [appliedCategory, setAppliedCategory] = useState<number | ''>('');
  const [appliedQuery, setAppliedQuery] = useState('');

  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ['cashier-products-page', viewMode, appliedCategory, appliedQuery],
    queryFn: async () => {
      if (viewMode === 'by-category') return getProductsByCategorySortedByName(Number(appliedCategory));
      if (viewMode === 'search') return searchProductsByName(appliedQuery);
      return getProductsSortedByName();
    },
    enabled:
      viewMode === 'all'
      || (viewMode === 'by-category' && appliedCategory !== '')
      || (viewMode === 'search' && Boolean(appliedQuery.trim())),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const applyFilters = () => {
    if (viewMode === 'by-category') {
      if (categoryFilter === '') return;
      setAppliedCategory(Number(categoryFilter));
    }
    if (viewMode === 'search') {
      if (!searchInput.trim()) return;
      setAppliedQuery(searchInput.trim());
    }
  };

  const columns: GridColDef[] = [
    { field: 'id_product', headerName: 'ID', width: 70, sortable: false, filterable: false },
    { field: 'product_name', headerName: 'Назва', flex: 1, sortable: false, filterable: false },
    { field: 'producer', headerName: 'Виробник', width: 140, sortable: false, filterable: false },
    {
      field: 'category_number', headerName: 'Категорія', width: 150, sortable: false, filterable: false,
      renderCell: (params) =>
        categories.find((c) => c.category_number === params.value)?.category_name ?? params.value,
    },
    { field: 'characteristics', headerName: 'Характеристики', flex: 1, sortable: false, filterable: false },
  ];

  if (error) return <Alert severity="error">Помилка завантаження</Alert>;

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} mb={3}>Товари (каталог)</Typography>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        <Button
          variant={viewMode === 'all' ? 'contained' : 'outlined'}
          size="small"
          onClick={() => {
            setViewMode('all');
            setAppliedCategory('');
            setAppliedQuery('');
          }}
        >
          Усі за назвою
        </Button>
        <Button
          variant={viewMode === 'by-category' ? 'contained' : 'outlined'}
          size="small"
          onClick={() => {
            setViewMode('by-category');
            setAppliedCategory('');
          }}
        >
          За категорією
        </Button>
        <Button
          variant={viewMode === 'search' ? 'contained' : 'outlined'}
          size="small"
          onClick={() => {
            setViewMode('search');
            setAppliedQuery('');
          }}
        >
          Пошук за назвою
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        {viewMode === 'search' ? (
          <TextField
            placeholder="Пошук за назвою..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            size="small"
            sx={{ width: 280 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyFilters();
            }}
          />
        ) : null}
        {viewMode === 'by-category' ? (
          <TextField
            select
            label="Категорія"
            size="small"
            sx={{ width: 220 }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value === '' ? '' : Number(e.target.value))}
          >
            <MenuItem value="">Оберіть…</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c.category_number} value={c.category_number}>{c.category_name}</MenuItem>
            ))}
          </TextField>
        ) : null}
        {viewMode === 'by-category' || viewMode === 'search' ? (
          <Button variant="outlined" size="small" onClick={applyFilters}>
            Застосувати
          </Button>
        ) : null}
      </Box>

      <Box sx={{ bgcolor: 'white', borderRadius: 2, overflow: 'hidden' }}>
        <DataGrid<Product>
          rows={products}
          columns={columns}
          getRowId={(row) => row.id_product}
          loading={isLoading}
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
