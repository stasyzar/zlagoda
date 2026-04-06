import { useState, useMemo } from 'react';
import {
  Box, Button, Typography, TextField, MenuItem,
  Card, CardContent, Divider, IconButton, Alert, CircularProgress, Autocomplete
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Add as AddIcon, Delete as DeleteIcon, Receipt as ReceiptIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { getStoreProducts } from '../../api/storeProducts';
import { getProducts } from '../../api/products';
import { getCustomerCards } from '../../api/customerCards';
import { createCheck } from '../../api/checks';

// Тип для елемента в кошику
interface CartItem {
  upc: string;
  product_name: string;
  price: number;
  quantity: number;
  max_quantity: number;
  is_promo: boolean;
}

// Тип для опцій у випадаючому списку пошуку товарів
interface ProductOption {
  label: string;
  upc: string;
  product_name: string;
  price: number;
  max_quantity: number;
  is_promo: boolean;
}

export default function CreateCheckPage() {
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Завантажуємо необхідні дані
  const { data: storeProducts = [], isLoading: loadingSP } = useQuery({ queryKey: ['store-products'], queryFn: getStoreProducts });
  const { data: products = [], isLoading: loadingP } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const { data: cards = [], isLoading: loadingCards } = useQuery({ queryKey: ['customer-cards'], queryFn: getCustomerCards });

  const createMutation = useMutation({
    mutationFn: createCheck,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-products'] }); // Оновлюємо залишки
      setCart([]);
      setSelectedCard(null);
      setSuccessMsg('Чек успішно створено!');
      setTimeout(() => setSuccessMsg(null), 3000);
    },
    onError: (err: unknown) => {
      if (err instanceof AxiosError) {
        setErrorMsg(err.response?.data?.message || 'Помилка при створенні чеку');
      } else {
        setErrorMsg('Помилка при створенні чеку');
      }
      setTimeout(() => setErrorMsg(null), 5000);
    }
  });

  // Об'єднуємо товари в магазині з їхніми назвами для зручного пошуку
  const availableProducts: ProductOption[] = useMemo(() => {
    return storeProducts
      .filter(sp => sp.products_number > 0)
      .map(sp => {
        const p = products.find(prod => prod.id_product === sp.id_product);
        return {
          label: `${p?.product_name || 'Невідомий товар'} (${sp.promotional_product ? 'Акція' : 'Звичайний'}) - ${sp.selling_price} грн`,
          upc: sp.UPC,
          product_name: p?.product_name || 'Невідомий товар',
          price: sp.selling_price,
          max_quantity: sp.products_number,
          is_promo: sp.promotional_product
        };
      });
  }, [storeProducts, products]);

  const addToCart = (product: ProductOption | null) => {
    if (!product) return;
    setCart(prev => {
      const existing = prev.find(item => item.upc === product.upc);
      if (existing) {
        if (existing.quantity >= existing.max_quantity) return prev; // Не більше ніж є на складі
        return prev.map(item => item.upc === product.upc ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, {
        upc: product.upc,
        product_name: product.product_name,
        price: product.price,
        quantity: 1,
        max_quantity: product.max_quantity,
        is_promo: product.is_promo
      }];
    });
  };

  const updateQuantity = (upc: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.upc === upc) {
        const newQ = item.quantity + delta;
        if (newQ > 0 && newQ <= item.max_quantity) {
          return { ...item, quantity: newQ };
        }
      }
      return item;
    }));
  };

  const removeFromCart = (upc: string) => {
    setCart(prev => prev.filter(item => item.upc !== upc));
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    createMutation.mutate({
      card_number: selectedCard || null,
      items: cart.map(item => ({ upc: item.upc, quantity: item.quantity }))
    });
  };

  // Розрахунки сум
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountPercent = selectedCard ? (cards.find(c => c.card_number === selectedCard)?.percent || 0) : 0;
  const discountAmount = subtotal * (discountPercent / 100);
  const total = subtotal - discountAmount;

  const columns: GridColDef[] = [
    { field: 'product_name', headerName: 'Товар', flex: 1 },
    { field: 'price', headerName: 'Ціна (грн)', width: 100 },
    {
      field: 'quantity', headerName: 'К-сть', width: 150, sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button size="small" variant="outlined" sx={{ minWidth: '30px', p: 0 }} onClick={() => updateQuantity(params.row.upc, -1)}>-</Button>
          <Typography>{params.value}</Typography>
          <Button size="small" variant="outlined" sx={{ minWidth: '30px', p: 0 }} onClick={() => updateQuantity(params.row.upc, 1)}>+</Button>
        </Box>
      ),
    },
    {
      field: 'sum', headerName: 'Сума', width: 100,
      renderCell: (params) => `${(params.row.price * params.row.quantity).toFixed(2)}`,
    },
    {
      field: 'actions', headerName: '', width: 60, sortable: false,
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
      {/* Ліва панель - Пошук і кошик */}
      <Box sx={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h5" fontWeight={600}>Новий продаж</Typography>
        
        {successMsg && <Alert severity="success">{successMsg}</Alert>}
        {errorMsg && <Alert severity="error">{errorMsg}</Alert>}

        <Autocomplete
          disablePortal
          options={availableProducts}
          isOptionEqualToValue={(option, value) => option.upc === value.upc}
          onChange={(_, newValue) => addToCart(newValue)}
          renderInput={(params) => <TextField {...params} label="Пошук товару (за назвою)" size="small" />}
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

      {/* Права панель - Оформлення */}
      <Box sx={{ flex: 1 }}>
        <Card sx={{ position: 'sticky', top: 20 }}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6" fontWeight="bold">Оформлення чеку</Typography>
            
            <TextField
              select label="Карта клієнта" fullWidth size="small"
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
            
            {selectedCard && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'success.main' }}>
                <Typography>Знижка ({discountPercent}%):</Typography>
                <Typography>-{discountAmount.toFixed(2)} грн</Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="h5" fontWeight="bold">До сплати:</Typography>
              <Typography variant="h5" fontWeight="bold" color="primary">{total.toFixed(2)} грн</Typography>
            </Box>

            <Button
              variant="contained" size="large" fullWidth
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