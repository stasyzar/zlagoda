import { useState } from 'react';
import {
  Box, Typography, TextField, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, IconButton, Chip, Table, TableHead,
  TableRow, TableCell, TableBody, CircularProgress,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { Visibility as ViewIcon, Add as AddIcon } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getMyChecksToday, getMyChecksByPeriod, getCheckByNumber } from '../../api/checks';
import { getStoreProducts } from '../../api/storeProducts';
import { getProducts } from '../../api/products';
import { type Check } from '../../types';
import { getApiErrorMessage } from '../../utils/apiError';

interface SaleItem {
  upc: string;
  quantity: number;
  selling_price: number;
  product_name?: string;
}

interface DetailedCheck extends Check {
  items?: SaleItem[];
}

type CashierCheckView = 'today' | 'period';

export default function CashierChecksPage() {
  const navigate = useNavigate();
  const [viewDraft, setViewDraft] = useState<CashierCheckView>('today');
  const [dateFromDraft, setDateFromDraft] = useState('');
  const [dateToDraft, setDateToDraft] = useState('');

  const [viewApplied, setViewApplied] = useState<CashierCheckView>('today');
  const [dateFromApplied, setDateFromApplied] = useState('');
  const [dateToApplied, setDateToApplied] = useState('');

  const [filterHint, setFilterHint] = useState('');

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Check | null>(null);
  const [checkDetail, setCheckDetail] = useState<DetailedCheck | null>(null);
  const [checkNumberLookupDraft, setCheckNumberLookupDraft] = useState('');
  const [checkLookupError, setCheckLookupError] = useState('');
  const [loadingCheckByNumber, setLoadingCheckByNumber] = useState(false);

  const periodQueryEnabled =
    viewApplied === 'today'
    || (viewApplied === 'period' && Boolean(dateFromApplied && dateToApplied));

  const { data: checks = [], isLoading, error } = useQuery({
    queryKey: ['my-checks', viewApplied, dateFromApplied, dateToApplied],
    queryFn: () => {
      if (viewApplied === 'today') return getMyChecksToday();
      return getMyChecksByPeriod(dateFromApplied, dateToApplied);
    },
    enabled: periodQueryEnabled,
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
    const sp = storeProducts.find((s) => s.upc === upc);
    if (!sp) return upc;
    return products.find((p) => p.id_product === sp.id_product)?.product_name ?? upc;
  };

  const applyView = () => {
    setFilterHint('');
    if (viewDraft === 'period' && (!dateFromDraft || !dateToDraft)) {
      setFilterHint('Для періоду вкажіть обидві дати.');
      return;
    }
    setViewApplied(viewDraft);
    if (viewDraft === 'today') {
      setDateFromApplied('');
      setDateToApplied('');
    } else {
      setDateFromApplied(dateFromDraft);
      setDateToApplied(dateToDraft);
    }
  };

  const resetView = () => {
    setFilterHint('');
    setViewDraft('today');
    setDateFromDraft('');
    setDateToDraft('');
    setViewApplied('today');
    setDateFromApplied('');
    setDateToApplied('');
  };

  const handleView = async (check: Check) => {
    setSelected(check);
    setCheckLookupError('');
    try {
      const detail = await getCheckByNumber(check.check_number);
      setCheckDetail(detail);
      setViewDialogOpen(true);
    } catch (err) {
      console.error('Не вдалося завантажити деталі чеку', err);
    }
  };

  const openCheckByNumber = async () => {
    const n = checkNumberLookupDraft.trim();
    if (!n) {
      setCheckLookupError('Вкажіть номер чека.');
      return;
    }
    setCheckLookupError('');
    setLoadingCheckByNumber(true);
    try {
      const detail = await getCheckByNumber(n);
      setSelected({
        check_number: n,
        id_employee: detail.id_employee,
        print_date: detail.print_date,
        sum_total: detail.sum_total,
        vat: detail.vat,
        card_number: detail.card_number,
      });
      setCheckDetail(detail);
      setViewDialogOpen(true);
    } catch (e) {
      setCheckLookupError(getApiErrorMessage(e, 'Чек не знайдено або немає доступу.'));
    } finally {
      setLoadingCheckByNumber(false);
    }
  };

  const columns: GridColDef[] = [
    { field: 'check_number', headerName: 'Номер чека', width: 130, sortable: false, filterable: false },
    {
      field: 'print_date',
      headerName: 'Дата',
      width: 160,
      sortable: false,
      filterable: false,
      renderCell: (params) => new Date(params.value).toLocaleString('uk-UA'),
    },
    {
      field: 'sum_total',
      headerName: 'Сума',
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) => `${params.value} грн`,
    },
    {
      field: 'vat',
      headerName: 'ПДВ',
      width: 100,
      sortable: false,
      filterable: false,
      renderCell: (params) => `${params.value} грн`,
    },
    {
      field: 'card_number',
      headerName: 'Карта клієнта',
      width: 140,
      sortable: false,
      filterable: false,
      renderCell: (params) => (params.value
        ? <Chip label={params.value} size="small" color="primary" />
        : '—'),
    },
    {
      field: 'actions',
      headerName: 'Деталі',
      width: 80,
      sortable: false,
      filterable: false,
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
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/cashier/checks/new')}>
          Новий продаж
        </Button>
      </Box>

      {filterHint ? <Alert severity="warning" sx={{ mb: 2 }}>{filterHint}</Alert> : null}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mb: 2 }}>
        <TextField
          label="Номер чека"
          size="small"
          value={checkNumberLookupDraft}
          onChange={(e) => {
            setCheckNumberLookupDraft(e.target.value);
            setCheckLookupError('');
          }}
          sx={{ minWidth: 240 }}
        />
        <Button
          variant="outlined"
          size="small"
          startIcon={<ViewIcon />}
          disabled={loadingCheckByNumber}
          onClick={openCheckByNumber}
        >
          Показати чек
        </Button>
      </Box>
      {checkLookupError ? <Alert severity="error" sx={{ mb: 2 }}>{checkLookupError}</Alert> : null}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2, bgcolor: 'white', p: 2, borderRadius: 2 }}>
        <ToggleButtonGroup
          value={viewDraft}
          exclusive
          size="small"
          onChange={(_, v) => v && setViewDraft(v)}
        >
          <ToggleButton value="today">За сьогодні</ToggleButton>
          <ToggleButton value="period">За періодом</ToggleButton>
        </ToggleButtonGroup>
        {viewDraft === 'period' ? (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              label="Дата від"
              type="date"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={dateFromDraft}
              onChange={(e) => setDateFromDraft(e.target.value)}
            />
            <TextField
              label="Дата до"
              type="date"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={dateToDraft}
              onChange={(e) => setDateToDraft(e.target.value)}
            />
          </Box>
        ) : null}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" size="small" onClick={applyView}>
            Застосувати
          </Button>
          <Button variant="outlined" size="small" onClick={resetView}>
            Скинути
          </Button>
        </Box>
      </Box>

      <Box sx={{ bgcolor: 'white', borderRadius: 2, overflow: 'hidden' }}>
        <DataGrid
          rows={checks}
          columns={columns}
          getRowId={(row) => row.check_number}
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

      <Dialog
        open={viewDialogOpen}
        onClose={() => {
          setViewDialogOpen(false);
          setCheckLookupError('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Чек №{selected?.check_number}</DialogTitle>
        <DialogContent dividers>
          {checkDetail ? (
            <Box>
              <Typography variant="body2" color="text.secondary" mb={1}>
                Дата: {new Date(checkDetail.print_date).toLocaleString('uk-UA')}
              </Typography>
              {checkDetail.card_number ? (
                <Typography variant="body2" color="text.secondary" mb={1}>
                  Карта клієнта: {checkDetail.card_number}
                </Typography>
              ) : null}
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
                  {checkDetail.items?.map((sale) => (
                    <TableRow key={`${sale.upc}-${sale.quantity}`}>
                      <TableCell>{sale.product_name ?? getProductName(sale.upc)}</TableCell>
                      <TableCell align="right">{sale.quantity}</TableCell>
                      <TableCell align="right">{sale.selling_price} грн</TableCell>
                      <TableCell align="right">
                        {(sale.quantity * sale.selling_price).toFixed(2)} грн
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {(() => {
                const goodsTotal = (checkDetail.items ?? []).reduce(
                  (sum, sale) => sum + Number(sale.selling_price) * Number(sale.quantity),
                  0,
                );
                const checkTotal = Number(checkDetail.sum_total);
                const discount = Math.max(0, goodsTotal - checkTotal);

                return (
                  <Box sx={{ mt: 2, textAlign: 'right' }}>
                    {discount > 0 ? (
                      <>
                        <Typography variant="body2">
                          Сума товарів (без знижки): {goodsTotal.toFixed(2)} грн
                        </Typography>
                        <Typography variant="body2" color="success.main">
                          Знижка: -{discount.toFixed(2)} грн
                        </Typography>
                      </>
                    ) : null}
                    <Typography variant="body2">ПДВ: {Number(checkDetail.vat).toFixed(2)} грн</Typography>
                    <Typography variant="h6" fontWeight={600} color="primary">
                      Разом: {checkTotal.toFixed(2)} грн
                    </Typography>
                  </Box>
                );
              })()}
            </Box>
          ) : <CircularProgress sx={{ display: 'block', mx: 'auto' }} />}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setViewDialogOpen(false);
              setCheckLookupError('');
            }}
          >
            Закрити
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
