import apiClient from './client';
import { type Category } from '../types';

export const getCategories = async (): Promise<Category[]> => {
  const { data } = await apiClient.get('/categories');
  return data;
};

export const createCategory = async (category: Omit<Category, 'category_number'>): Promise<Category> => {
  const { data } = await apiClient.post('/categories', category);
  return data;
};

export const updateCategory = async (id: number, category: Partial<Category>): Promise<Category> => {
  const { data } = await apiClient.put(`/categories/${id}`, category);
  return data;
};

export const deleteCategory = async (id: number): Promise<void> => {
  await apiClient.delete(`/categories/${id}`);
};