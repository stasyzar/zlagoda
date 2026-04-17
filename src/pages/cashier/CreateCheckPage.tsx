import { useState, useMemo } from 'react';
import {
  Box, Button, Typography, TextField, MenuItem,
  Card, CardContent, Divider, IconButton, Alert, CircularProgress, Autocomplete, InputAdornment,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { Delete as DeleteIcon, Receipt as ReceiptIcon, QrCodeScanner as ScanIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStoreProductsList, getStoreProductCashierByUpc } from '../../api/storeProducts';
import { getProducts } from '../../api/products';
import { getCustomers } from '../../api/customers';
import { createCheck } from '../../api/checks';
import { getApiErrorMessage } from '../../utils/apiError';
import { MAX_UPC_LEN } from '../../utils/validation';

interface CartItem {
  upc: string;
  product_name: string;
  price: number;
  quantity: number;
  max_quantity: number;
  is_promo: boolean;
}

interface ProductOption {
  label: string;
  upc: string;
  product_name: string;
  price: number;
  max_quantity: number;
  is_promo: boolean;
}

function toProductOption(
  sp: { upc: string; id_product: number; selling_price: number; products_number: number; promotional_product: boolean },
  products: { id_product: number; product_name: string }[],
): ProductOption {
  const p = products.find((prod) => prod.id_product === sp.id_product);
  return {
    label: `${p?.product_name ?? 'Товар'} (${sp.promotional_product ? 'Акція' : 'Звичайний'}) — ${sp.selling_price} грн`,
    upc: sp.upc,
    product_name: p?.product_name ?? `Товар #${sp.id_product}`,
    price: Number(sp.selling_price),
    max_quantity: sp.products_number,
    is_promo: Boolean(sp.promotional_product),
  };
}

export default function CreateCheckPage() {
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [upcInput, setUpcInput] = useState('');
  const [upcBusy, setUpcBusy] = useState(false);

  const { data: storeProducts = [], isLoading: loadingSP } = useQuery({
    queryKey: ['store-products', 'create-check'],
    queryFn: () => getStoreProductsList('all', 'name'),
  });
  const { data: products = [], isLoading: loadingP } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const { data: cards = [], isLoading: loadingCards } = useQuery({ queryKey: ['customer-cards'], queryFn: getCustomers });

  const createMutation = useMutation({
    mutationFn: createCheck,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-products'] });
      setCart([]);
      setSelectedCard(null);
      setSuccessMsg('Чек успішно створено!');
      setTimeout(() => setSuccessMsg(null), 3000);
    },
    onError: (err: unknown) => {
      setErrorMsg(getApiErrorMessage(err, 'Помилка при створенні чеку'));
      setTimeout(() => setErrorMsg(null), 5000);
    },
  });

  const availableProducts: ProductOption[] = useMemo(() => {
    return storeProducts
      .filter((sp) => sp.products_number > 0)
      .map((sp) => toProductOption(sp, products));
  }, [storeProducts, products]);

  const addToCart = (product: ProductOption | null) => {
    if (!product) return;
    if (product.max_quantity <= 0) {
      setErrorMsg('Немає залишку на складі для цього UPC.');
      return;
    }
    setErrorMsg(null);
    setCart((prev) => {
      const existing = prev.find((item) => item.upc === product.upc);
      if (existing) {
        if (existing.quantity >= existing.max_quantity) return prev;
        return prev.map((item) =>
          item.upc === product.upc ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [
        ...prev,
        {
          upc: product.upc,
          product_name: product.product_name,
          price: product.price,
          quantity: 1,
          max_quantity: product.max_quantity,
          is_promo: product.is_promo,
        },
      ];
    });
  };

  const handleAddByUpc = async () => {
    const raw = upcInput.trim();
    setErrorMsg(null);
    if (!raw) {
      setErrorMsg('Введіть UPC.');
      return;
    }
    if (raw.length > MAX_UPC_LEN) {
      setErrorMsg(`UPC не довший за ${MAX_UPC_LEN} символів.`);
      return;
    }
    const fromList = storeProducts.find((s) => s.upc === raw);
    if (fromList) {
      if (fromList.products_number <= 0) {
        setErrorMsg('Немає залишку на складі.');
        return;
      }
      addToCart(toProductOption(fromList, products));
      setUpcInput('');
      return;
    }
    setUpcBusy(true);
    try {
      const sp = await getStoreProductCashierByUpc(raw);
      if (sp.products_number <= 0) {
        setErrorMsg('Немає залишку на складі.');
        return;
      }
      addToCart({
        label: raw,
        upc: sp.upc,
        product_name: `UPC ${sp.upc}`,
        price: Number(sp.selling_price),
        max_quantity: sp.products_number,
        is_promo: false,
      });
      setUpcInput('');
    } catch (e) {
      setErrorMsg(getApiErrorMessage(e, 'Товар за UPC не знайдено'));
    } finally {
      setUpcBusy(false);
    }
  };

  const updateQuantity = (upc: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.upc === upc) {
          const newQ = item.quantity + delta;
          if (newQ > 0 && newQ <= item.max_quantity) {
            return { ...item, quantity: newQ };
          }
        }
        return item;
      }),
    );
  };

  const removeFromCart = (upc: string) => {
    setCart((prev) => prev.filter((item) => item.upc !== upc));
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    createMutation.mutate({
      card_number: selectedCard || null,
      items: cart.map((item) => ({ upc: item.upc, quantity: item.quantity })),
    });
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountPercent = selectedCard ? cards.find((c) => c.card_number === selectedCard)?.percent ?? 0 : 0;
  const discountAmount = subtotal * (discountPercent / 100);
  const total = subtotal - discountAmount;
  /** ПДВ 20% від суми до сплати (вимога ТЗ / PDF). */
  const vatAmount = total * 0.2;

  const columns: GridColDef[] = [
    { field: 'upc', headerName: 'UPC', width: 130 },
    { field: 'product_name', headerName: 'Товар', flex: 1 },
    { field: 'price', headerName: 'Ціна (грн)', width: 100 },
    {
      field: 'quantity',
      headerName: 'К-сть',
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button size="small" variant="outlined" sx={{ minWidth: '30px', p: 0 }} onClick={() => updateQuantity(params.row.upc, -1)}>-</Button>
          <Typography>{params.value}</Typography>
          <Button size="small" variant="outlined" sx={{ minWidth: '30px', p: 0 }} onClick={() => updateQuantity(params.row.upc, 1)}>+</Button>
        </Box>
      ),
    },
    {
      field: 'sum',
      headerName: 'Сума',
      width: 100,
      renderCell: (params) => `${(params.row.price * params.row.quantity).toFixed(2)}`,
    },
    {
      field: 'actions',
      headerName: '',
      width: 60,
      sortable: false,
      renderCell: (params) => (
        <IconButton size="small" color="error" onClick={() => removeFromCart(params.row.upc)}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  if (loadingSP || loadingP || loadingCards) return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 5 }} />;

  return (
    <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' } }}>
      <Box sx={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h5" fontWeight={600}>Новий продаж</Typography>

        {successMsg ? <Alert severity="success">{successMsg}</Alert> : null}
        {errorMsg ? <Alert severity="error">{errorMsg}</Alert> : null}

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <TextField
            label="Сканування / ввід UPC"
            size="small"
            value={upcInput}
            onChange={(e) => setUpcInput(e.target.value.replace(/\s/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && void handleAddByUpc()}
            inputProps={{ maxLength: MAX_UPC_LEN }}
            sx={{ flex: 1, minWidth: 200, bgcolor: 'white' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <ScanIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
          />
          <Button variant="contained" onClick={() => void handleAddByUpc()} disabled={upcBusy}>
            Додати за UPC
          </Button>
        </Box>

        <Autocomplete
          disablePortal
          options={availableProducts}
          isOptionEqualToValue={(option, value) => option.upc === value.upc}
          onChange={(_, newValue) => addToCart(newValue)}
          renderInput={(params) => <TextField {...params} label="Або обери товар за назвою" size="small" />}
        />

        <Box sx={{ bgcolor: 'white', borderRadius: 2, overflow: 'hidden', height: 400 }}>
          <DataGrid
            rows={cart}
            columns={columns}
            getRowId={(row) => row.upc}
            hideFooter
            disableColumnMenu
          />
        </Box>
      </Box>

      <Box sx={{ flex: 1 }}>
        <Card sx={{ position: 'sticky', top: 20 }}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6" fontWeight="bold">Оформлення чеку</Typography>

            <TextField
              select
              label="Карта клієнта"
              fullWidth
              size="small"
              value={selectedCard || ''}
              onChange={(e) => setSelectedCard(e.target.value === '' ? null : e.target.value)}
            >
              <MenuItem value=""><em>Без карти</em></MenuItem>
              {cards.map((c) => (
                <MenuItem key={c.card_number} value={c.card_number}>
                  {c.cust_surname} {c.cust_name} ({c.percent}%)
                </MenuItem>
              ))}
            </TextField>

            <Divider />

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color="text.secondary">Підсумок:</Typography>
              <Typography>{subtotal.toFixed(2)} грн</Typography>
            </Box>

            {selectedCard ? (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'success.main' }}>
                <Typography>Знижка ({discountPercent}%):</Typography>
                <Typography>-{discountAmount.toFixed(2)} грн</Typography>
              </Box>
            ) : null}

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color="text.secondary">ПДВ (20% від суми до сплати):</Typography>
              <Typography>{vatAmount.toFixed(2)} грн</Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="h5" fontWeight="bold">До сплати:</Typography>
              <Typography variant="h5" fontWeight="bold" color="primary">{total.toFixed(2)} грн</Typography>
            </Box>

            <Button
              variant="contained"
              size="large"
              fullWidth
              startIcon={<ReceiptIcon />}
              onClick={handleCheckout}
              disabled={cart.length === 0 || createMutation.isPending}
              sx={{ mt: 2, height: 50 }}
            >
              {createMutation.isPending ? <CircularProgress size={24} color="inherit" /> : 'Пробити чек'}
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
