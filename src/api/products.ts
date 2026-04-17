import apiClient from './client';
import { type Product } from '../types';

export interface ProductsQueryParams {
  category?: number;
  search?: string;
}

export const getProducts = async (): Promise<Product[]> => {
  const { data } = await apiClient.get<Product[]>('/products/sorted-by-name');
  return data;
};

export const getProductsSortedByName = async (): Promise<Product[]> => {
  const { data } = await apiClient.get<Product[]>('/products/sorted-by-name');
  return data;
};

export const getProductsByCategorySortedByName = async (categoryId: number): Promise<Product[]> => {
  const { data } = await apiClient.get<Product[]>(`/products/category/${categoryId}/sorted-by-name`);
  return data;
};

export const searchProductsByName = async (query: string): Promise<Product[]> => {
  const q = query.trim();
  const { data } = await apiClient.get<Product[]>(`/products/search/${encodeURIComponent(q)}`);
  return data;
};

export const getProductsByQuery = async (params?: ProductsQueryParams): Promise<Product[]> => {
  if (params?.category !== undefined) {
    return getProductsByCategorySortedByName(params.category);
  }
  if (params?.search?.trim()) {
    return searchProductsByName(params.search);
  }
  return getProductsSortedByName();
};

export const getProductById = async (id: number): Promise<Product> => {
  const { data } = await apiClient.get<Product>(`/products/${id}`);
  return data;
};

export const createProduct = async (product: Omit<Product, 'id_product'>): Promise<Product> => {
  const { data } = await apiClient.post<Product>('/products', product);
  return data;
};

export const updateProduct = async (id: number, product: Partial<Product>): Promise<Product> => {
  const { data } = await apiClient.put<Product>(`/products/${id}`, product);
  return data;
};

export const deleteProduct = async (id: number): Promise<void> => {
  await apiClient.delete(`/products/${id}`);
};
