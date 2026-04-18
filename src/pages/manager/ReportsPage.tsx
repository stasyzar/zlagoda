import { useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getEmployeesByQuery, getCashierSalesReport, type CashierSalesReport } from '../../api/employees';
import { getAllCashiersSalesSum } from '../../api/checks';
import { getProductTotalSold } from '../../api/storeProducts';
import { runAnalyticsReport, type AnalyticsReportType, type AnalyticsRow } from '../../api/analytics';
import { getCategories } from '../../api/categories';
import { getCustomers } from '../../api/customers';
import { openReportPreview } from '../../utils/reportPrint';
import { getApiErrorMessage } from '../../utils/apiError';
import { type Category, type Employee } from '../../types';

interface AnalyticsReportOption {
  id: AnalyticsReportType;
  title: string;
  description: string;
  params: Array<'period' | 'categoryName' | 'city'>;
}

const ANALYTICS_OPTIONS: AnalyticsReportOption[] = [
  {
    id: 'category-sales-volume',
    title: 'Обсяг реалізації за категоріями товарів',
    description: 'Сумарна кількість проданих одиниць по кожній категорії за обраний період.',
    params: ['period'],
  },
  {
    id: 'vip-customers',
    title: 'Клієнти з охопленням усіх категорій асортименту',
    description: 'Постійні клієнти, які мають покупки з кожної наявної категорії.',
    params: [],
  },
  {
    id: 'loyal-category-fans',
    title: 'Повне охоплення асортименту категорії клієнтами',
    description: 'Постійні клієнти, які придбали всі товарні позиції обраної категорії, наявні в продажі.',
    params: ['categoryName'],
  },
  {
    id: 'top-products-premium',
    title: 'Топ товарів за виручкою (знижка клієнта від 10%)',
    description: 'До трьох позицій із найбільшою сумарною виручкою серед чеків клієнтів із персональною знижкою не менше 10%.',
    params: [],
  },
  {
    id: 'purchasing-power',
    title: 'Оборот і чеки постійних клієнтів за містом',
    description: 'Кількість чеків і сума покупок по кожному постійному клієнту для вказаного міста реєстрації.',
    params: ['city'],
  },
  {
    id: 'base-basket',
    title: 'Універсальні товари для постійних клієнтів',
    description: 'Товари, які придбали всі постійні клієнти (перетин асортименту).',
    params: [],
  },
];

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (typeof value === 'boolean') return value ? 'Так' : 'Ні';
  if (typeof value === 'string') return value;
  return String(value);
}

