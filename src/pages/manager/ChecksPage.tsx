import { useState } from 'react';
import {
  Box, Button, Typography, TextField, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Alert, CircularProgress
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import {
  Visibility as VisibilityIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getChecks, deleteCheck, getCheckByNumber } from '../../api/checks';
import { getEmployees } from '../../api/employees';
import { type Check } from '../../types';

interface SaleItem {
  upc: string;
  product_number: number;
  selling_price: number;
}

interface DetailedCheck extends Check {
  items?: SaleItem[];
}

export default function ChecksPage() {
  const queryClient = useQueryClient();
  
  const [cashierFilter, setCashierFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const [selectedCheckNumber, setSelectedCheckNumber] = useState<string | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: getEmployees,
  });
  
  const cashiers = employees.filter(e => e.empl_role.toLowerCase() === 'cashier');

  const { data: checks = [], isLoading, error } = useQuery({
    queryKey: ['checks', cashierFilter, dateFrom, dateTo],
    queryFn: () => getChecks({ 
      cashier: cashierFilter || undefined, 
      from: dateFrom || undefined, 
      to: dateTo || undefined 
    }),
  });

  const { data: checkDetails, isLoading: loadingDetails } = useQuery<DetailedCheck>({
    queryKey: ['check-details', selectedCheckNumber],
    queryFn: () => getCheckByNumber(selectedCheckNumber!),
    enabled: !!selectedCheckNumber && detailsDialogOpen,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCheck,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checks'] });
      setDeleteDialogOpen(false);
      setSelectedCheckNumber(null);
    },
  });

  const handleOpenDetails = (checkNumber: string) => {
    setSelectedCheckNumber(checkNumber);
    setDetailsDialogOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsDialogOpen(false);
    setSelectedCheckNumber(null);
  };

  const columns: GridColDef[] = [
    { field: 'check_number', headerName: '№ Чеку', width: 120 },
    { 
      field: 'id_employee', headerName: 'Касир', width: 150,
      renderCell: (params) => {
        const emp = employees.find(e => e.id_employee === params.value);
        return emp ? `${emp.empl_surname} ${emp.empl_name[0]}.` : params.value;
      }
    },
    { field: 'card_number', headerName: 'Карта', width: 130, renderCell: (params) => params.value || '—' },
    { 
      field: 'print_date', headerName: 'Дата', width: 180,
      renderCell: (params) => new Date(params.value).toLocaleString('uk-UA')
    },
    { 
      field: 'sum_total', headerName: 'Сума', width: 120,
      renderCell: (params) => `${Number(params.value).toFixed(2)} грн`
    },
    {
      field: 'actions', headerName: 'Дії', width: 100, sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton size="small" color="primary" onClick={() => handleOpenDetails(params.row.check_number)}>
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" color="error" onClick={() => { 
            setSelectedCheckNumber(params.row.check_number); 
            setDeleteDialogOpen(true); 
          }}>
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

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center', bgcolor: 'white', p: 2, borderRadius: 2 }}>
        <TextField
          select label="Касир" size="small" sx={{ width: 200 }}
          value={cashierFilter}
          onChange={(e) => setCashierFilter(e.target.value)}
        >
          <MenuItem value="">Всі касири</MenuItem>
          {cashiers.map((c) => (
            <MenuItem key={c.id_employee} value={c.id_employee}>
              {c.empl_surname} {c.empl_name}
            </MenuItem>
          ))}
        </TextField>
        
        <TextField
          label="З дати" type="date" size="small"
          InputLabelProps={{ shrink: true }}
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <TextField
          label="По дату" type="date" size="small"
          InputLabelProps={{ shrink: true }}
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
        
        <Button variant="outlined" onClick={() => { setCashierFilter(''); setDateFrom(''); setDateTo(''); }}>
          Скинути
        </Button>
      </Box>

      <Box sx={{ bgcolor: 'white', borderRadius: 2, overflow: 'hidden' }}>
        <DataGrid
          rows={checks}
          columns={columns}
          getRowId={(row) => row.check_number}
          loading={isLoading}
          autoHeight
          disableRowSelectionOnClick
        />
      </Box>

      <Dialog open={detailsDialogOpen} onClose={handleCloseDetails} maxWidth="sm" fullWidth>
        <DialogTitle>Чек №{selectedCheckNumber}</DialogTitle>
        <DialogContent dividers>
          {loadingDetails ? (
            <CircularProgress sx={{ display: 'block', mx: 'auto', my: 2 }} />
          ) : checkDetails ? (
            <Box>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Дата</Typography>
                  <Typography variant="body2">{new Date(checkDetails.print_date).toLocaleString('uk-UA')}</Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Карта</Typography>
                  <Typography variant="body2">{checkDetails.card_number || '—'}</Typography>
                </Box>
              </Box>
              
              <Typography variant="subtitle2" mb={1}>Товари:</Typography>
              <Box sx={{ bgcolor: '#fafafa', p: 1, borderRadius: 1 }}>
                {checkDetails.items?.map((item, idx) => (
                  <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                    <Typography variant="body2">UPC: {item.upc}</Typography>
                    <Typography variant="body2">{item.product_number} шт. x {item.selling_price} грн</Typography>
                  </Box>
                ))}
              </Box>

              <Box sx={{ mt: 2, textAlign: 'right' }}>
                <Typography variant="caption">ПДВ: {Number(checkDetails.vat).toFixed(2)} грн</Typography>
                <Typography variant="h6">Всього: {Number(checkDetails.sum_total).toFixed(2)} грн</Typography>
              </Box>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>Закрити</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Видалити чек?</DialogTitle>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Скасувати</Button>
          <Button color="error" variant="contained" onClick={() => selectedCheckNumber && deleteMutation.mutate(selectedCheckNumber)}>
            Видалити
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}