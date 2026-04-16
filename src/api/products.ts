import apiClient from './client';
import { type Product } from '../types';

export interface ProductsQueryParams {
  category?: number;
  search?: string;
}

export const getProducts = async (): Promise<Product[]> => {
  const { data } = await apiClient.get('/products/sorted-by-name');
  return data;
};

export const getProductsSortedByName = async (): Promise<Product[]> => {
  const { data } = await apiClient.get('/products/sorted-by-name');
  return data;
};

export const getProductsByCategorySortedByName = async (categoryId: number): Promise<Product[]> => {
  const { data } = await apiClient.get(`/products/by-category/${categoryId}/sorted-by-name`);
  return data;
};

export const searchProductsByName = async (query: string): Promise<Product[]> => {
  const { data } = await apiClient.get(`/products/search-by-name/${encodeURIComponent(query.trim())}`);
  return data;
};

export const getProductsByQuery = async (params?: ProductsQueryParams): Promise<Product[]> => {
  if (params?.category !== undefined) {
    const { data } = await apiClient.get(`/products/by-category/${params.category}/sorted-by-name`);
    return data;
  }
  if (params?.search) {
    const { data } = await apiClient.get(`/products/search-by-name/${encodeURIComponent(params.search)}`);
    return data;
  }
  const { data } = await apiClient.get('/products/sorted-by-name');
  return data;
};

export const getProductById = async (id: number): Promise<Product> => {
  const { data } = await apiClient.get(`/products/${id}`);
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