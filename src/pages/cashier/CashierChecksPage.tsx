import { useState } from 'react';
import {
  Box, Typography, TextField, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, IconButton, Chip, Table, TableHead,
  TableRow, TableCell, TableBody, CircularProgress
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { Visibility as ViewIcon, Add as AddIcon } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getMyChecks, getCheckById } from '../../api/checks';
import { getStoreProducts } from '../../api/storeProducts';
import { getProducts } from '../../api/products';
import { type Check } from '../../types';

// Інтерфейс для рядка проданого товару
interface SaleItem {
  UPC: string;
  product_number: number;
  selling_price: number;
}

// Інтерфейс для детального чеку з товарами
interface DetailedCheck extends Check {
  sales?: SaleItem[];
}

export default function CashierChecksPage() {
  const navigate = useNavigate();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Check | null>(null);
  const [checkDetail, setCheckDetail] = useState<DetailedCheck | null>(null);

  // Завантажуємо лише чеки цього касира з API
  const { data: checks = [], isLoading, error } = useQuery({
    queryKey: ['my-checks', dateFrom, dateTo],
    queryFn: () => getMyChecks({ 
      from: dateFrom || undefined, 
      to: dateTo || undefined 
    }),
  });

  const { data: storeProducts = [] } = useQuery({
    queryKey: ['store-products'],
    queryFn: getStoreProducts,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  const getProductName = (upc: string) => {
    const sp = storeProducts.find((s) => s.UPC === upc);
    if (!sp) return upc;
    return products.find((p) => p.id_product === sp.id_product)?.product_name ?? upc;
  };

  const handleView = async (check: Check) => {
    setSelected(check);
    try {
      const detail = await getCheckById(check.check_number);
      setCheckDetail(detail);
      setViewDialogOpen(true);
    } catch (err) {
      console.error("Не вдалося завантажити деталі чеку", err);
    }
  };

  const columns: GridColDef[] = [
    { field: 'check_number', headerName: 'Номер чека', width: 130 },
    {
      field: 'print_date', headerName: 'Дата', width: 160,
      renderCell: (params) => new Date(params.value).toLocaleString('uk-UA'),
    },
    {
      field: 'sum_total', headerName: 'Сума', width: 120,
      renderCell: (params) => `${params.value} грн`,
    },
    {
      field: 'vat', headerName: 'ПДВ', width: 100,
      renderCell: (params) => `${params.value} грн`,
    },
    { field: 'card_number', headerName: 'Карта клієнта', width: 140,
      renderCell: (params) => params.value
        ? <Chip label={params.value} size="small" color="primary" />
        : '—'
    },
    {
      field: 'actions', headerName: 'Деталі', width: 80, sortable: false,
      renderCell: (params) => (
        <IconButton size="small" color="primary" onClick={() => handleView(params.row)}>
          <ViewIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  if (error) return <Alert severity="error">Помилка завантаження</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>Мої чеки</Typography>
        
        {/* Кнопка переходу на сторінку створення чеку */}
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => navigate('/cashier/checks/new')}>
          Новий продаж
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', bgcolor: 'white', p: 2, borderRadius: 2 }}>
        <TextField
          label="Дата від" type="date" size="small"
          InputLabelProps={{ shrink: true }}
          value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
        />
        <TextField
          label="Дата до" type="date" size="small"
          InputLabelProps={{ shrink: true }}
          value={dateTo} onChange={(e) => setDateTo(e.target.value)}
        />
        <Button variant="outlined" onClick={() => { setDateFrom(''); setDateTo(''); }}>
          Скинути дати
        </Button>
      </Box>

      <Box sx={{ bgcolor: 'white', borderRadius: 2, overflow: 'hidden' }}>
        <DataGrid
          rows={checks} columns={columns}
          getRowId={(row) => row.check_number}
          loading={isLoading} autoHeight
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableRowSelectionOnClick
        />
      </Box>

      {/* Модальне вікно деталей */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Чек №{selected?.check_number}</DialogTitle>
        <DialogContent dividers>
          {checkDetail ? (
            <Box>
              <Typography variant="body2" color="text.secondary" mb={1}>
                Дата: {new Date(checkDetail.print_date).toLocaleString('uk-UA')}
              </Typography>
              {checkDetail.card_number && (
                <Typography variant="body2" color="text.secondary" mb={1}>
                  Карта клієнта: {checkDetail.card_number}
                </Typography>
              )}
              <Table size="small" sx={{ mt: 2 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Товар</TableCell>
                    <TableCell align="right">К-сть</TableCell>
                    <TableCell align="right">Ціна</TableCell>
                    <TableCell align="right">Сума</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {checkDetail.sales?.map((sale) => (
                    <TableRow key={sale.UPC}>
                      <TableCell>{getProductName(sale.UPC)}</TableCell>
                      <TableCell align="right">{sale.product_number}</TableCell>
                      <TableCell align="right">{sale.selling_price} грн</TableCell>
                      <TableCell align="right">
                        {(sale.product_number * sale.selling_price).toFixed(2)} грн
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Box sx={{ mt: 2, textAlign: 'right' }}>
                <Typography variant="body2">ПДВ: {checkDetail.vat} грн</Typography>
                <Typography variant="h6" fontWeight={600} color="primary">
                  Разом: {checkDetail.sum_total} грн
                </Typography>
              </Box>
            </Box>
          ) : <CircularProgress sx={{ display: 'block', mx: 'auto' }} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Закрити</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}