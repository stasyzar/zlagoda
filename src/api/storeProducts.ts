import apiClient from './client';
import type {
  StoreProductCashierResponse,
  StoreProductEntity,
  StoreProductFullResponse,
  StoreProductListRow,
  StoreProductRequestPayload,
} from '../types';

export type StoreProductsListFilter = 'all' | 'promo' | 'regular';
export type StoreProductsSortMode = 'name' | 'quantity';

const encodePath = (q: string) => encodeURIComponent(q.trim());

function matchesStoreSearch(row: StoreProductListRow, q: string): boolean {
  const n = q.toLowerCase();
  return row.upc.toLowerCase().includes(n) || (row.product_name ?? '').toLowerCase().includes(n);
}

/** Список з бекенда (сортування лише на сервері). */
export const getStoreProductsList = async (
  listFilter: StoreProductsListFilter,
  sortMode: StoreProductsSortMode,
): Promise<StoreProductListRow[]> => {
  const byQuantity = sortMode === 'quantity';
  if (listFilter === 'promo') {
    const path = byQuantity
      ? '/store-products/promotional/sorted-by-quantity'
      : '/store-products/promotional/sorted-by-name';
    const { data } = await apiClient.get<StoreProductListRow[]>(path);
    return data;
  }
  if (listFilter === 'regular') {
    const path = byQuantity
      ? '/store-products/non-promotional/sorted-by-quantity'
      : '/store-products/non-promotional/sorted-by-name';
    const { data } = await apiClient.get<StoreProductListRow[]>(path);
    return data;
  }
  const path = byQuantity ? '/store-products/sorted-by-quantity' : '/store-products/sorted-by-name';
  const { data } = await apiClient.get<StoreProductListRow[]>(path);
  return data;
};

/**
 * Бекенд не має окремого search-ендпоінта: завантажуємо вже відсортований список і фільтруємо за UPC/назвою
 * без зміни порядку елементів.
 */
export const getStoreProductsSearch = async (
  query: string,
  listFilter: StoreProductsListFilter,
  sortMode: StoreProductsSortMode,
): Promise<StoreProductListRow[]> => {
  const list = await getStoreProductsList(listFilter, sortMode);
  const q = query.trim();
  if (!q) return list;
  return list.filter((row) => matchesStoreSearch(row, q));
};

export const getStoreProducts = async (): Promise<StoreProductListRow[]> =>
  getStoreProductsList('all', 'name');

/** Касир п.14: GET /store-products/{upc} */
export const getStoreProductCashierByUpc = async (upc: string): Promise<StoreProductCashierResponse> => {
  const { data } = await apiClient.get<StoreProductCashierResponse>(`/store-products/${encodePath(upc)}`);
  return data;
};

/** Менеджер: GET /store-products/{upc}/details */
export const getStoreProductManagerDetailsByUpc = async (upc: string): Promise<StoreProductFullResponse> => {
  const { data } = await apiClient.get<StoreProductFullResponse>(`/store-products/${encodePath(upc)}/details`);
  return data;
};

export const createStoreProduct = async (
  product: StoreProductRequestPayload,
): Promise<StoreProductEntity> => {
  const { data } = await apiClient.post<StoreProductEntity>('/store-products', product);
  return data;
};

export const updateStoreProduct = async (
  upc: string,
  product: StoreProductRequestPayload,
): Promise<StoreProductEntity> => {
  const { data } = await apiClient.put<StoreProductEntity>(`/store-products/${encodePath(upc)}`, product);
  return data;
};

export const deleteStoreProduct = async (upc: string): Promise<void> => {
  await apiClient.delete(`/store-products/${encodePath(upc)}`);
};

export const getProductTotalSold = async (upc: string, from: string, to: string): Promise<number> => {
  const { data } = await apiClient.get<number>(`/store-products/${encodePath(upc)}/total-sold`, {
    params: { from: `${from}T00:00:00`, to: `${to}T23:59:59` },
  });
  return data;
};
