import apiClient from './client';
import { type StoreProduct } from '../types';

export const getStoreProducts = async (): Promise<StoreProduct[]> => {
  const { data } = await apiClient.get('/store-products');
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