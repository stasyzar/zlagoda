import { useState } from 'react';
import {
  Box, Button, Typography, TextField, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Alert, CircularProgress, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import {
  Visibility as VisibilityIcon,
  Delete as DeleteIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAllChecksByPeriod,
  getChecksByCashierAndPeriod,
  deleteCheck,
  getCheckByNumber,
} from '../../api/checks';
import { getCashiersSortedBySurname } from '../../api/employees';
import { type Check } from '../../types';
import { openReportPreview } from '../../utils/reportPrint';
import { getApiErrorMessage } from '../../utils/apiError';

function defaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

type Scope = 'all' | 'cashier';

export default function ChecksPage() {
  const queryClient = useQueryClient();
  const initRange = defaultDateRange();

  const [scopeDraft, setScopeDraft] = useState<Scope>('all');
  const [cashierDraft, setCashierDraft] = useState('');
  const [dateFromDraft, setDateFromDraft] = useState(initRange.from);
  const [dateToDraft, setDateToDraft] = useState(initRange.to);

  const [scopeApplied, setScopeApplied] = useState<Scope>('all');
  const [cashierApplied, setCashierApplied] = useState('');
  const [dateFromApplied, setDateFromApplied] = useState(initRange.from);
  const [dateToApplied, setDateToApplied] = useState(initRange.to);

  const [listError, setListError] = useState('');
  const [checkNumberLookupDraft, setCheckNumberLookupDraft] = useState('');
  const [checkLookupError, setCheckLookupError] = useState('');
  const [selectedCheckNumber, setSelectedCheckNumber] = useState<string | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', 'cashiers-sorted'],
    queryFn: getCashiersSortedBySurname,
  });

  const queryEnabled =
    Boolean(dateFromApplied && dateToApplied)
    && (scopeApplied === 'all' || (scopeApplied === 'cashier' && Boolean(cashierApplied.trim())));

  const { data: checks = [], isLoading, error } = useQuery({
    queryKey: [
      'manager-checks',
      scopeApplied,
      cashierApplied,
      dateFromApplied,
      dateToApplied,
    ],
    queryFn: async () => {
      if (scopeApplied === 'all') {
        return getAllChecksByPeriod(dateFromApplied, dateToApplied);
      }
      return getChecksByCashierAndPeriod(cashierApplied.trim(), dateFromApplied, dateToApplied);
    },
    enabled: queryEnabled,
  });

  const {
    data: checkDetails,
    isLoading: loadingDetails,
    isError: detailsQueryFailed,
    error: detailsQueryError,
  } = useQuery({
    queryKey: ['check-details', selectedCheckNumber],
    queryFn: () => getCheckByNumber(selectedCheckNumber!),
    enabled: Boolean(selectedCheckNumber) && detailsDialogOpen,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCheck,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-checks'] });
      setDeleteDialogOpen(false);
      setSelectedCheckNumber(null);
    },
  });

  const applyFilters = () => {
    setListError('');
    if (scopeDraft === 'cashier' && !cashierDraft.trim()) {
      setListError('Оберіть касира для цього режиму.');
      return;
    }
    if (!dateFromDraft || !dateToDraft) {
      setListError('Вкажіть дату «від» і «до» для періоду.');
      return;
    }
    if (dateFromDraft > dateToDraft) {
      setListError('Дата «від» не може бути більшою за «до».');
      return;
    }
    setScopeApplied(scopeDraft);
    setCashierApplied(cashierDraft);
    setDateFromApplied(dateFromDraft);
    setDateToApplied(dateToDraft);
  };

  const resetFilters = () => {
    const r = defaultDateRange();
    setListError('');
    setScopeDraft('all');
    setCashierDraft('');
    setDateFromDraft(r.from);
    setDateToDraft(r.to);
    setScopeApplied('all');
    setCashierApplied('');
    setDateFromApplied(r.from);
    setDateToApplied(r.to);
  };

  const handleOpenDetails = (checkNumber: string) => {
    setSelectedCheckNumber(checkNumber);
    setDetailsDialogOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsDialogOpen(false);
    setSelectedCheckNumber(null);
    setCheckLookupError('');
  };

  const openCheckByNumber = () => {
    const n = checkNumberLookupDraft.trim();
    if (!n) {
      setCheckLookupError('Вкажіть номер чека.');
      return;
    }
    setCheckLookupError('');
    setSelectedCheckNumber(n);
    setDetailsDialogOpen(true);
  };

  const handlePrintReport = () => {
    if (!dateFromApplied || !dateToApplied) {
      setListError('Вкажіть період і натисніть «Застосувати».');
      return;
    }
    if (scopeApplied === 'cashier' && !cashierApplied.trim()) {
      setListError('Для звіту по касиру оберіть касира та застосуйте фільтр.');
      return;
    }
    setListError('');
    const filters =
      scopeApplied === 'all'
        ? `Усі касири; від ${dateFromApplied} до ${dateToApplied}`
        : `Касир ${cashierApplied}; від ${dateFromApplied} до ${dateToApplied}`;
    openReportPreview(
      'Звіт: Чеки',
      [
        { header: 'Номер чека', getValue: (c: Check) => c.check_number },
        {
          header: 'Касир',
          getValue: (c: Check) =>
            employees.find((e) => e.id_employee === c.id_employee)?.empl_surname ?? c.id_employee,
        },
        { header: 'Карта', getValue: (c: Check) => c.card_number ?? '' },
        { header: 'Дата', getValue: (c: Check) => new Date(c.print_date).toLocaleString('uk-UA') },
        { header: 'Сума', getValue: (c: Check) => Number(c.sum_total).toFixed(2) },
        { header: 'ПДВ', getValue: (c: Check) => Number(c.vat).toFixed(2) },
      ],
      checks,
      filters,
    );
  };

  const columns: GridColDef[] = [
    { field: 'check_number', headerName: '№ Чеку', width: 120, sortable: false, filterable: false },
    {
      field: 'id_employee',
      headerName: 'Касир',
      width: 150,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const emp = employees.find((e) => e.id_employee === params.value);
        return emp ? `${emp.empl_surname} ${emp.empl_name[0]}.` : params.value;
      },
    },
    {
      field: 'card_number',
      headerName: 'Карта',
      width: 130,
      sortable: false,
      filterable: false,
      renderCell: (params) => params.value || '—',
    },
    {
      field: 'print_date',
      headerName: 'Дата',
      width: 180,
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
      renderCell: (params) => `${Number(params.value).toFixed(2)} грн`,
    },
    {
      field: 'actions',
      headerName: 'Дії',
      width: 100,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box>
          <IconButton size="small" color="primary" onClick={() => handleOpenDetails(params.row.check_number)}>
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => {
              deleteMutation.reset();
              setSelectedCheckNumber(params.row.check_number);
              setDeleteDialogOpen(true);
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  if (error) return <Alert severity="error">Помилка завантаження даних</Alert>;

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} mb={3}>Управління чеками</Typography>

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
        <Button variant="outlined" size="small" startIcon={<VisibilityIcon />} onClick={openCheckByNumber}>
          Показати чек
        </Button>
      </Box>
      {checkLookupError ? <Alert severity="warning" sx={{ mb: 2 }}>{checkLookupError}</Alert> : null}

      {listError ? <Alert severity="warning" sx={{ mb: 2 }}>{listError}</Alert> : null}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3, bgcolor: 'white', p: 2, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ width: '100%' }}>Режим списку (окремий запит на бекенд після «Застосувати»)</Typography>
          <ToggleButtonGroup
            value={scopeDraft}
            exclusive
            size="small"
            onChange={(_, v) => v && setScopeDraft(v)}
          >
            <ToggleButton value="all">Усі чеки</ToggleButton>
            <ToggleButton value="cashier">Чеки касира</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        {scopeDraft === 'cashier' ? (
          <TextField
            select
            label="Касир"
            size="small"
            sx={{ width: 280 }}
            value={cashierDraft}
            onChange={(e) => setCashierDraft(e.target.value)}
          >
            <MenuItem value="">Оберіть касира</MenuItem>
            {employees.map((c) => (
              <MenuItem key={c.id_employee} value={c.id_employee}>
                {c.empl_surname} {c.empl_name}
              </MenuItem>
            ))}
          </TextField>
        ) : null}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            label="З дати"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={dateFromDraft}
            onChange={(e) => setDateFromDraft(e.target.value)}
          />
          <TextField
            label="По дату"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={dateToDraft}
            onChange={(e) => setDateToDraft(e.target.value)}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="contained" size="small" onClick={applyFilters}>
            Застосувати
          </Button>
          <Button variant="outlined" size="small" onClick={resetFilters}>
            Скинути
          </Button>
          <Button variant="outlined" size="small" startIcon={<PrintIcon />} onClick={handlePrintReport}>
            Звіт (поточний список)
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
          disableRowSelectionOnClick
          disableColumnMenu
          disableColumnFilter
          disableColumnSorting
        />
      </Box>

      <Dialog open={detailsDialogOpen} onClose={handleCloseDetails} maxWidth="sm" fullWidth>
        <DialogTitle>Чек №{selectedCheckNumber}</DialogTitle>
        <DialogContent dividers>
          {loadingDetails ? (
            <CircularProgress sx={{ display: 'block', mx: 'auto', my: 2 }} />
          ) : detailsQueryFailed ? (
            <Alert severity="error">{getApiErrorMessage(detailsQueryError, 'Не вдалося завантажити чек.')}</Alert>
          ) : checkDetails ? (
            <Box>
              <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flex: 1, minWidth: 120 }}>
                  <Typography variant="caption" color="text.secondary">Касир (id)</Typography>
                  <Typography variant="body2">{checkDetails.id_employee}</Typography>
                </Box>
                <Box sx={{ flex: 1, minWidth: 120 }}>
                  <Typography variant="caption" color="text.secondary">Дата</Typography>
                  <Typography variant="body2">{new Date(checkDetails.print_date).toLocaleString('uk-UA')}</Typography>
                </Box>
                <Box sx={{ flex: 1, minWidth: 120 }}>
                  <Typography variant="caption" color="text.secondary">Карта</Typography>
                  <Typography variant="body2">{checkDetails.card_number || '—'}</Typography>
                </Box>
              </Box>

              <Typography variant="subtitle2" mb={1}>Товари:</Typography>
              <Box sx={{ bgcolor: '#fafafa', p: 1, borderRadius: 1 }}>
                {checkDetails.items?.map((item, idx) => (
                  <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                    <Typography variant="body2">{item.product_name ?? `UPC: ${item.upc}`}</Typography>
                    <Typography variant="body2">{item.quantity} шт. x {item.selling_price} грн</Typography>
                  </Box>
                ))}
              </Box>

              {(() => {
                const goodsTotal = (checkDetails.items ?? []).reduce(
                  (sum, item) => sum + Number(item.selling_price) * Number(item.quantity),
                  0,
                );
                const checkTotal = Number(checkDetails.sum_total);
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
                    <Typography variant="caption">ПДВ: {Number(checkDetails.vat).toFixed(2)} грн</Typography>
                    <Typography variant="h6">Всього: {checkTotal.toFixed(2)} грн</Typography>
                  </Box>
                );
              })()}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>Закрити</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          deleteMutation.reset();
          setDeleteDialogOpen(false);
        }}
      >
        <DialogTitle>Видалити чек?</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>Увага:</strong> разом із чеком буде назавжди видалено всі позиції продажу в цьому чеку.
          </Alert>
          <Typography gutterBottom>
            Видалити чек <strong>№{selectedCheckNumber}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Цю дію не можна скасувати.
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
            disabled={deleteMutation.isPending}
            onClick={() => selectedCheckNumber && deleteMutation.mutate(selectedCheckNumber)}
          >
            Видалити
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
