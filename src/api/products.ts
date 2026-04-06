import apiClient from './client';
import { type Product } from '../types';

export const getProducts = async (): Promise<Product[]> => {
  const { data } = await apiClient.get('/products');
  return data;
};

export const createProduct = async (product: Omit<Product, 'id_product'>): Promise<Product> => {
  const { data } = await apiClient.post('/products', product);
  return data;
};

export const updateProduct = async (id: number, product: Partial<Product>): Promise<Product> => {
  const { data } = await apiClient.put(`/products/${id}`, product);
  return data;
};

export const deleteProduct = async (id: number): Promise<void> => {
  await apiClient.delete(`/products/${id}`);
};