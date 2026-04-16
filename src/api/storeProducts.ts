import apiClient from './client';
import { type StoreProduct } from '../types';

export type StoreProductsListFilter = 'all' | 'promo' | 'regular';
export type StoreProductsSortMode = 'name' | 'quantity';

const encodePath = (q: string) => encodeURIComponent(q.trim());

/** Один запит = один endpoint: список без пошуку */
export const getStoreProductsList = async (
  listFilter: StoreProductsListFilter,
  sortMode: StoreProductsSortMode,
): Promise<StoreProduct[]> => {
  const byQuantity = sortMode === 'quantity';
  if (listFilter === 'promo') {
    const path = byQuantity
      ? '/store-products/promotional/sorted-by-quantity'
      : '/store-products/promotional/sorted-by-name';
    const { data } = await apiClient.get(path);
    return data;
  }
  if (listFilter === 'regular') {
    const path = byQuantity
      ? '/store-products/non-promotional/sorted-by-quantity'
      : '/store-products/non-promotional/sorted-by-name';
    const { data } = await apiClient.get(path);
    return data;
  }
  const path = byQuantity ? '/store-products/sorted-by-quantity' : '/store-products/sorted-by-name';
  const { data } = await apiClient.get(path);
  return data;
};

/** Один запит = один endpoint: пошук за фрагментом назви або UPC */
export const getStoreProductsSearch = async (
  query: string,
  listFilter: StoreProductsListFilter,
  sortMode: StoreProductsSortMode,
): Promise<StoreProduct[]> => {
  const enc = encodePath(query);
  const byQuantity = sortMode === 'quantity';
  const sortSeg = byQuantity ? 'sorted-by-quantity' : 'sorted-by-name';
  if (listFilter === 'promo') {
    const { data } = await apiClient.get(
      `/store-products/promotional/search-by-name-or-upc/${enc}/${sortSeg}`,
    );
    return data;
  }
  if (listFilter === 'regular') {
    const { data } = await apiClient.get(
      `/store-products/non-promotional/search-by-name-or-upc/${enc}/${sortSeg}`,
    );
    return data;
  }
  const { data } = await apiClient.get(`/store-products/search-by-name-or-upc/${enc}/${sortSeg}`);
  return data;
};

export const getStoreProducts = async (): Promise<StoreProduct[]> => {
  const { data } = await apiClient.get('/store-products/sorted-by-name');
  return data;
};

export const createStoreProduct = async (product: StoreProduct): Promise<StoreProduct> => {
  const { data } = await apiClient.post('/store-products', product);
  return data;
};

export const updateStoreProduct = async (upc: string, product: Partial<StoreProduct>): Promise<StoreProduct> => {
  const { data } = await apiClient.put(`/store-products/${upc}`, product);
  return data;
};

export const deleteStoreProduct = async (upc: string): Promise<void> => {
  await apiClient.delete(`/store-products/${upc}`);
};

export const getProductTotalSold = async (upc: string, from: string, to: string): Promise<number> => {
  const { data } = await apiClient.get<number>(`/store-products/${upc}/total-sold`, {
    params: { from: `${from}T00:00:00`, to: `${to}T23:59:59` },
  });
  return data;
};
