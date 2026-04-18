import { useState } from 'react';
import {
  Box, Button, Typography, TextField, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Alert, CircularProgress, MenuItem, Chip, ToggleButton, ToggleButtonGroup, Tooltip,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Print as PrintIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import {
  getStoreProductsList,
  getStoreProductsSearch,
  getStoreProducts,
  createStoreProduct,
  updateStoreProduct,
  deleteStoreProduct,
} from '../../api/storeProducts';
import { getProducts } from '../../api/products';
import type { StoreProductListRow, StoreProductRequestPayload } from '../../types';
import { MAX_UPC_LEN } from '../../utils/validation';
import { openReportPreview } from '../../utils/reportPrint';
import { getApiErrorMessage } from '../../utils/apiError';

export default function StoreProductsPage() {
  const queryClient = useQueryClient();
  const [listFilter, setListFilter] = useState<'all' | 'promo' | 'regular'>('all');
  const [sortMode, setSortMode] = useState<'name' | 'quantity'>('name');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState<StoreProductListRow | null>(null);
  const [apiError, setApiError] = useState('');

  const { register, handleSubmit, reset, control, watch, formState: { errors } } = useForm<StoreProductListRow>();
  const watchIdProduct = watch('id_product');
  const watchPromo = watch('promotional_product');
  const idProductNum = typeof watchIdProduct === 'number' ? watchIdProduct : Number(watchIdProduct);

  function getFriendlyStoreProductError(err: unknown): string {
    const raw = getApiErrorMessage(err, 'Не вдалося зберегти товар у магазині.');
    const low = raw.toLowerCase();
    if (low.includes('акційна позиція для товару') && low.includes('вже існує')) {
      return raw;
    }
    if (low.includes('використовуйте upc')) {
      return raw;
    }
    if (low.includes('для цього продукту вже існує')) {
      return raw;
    }
    if (low.includes('upc') && low.includes('вже існує')) {
      return 'Такий UPC вже існує. Перевірте UPC або відкрийте існуючу позицію для редагування.';
    }
    if (low.includes('не знайдено')) {
      return 'Не вдалося знайти товар. Оновіть список і спробуйте ще раз.';
    }
    if (low.includes('пов’язані записи в базі даних') || low.includes("пов'язані записи в базі даних")) {
      return 'Цей UPC не можна використати для такої операції через конфлікт пов’язаних даних. Спробуйте інший UPC або відредагуйте існуючу позицію.';
    }
    return raw;
  }

  const { data: storeProducts = [], isLoading, error } = useQuery({
    queryKey: ['store-products-page', listFilter, sortMode, appliedSearch],
    queryFn: () => {
      const q = appliedSearch.trim();
      if (q) return getStoreProductsSearch(q, listFilter, sortMode);
      return getStoreProductsList(listFilter, sortMode);
    },
  });
  const { data: allStoreProducts = [] } = useQuery({
    queryKey: ['store-products-page', 'all-for-validation'],
    queryFn: () => getStoreProductsList('all', 'name'),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });
  const regularForCurrentProduct = allStoreProducts.find(
    (sp) => !sp.promotional_product && sp.id_product === idProductNum,
  );
  const creatingPromoWithKnownRegular = !selected && Boolean(watchPromo) && Boolean(regularForCurrentProduct);

  const createMutation = useMutation({
    mutationFn: createStoreProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-products'] });
      queryClient.invalidateQueries({ queryKey: ['store-products-page'] });
      handleClose();
    },
    onError: (err) => setApiError(getFriendlyStoreProductError(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ upc, data }: { upc: string; data: StoreProductRequestPayload }) => updateStoreProduct(upc, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-products'] });
      queryClient.invalidateQueries({ queryKey: ['store-products-page'] });
      handleClose();
    },
    onError: (err) => setApiError(getFriendlyStoreProductError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStoreProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-products'] });
      queryClient.invalidateQueries({ queryKey: ['store-products-page'] });
      setDeleteDialogOpen(false);
      setSelected(null);
    },
  });

  const applyFilters = () => {
    setApiError('');
    setAppliedSearch(searchInput.trim());
  };

  const handleOpen = (product?: StoreProductListRow) => {
    setApiError('');
    if (product) { setSelected(product); reset(product); }
    else { setSelected(null); reset({ promotional_product: false }); }
    setDialogOpen(true);
  };

  const handleClose = () => { setDialogOpen(false); setSelected(null); reset({}); };

  const onSubmit = async (data: StoreProductListRow) => {
    setApiError('');
    const isPromo = Boolean(data.promotional_product);
    const normalizedUpc = data.upc.trim();
    const normalizedProductId = Number(data.id_product);
    let validationList = allStoreProducts;
    try {
      validationList = await getStoreProductsList('all', 'name');
    } catch {
      // fallback to cached list
    }

    if (!selected) {
      const existingPromoForProduct = validationList.find(
        (sp) => sp.promotional_product && sp.id_product === normalizedProductId,
      );
      if (isPromo && existingPromoForProduct) {
        setApiError(
          `Акційна позиція для товару ${normalizedProductId} вже існує (UPC: ${existingPromoForProduct.upc})`,
        );
        return;
      }

      const occupiedByUpc = validationList.find((sp) => sp.upc === normalizedUpc);
      if (occupiedByUpc && !isPromo && occupiedByUpc.promotional_product) {
        setApiError(
          `Цей UPC (${normalizedUpc}) вже зайнятий акційною позицією. Для звичайного товару використайте інший UPC.`,
        );
        return;
      }
    }

    const promoNeedsManualPrice = isPromo && !selected && !regularForCurrentProduct;
    const payload: StoreProductRequestPayload = {
      upc: normalizedUpc,
      id_product: normalizedProductId,
      products_number: Number(data.products_number),
      promotional_product: isPromo,
      selling_price: promoNeedsManualPrice ? Number(data.selling_price) : (isPromo ? undefined : Number(data.selling_price)),
    };
    if (selected) updateMutation.mutate({ upc: selected.upc, data: payload });
    else createMutation.mutate(payload);
  };

  const handlePrintReport = () => {
    Promise.all([getStoreProducts(), getProducts()])
      .then(([reportRows, catalog]) => {
        openReportPreview(
          'Звіт: Товари у магазині',
          [
            { header: 'UPC', getValue: (p: StoreProductListRow) => p.upc },
            {
              header: 'Назва товару',
              getValue: (p: StoreProductListRow) =>
                p.product_name ?? catalog.find((x) => x.id_product === p.id_product)?.product_name ?? p.id_product,
            },
            { header: 'Ціна', getValue: (p: StoreProductListRow) => p.selling_price },
            { header: 'Кількість', getValue: (p: StoreProductListRow) => p.products_number },
            { header: 'Тип', getValue: (p: StoreProductListRow) => (p.promotional_product ? 'Акційний' : 'Звичайний') },
          ],
          reportRows,
          'Усі позиції, відсортовані за назвою товару (вимога звіту)',
        );
      })
      .catch(() => setApiError('Не вдалося сформувати звіт по товарах у магазині.'));
  };

  const columns: GridColDef[] = [
    { field: 'upc', headerName: 'UPC', width: 130, sortable: false, filterable: false },
    {
      field: 'id_product', headerName: 'Назва товару', flex: 1, sortable: false, filterable: false,
      renderCell: (params) =>
        params.row.product_name ?? products.find((p) => p.id_product === params.value)?.product_name ?? params.value,
    },
    {
      field: 'selling_price', headerName: 'Ціна', width: 100, sortable: false, filterable: false,
      renderCell: (params) => `${params.value} грн`,
    },
    { field: 'products_number', headerName: 'К-сть', width: 80, sortable: false, filterable: false },
    {
      field: 'upc_prom', headerName: 'Пара (UPC)', width: 140, sortable: false, filterable: false,
      renderCell: (params) => params.value || '—',
    },
    {
      field: 'promotional_product', headerName: 'Акція', width: 90, sortable: false, filterable: false,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Акційний' : 'Звичайний'}
          color={params.value ? 'warning' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'actions', headerName: 'Дії', width: 90, sortable: false, filterable: false,
      renderCell: (params) => {
        const sales = (params.row.sale_rows_count ?? 0) > 0;
        const regularBlockedByPromo =
          !params.row.promotional_product && Boolean(params.row.upc_prom);
        const deleteTitle = sales
          ? 'Неможливо видалити: цей UPC є в історії продажів'
          : regularBlockedByPromo
            ? 'Спочатку видаліть акційний UPC, прив’язаний до цієї звичайної позиції'
            : 'Видалити позицію з магазину';
        return (
          <Box>
            <IconButton size="small" onClick={() => handleOpen(params.row)}>
              <EditIcon fontSize="small" />
            </IconButton>
            <Tooltip title={deleteTitle}>
              <span>
                <IconButton
                  size="small"
                  color="error"
                  disabled={sales || regularBlockedByPromo}
                  onClick={() => {
                    deleteMutation.reset();
                    setSelected(params.row);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        );
      },
    },
  ];

  if (error) return <Alert severity="error">Помилка завантаження даних</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>Товари у магазині</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrintReport}>
            Звіт
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
            Додати
          </Button>
        </Box>
      </Box>

      {apiError ? <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert> : null}

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <ToggleButtonGroup
          value={listFilter}
          exclusive
          onChange={(_, val) => val && setListFilter(val)}
          size="small"
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
        >
          <ToggleButton value="name">За назвою</ToggleButton>
          <ToggleButton value="quantity">За кількістю</ToggleButton>
        </ToggleButtonGroup>
        <TextField
          placeholder="Пошук за назвою або UPC…"
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
        <Button variant="outlined" size="small" onClick={applyFilters}>
          Застосувати
        </Button>
      </Box>

      <Box sx={{ bgcolor: 'white', borderRadius: 2, overflow: 'hidden' }}>
        <DataGrid
          rows={storeProducts}
          columns={columns}
          getRowId={(row) => row.upc}
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

      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{selected ? 'Редагувати товар у магазині' : 'Новий товар у магазині'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {apiError && dialogOpen ? <Alert severity="error">{apiError}</Alert> : null}
            <TextField
              label="UPC" fullWidth size="small"
              disabled={!!selected}
              inputProps={{ maxLength: MAX_UPC_LEN }}
              {...register('upc', { required: "Обов'язкове поле", maxLength: MAX_UPC_LEN })}
              error={!!errors.upc}
              helperText={
                errors.upc?.message
                ?? (!selected && !watchPromo
                  ? 'Нова партія з новою ціною: якщо звичайний UPC цього товару вже є в магазині, вкажіть той самий UPC — кількість додасться, увесь залишок переоціниться на нову ціну.'
                  : undefined)
              }
            />
            <TextField
              select label="Товар" fullWidth size="small"
              defaultValue=""
              {...register('id_product', { required: "Обов'язкове поле" })}
              error={!!errors.id_product}
            >
              {products.map((p) => (
                <MenuItem key={p.id_product} value={p.id_product}>
                  {p.product_name}
                </MenuItem>
              ))}
            </TextField>
            {selected?.promotional_product ? (
              <TextField
                label="Ціна продажу (грн)"
                fullWidth
                size="small"
                type="number"
                value={selected.selling_price}
                disabled
                helperText="Для акційного UPC ціна лише від звичайного (×0.8), змінюється на бекенді"
              />
            ) : creatingPromoWithKnownRegular ? (
              <TextField
                label="Ціна продажу (грн)"
                fullWidth
                size="small"
                value={Number(regularForCurrentProduct!.selling_price * 0.8).toFixed(2)}
                disabled
                helperText="Для нового акційного UPC ціна буде розрахована автоматично від звичайного товару (×0.8)."
              />
            ) : (
              <TextField
                label="Ціна продажу (грн)" fullWidth size="small" type="number"
                {...register('selling_price', { required: "Обов'язкове поле", min: 0 })}
                error={!!errors.selling_price}
                helperText={watchPromo && !selected ? 'Для акційного товару без пари введіть ціну вручну.' : undefined}
              />
            )}
            <TextField
              label="Кількість одиниць" fullWidth size="small" type="number"
              {...register('products_number', { required: "Обов'язкове поле", min: 0 })}
              error={!!errors.products_number}
            />
            <Controller
              name="promotional_product"
              control={control}
              defaultValue={false}
              render={({ field }) => (
                <TextField
                  select label="Тип товару" fullWidth size="small"
                  value={field.value ? 'true' : 'false'}
                  onChange={(e) => field.onChange(e.target.value === 'true')}
                  disabled={!!selected}
                  helperText={
                    selected
                      ? 'Тип не змінюється після створення'
                      : 'Акційний: якщо є звичайний UPC, ціна рахується автоматично (×0.8). Якщо пари ще немає — введіть ціну вручну.'
                  }
                >
                  <MenuItem value="false">Звичайний</MenuItem>
                  <MenuItem value="true">Акційний</MenuItem>
                </TextField>
              )}
            />
            {!selected && watchPromo && !regularForCurrentProduct ? (
              <Alert severity="info">
                Для цього товару ще немає звичайної позиції в магазині. Ви можете створити акційну позицію, вказавши ціну вручну.
              </Alert>
            ) : null}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Скасувати</Button>
          <Button
            variant="contained"
            onClick={handleSubmit(onSubmit)}
            disabled={
              createMutation.isPending
              || updateMutation.isPending
            }
          >
            {createMutation.isPending || updateMutation.isPending
              ? <CircularProgress size={20} />
              : selected ? 'Зберегти' : 'Додати'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          deleteMutation.reset();
          setDeleteDialogOpen(false);
        }}
      >
        <DialogTitle>Видалити позицію з магазину?</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Видалити UPC <strong>{selected?.upc}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Якщо цей UPC зустрічається в історії продажів, видалити позицію не вийде. Звичайний UPC з прив’язаним
            акційним спочатку потрібно «розв’язати»: видаліть акційний UPC, потім звичайний (або змініть дані через API).
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
            onClick={() => selected && deleteMutation.mutate(selected.upc)}
            disabled={deleteMutation.isPending}
          >
            Видалити
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
