import apiClient from './client';
import { type Category } from '../types';

export const getCategories = async (): Promise<Category[]> => {
  const { data } = await apiClient.get<Category[]>('/categories');
  return data;
};

/** Пошук за назвою: окремого ендпоінта немає — фільтрація вже відсортованого списку на клієнті. */
export const getCategoriesByQuery = async (search?: string): Promise<Category[]> => {
  const { data } = await apiClient.get<Category[]>('/categories');
  const q = search?.trim().toLowerCase();
  if (!q) return data;
  return data.filter((c) => c.category_name.toLowerCase().includes(q));
};

export const createCategory = async (category: Omit<Category, 'category_number'>): Promise<Category> => {
  const { data } = await apiClient.post<Category>('/categories', category);
  return data;
};

export const updateCategory = async (id: number, category: Partial<Category>): Promise<Category> => {
  const { data } = await apiClient.put<Category>(`/categories/${id}`, category);
  return data;
};

export const deleteCategory = async (id: number): Promise<void> => {
  await apiClient.delete(`/categories/${id}`);
};