function toHeaderLabel(key: string): string {
  return key
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

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
  const [analyticsReport, setAnalyticsReport] = useState<AnalyticsReportType>('category-sales-volume');
  const [analyticsCategoryName, setAnalyticsCategoryName] = useState('');
  const [analyticsCity, setAnalyticsCity] = useState('');
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsRows, setAnalyticsRows] = useState<AnalyticsRow[]>([]);
  const [analyticsError, setAnalyticsError] = useState('');
  const [analyticsInfo, setAnalyticsInfo] = useState('');

  const { data: cashiers = [], error: cashiersError } = useQuery({
    queryKey: ['employees', 'cashiers', 'reports'],
    queryFn: () => getEmployeesByQuery({ role: 'cashier' }),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', 'reports-analytics'],
    queryFn: getCategories,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customer-cards', 'reports-analytics-cities'],
    queryFn: getCustomers,
  });

  const cashierOptions = useMemo(
    () => cashiers.map((c: Employee) => ({ id: c.id_employee, label: `${c.empl_surname} ${c.empl_name}` })),
    [cashiers],
  );

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.category_name.localeCompare(b.category_name, 'uk')),
    [categories],
  );

  const cityOptions = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => {
      const city = c.city?.trim();
      if (city) set.add(city);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'uk'));
  }, [customers]);

  const selectedCategory = useMemo(
    () => sortedCategories.find((c) => c.category_name === analyticsCategoryName) ?? null,
    [sortedCategories, analyticsCategoryName],
  );

  const selectedAnalyticsOption = useMemo(
    () => ANALYTICS_OPTIONS.find((option) => option.id === analyticsReport) ?? ANALYTICS_OPTIONS[0],
    [analyticsReport],
  );

  const analyticsColumns = useMemo(() => {
    const keys = new Set<string>();
    analyticsRows.forEach((row) => {
      Object.keys(row).forEach((key) => keys.add(key));
    });
    return Array.from(keys);
  }, [analyticsRows]);

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

  const validateAnalyticsParams = () => {
    if (selectedAnalyticsOption.params.includes('period')) {
      if (!from || !to) {
        setAnalyticsError('Для цього звіту обери період у блоці «Період звітності» (дата від та дата до).');
        return false;
      }
      if (from > to) {
        setAnalyticsError('Дата "від" не може бути більшою за дату "до".');
        return false;
      }
    }

    if (selectedAnalyticsOption.params.includes('categoryName') && !analyticsCategoryName.trim()) {
      setAnalyticsError('Оберіть категорію зі списку.');
      return false;
    }

    if (selectedAnalyticsOption.params.includes('city') && !analyticsCity.trim()) {
      setAnalyticsError('Оберіть місто зі списку або введіть назву вручну.');
      return false;
    }

    setAnalyticsError('');
    return true;
  };

  const runAnalytics = async () => {
    setAnalyticsInfo('');
    if (!validateAnalyticsParams()) return;

    try {
      setAnalyticsLoading(true);
      const rows = await runAnalyticsReport(analyticsReport, {
        from,
        to,
        categoryName: analyticsCategoryName,
        city: analyticsCity,
      });
      setAnalyticsRows(rows);
      if (rows.length === 0) {
        setAnalyticsInfo('За вказаними умовами дані відсутні.');
      }
      setAnalyticsError('');
    } catch (e) {
      setAnalyticsRows([]);
      setAnalyticsError(getApiErrorMessage(e, 'Не вдалося сформувати аналітичний звіт.'));
    } finally {
      setAnalyticsLoading(false);
    }
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
      const selectedCashier = cashiers.find((c: Employee) => c.id_employee === cashierId);
      setCashierReport(result);
      if (selectedCashier) {
        setCashierReport({
          ...result,
          empl_surname: selectedCashier.empl_surname,
          empl_name: selectedCashier.empl_name,
        });
      }
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
        <Typography variant="h6" fontWeight={600} mb={2}>Аналітика</Typography>

        {analyticsError && <Alert severity="error" sx={{ mb: 2 }}>{analyticsError}</Alert>}
        {analyticsInfo && <Alert severity="info" sx={{ mb: 2 }}>{analyticsInfo}</Alert>}

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          <TextField
            select
            label="Аналітичний звіт"
            value={analyticsReport}
            onChange={(e) => {
              const next = e.target.value as AnalyticsReportType;
              const nextOpt = ANALYTICS_OPTIONS.find((o) => o.id === next) ?? ANALYTICS_OPTIONS[0];
              setAnalyticsReport(next);
              setAnalyticsRows([]);
              setAnalyticsError('');
              setAnalyticsInfo('');
              if (!nextOpt.params.includes('categoryName')) setAnalyticsCategoryName('');
              if (!nextOpt.params.includes('city')) setAnalyticsCity('');
            }}
            sx={{ minWidth: 420 }}
          >
            {ANALYTICS_OPTIONS.map((option) => (
              <MenuItem key={option.id} value={option.id}>{option.title}</MenuItem>
            ))}
          </TextField>
          <Button variant="contained" onClick={runAnalytics} disabled={analyticsLoading}>
            {analyticsLoading ? 'Формується...' : 'Сформувати'}
          </Button>
        </Box>

        <Typography variant="body2" color="text.secondary" mb={2}>
          {selectedAnalyticsOption.description}
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2, alignItems: 'flex-start' }}>
          {selectedAnalyticsOption.params.includes('categoryName') && (
            <Autocomplete<Category>
              options={sortedCategories}
              getOptionLabel={(option) => option.category_name}
              value={selectedCategory}
              onChange={(_, value) => {
                setAnalyticsCategoryName(value?.category_name ?? '');
              }}
              isOptionEqualToValue={(a, b) => a.category_number === b.category_number}
              sx={{ minWidth: 320, maxWidth: '100%' }}
              renderInput={(params) => (
                <TextField {...params} label="Категорія" placeholder="Почніть вводити назву…" />
              )}
            />
          )}

          {selectedAnalyticsOption.params.includes('city') && (
            <Autocomplete
              freeSolo
              options={cityOptions}
              value={analyticsCity}
              onChange={(_, newValue) => setAnalyticsCity(newValue ?? '')}
              inputValue={analyticsCity}
              onInputChange={(_, newInputValue) => setAnalyticsCity(newInputValue)}
              sx={{ minWidth: 320, maxWidth: '100%' }}
              renderInput={(params) => (
                <TextField {...params} label="Місто" placeholder="Оберіть або введіть назву…" />
              )}
            />
          )}
        </Box>

        {analyticsRows.length > 0 && (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  {analyticsColumns.map((column) => (
                    <TableCell key={column} sx={{ fontWeight: 600 }}>
                      {toHeaderLabel(column)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {analyticsRows.map((row, rowIndex) => (
                  <TableRow key={`${rowIndex}-${analyticsColumns.map((col) => String(row[col] ?? '')).join('-')}`}>
                    {analyticsColumns.map((column) => (
                      <TableCell key={column}>{formatCellValue(row[column])}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
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
