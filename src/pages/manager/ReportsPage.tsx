import { useMemo, useState } from 'react';
import { Alert, Box, Button, MenuItem, Paper, TextField, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getEmployeesByQuery, getCashierSalesReport, type CashierSalesReport } from '../../api/employees';
import { getAllCashiersSalesSum } from '../../api/checks';
import { getProductTotalSold } from '../../api/storeProducts';
import { openReportPreview } from '../../utils/reportPrint';
import { type Employee } from '../../types';

export default function ReportsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [cashierId, setCashierId] = useState('');
  const [upc, setUpc] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState<'cashier' | 'all' | 'product' | ''>('');
  const [cashierReport, setCashierReport] = useState<CashierSalesReport | null>(null);
  const [allCashiersSum, setAllCashiersSum] = useState<number | null>(null);
  const [productTotal, setProductTotal] = useState<number | null>(null);

  const { data: cashiers = [], error: cashiersError } = useQuery({
    queryKey: ['employees', 'cashiers', 'reports'],
    queryFn: () => getEmployeesByQuery({ role: 'cashier' }),
  });

  const cashierOptions = useMemo(
    () => cashiers.map((c: Employee) => ({ id: c.id_employee, label: `${c.empl_surname} ${c.empl_name}` })),
    [cashiers],
  );

  const validateRange = () => {
    setInfo('');
    if (!from || !to) {
      setError('Обери період: дата від та дата до.');
      return false;
    }
    if (from > to) {
      setError('Дата "від" не може бути більшою за дату "до".');
      return false;
    }
    setError('');
    return true;
  };

  const loadCashierReport = async () => {
    if (!validateRange()) return;
    if (!cashierId) {
      setError('Обери касира.');
      return;
    }
    try {
      setLoading('cashier');
      const result = await getCashierSalesReport(cashierId, from, to);
      setCashierReport(result);
      setError('');
      if (Number(result.total_sum) === 0) {
        setInfo('За обраний період у цього касира не знайдено продажів.');
      }
    } catch {
      setError('Не вдалося отримати звіт по касиру. Перевір права доступу та період.');
    } finally {
      setLoading('');
    }
  };

  const loadAllCashiersReport = async () => {
    if (!validateRange()) return;
    try {
      setLoading('all');
      const sum = await getAllCashiersSalesSum(from, to);
      setAllCashiersSum(sum);
      setError('');
      if (sum === 0) {
        setInfo('За обраний період не знайдено чеків.');
      }
    } catch {
      setError('Не вдалося отримати загальний звіт по касирах.');
    } finally {
      setLoading('');
    }
  };

  const loadProductReport = async () => {
    if (!validateRange()) return;
    if (!upc.trim()) {
      setError('Вкажи UPC товару.');
      return;
    }
    try {
      setLoading('product');
      const result = await getProductTotalSold(upc.trim(), from, to);
      setProductTotal(result);
      setError('');
      if (result === 0) {
        setInfo('За обраний період цей товар не продавався.');
      }
    } catch {
      setError('Не вдалося отримати звіт по UPC. Перевір UPC та період.');
    } finally {
      setLoading('');
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} mb={3}>Звіти</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {info && <Alert severity="info" sx={{ mb: 2 }}>{info}</Alert>}
      {cashiersError && <Alert severity="warning" sx={{ mb: 2 }}>Не вдалося завантажити список касирів.</Alert>}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} mb={2}>Період звітності</Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField label="Від" type="date" value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField label="До" type="date" value={to} onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
        </Box>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} mb={2}>1) Сума продажів конкретного касира за період</Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            select
            label="Касир"
            value={cashierId}
            onChange={(e) => setCashierId(e.target.value)}
            sx={{ minWidth: 280 }}
          >
            {cashierOptions.map((c) => <MenuItem key={c.id} value={c.id}>{c.label}</MenuItem>)}
          </TextField>
          <Button variant="contained" onClick={loadCashierReport} disabled={loading === 'cashier'}>
            {loading === 'cashier' ? 'Завантаження...' : 'Побудувати'}
          </Button>
          {cashierReport && (
            <Button
              variant="outlined"
              onClick={() => {
                const opened = openReportPreview(
                  'Звіт: Сума продажів касира за період',
                  [
                    { header: 'ID касира', getValue: (r: CashierSalesReport) => r.id_employee },
                    { header: 'Прізвище', getValue: (r: CashierSalesReport) => r.empl_surname },
                    { header: "Ім'я", getValue: (r: CashierSalesReport) => r.empl_name },
                    { header: 'Загальна сума продажів', getValue: (r: CashierSalesReport) => Number(r.total_sum).toFixed(2) },
                  ],
                  [cashierReport],
                  `Період: ${from} - ${to}`,
                );
                if (!opened) setError('Браузер заблокував pop-up для попереднього перегляду. Дозволь pop-up для цього сайту.');
              }}
            >
              Попередній перегляд
            </Button>
          )}
        </Box>
        {cashierReport && <Typography mt={1}>Сума: {Number(cashierReport.total_sum).toFixed(2)} грн</Typography>}
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} mb={2}>2) Сума продажів усіх касирів за період</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button variant="contained" onClick={loadAllCashiersReport} disabled={loading === 'all'}>
            {loading === 'all' ? 'Завантаження...' : 'Побудувати'}
          </Button>
          {allCashiersSum !== null && (
            <Button
              variant="outlined"
              onClick={() => {
                const opened = openReportPreview(
                  'Звіт: Сума продажів усіх касирів',
                  [{ header: 'Загальна сума продажів', getValue: () => allCashiersSum.toFixed(2) }],
                  [{}],
                  `Період: ${from} - ${to}`,
                );
                if (!opened) setError('Браузер заблокував pop-up для попереднього перегляду. Дозволь pop-up для цього сайту.');
              }}
            >
              Попередній перегляд
            </Button>
          )}
        </Box>
        {allCashiersSum !== null && <Typography mt={1}>Сума: {allCashiersSum.toFixed(2)} грн</Typography>}
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} mb={2}>3) Кількість проданих одиниць товару (за UPC) за період</Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField label="UPC" value={upc} onChange={(e) => setUpc(e.target.value)} />
          <Button variant="contained" onClick={loadProductReport} disabled={loading === 'product'}>
            {loading === 'product' ? 'Завантаження...' : 'Побудувати'}
          </Button>
          {productTotal !== null && (
            <Button
              variant="outlined"
              onClick={() => {
                const opened = openReportPreview(
                  'Звіт: Продані одиниці товару за UPC',
                  [
                    { header: 'UPC', getValue: () => upc },
                    { header: 'Кількість проданих одиниць', getValue: () => productTotal },
                  ],
                  [{}],
                  `Період: ${from} - ${to}`,
                );
                if (!opened) setError('Браузер заблокував pop-up для попереднього перегляду. Дозволь pop-up для цього сайту.');
              }}
            >
              Попередній перегляд
            </Button>
          )}
        </Box>
        {productTotal !== null && <Typography mt={1}>Кількість: {productTotal} шт.</Typography>}
      </Paper>

    </Box>
  );
}
