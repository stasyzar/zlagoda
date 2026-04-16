import apiClient from './client';
import { type CustomerCard } from '../types';

export interface CustomersQueryParams {
  surname?: string;
  percent?: number;
  sort?: 'surname' | 'percent';
}

export const getCustomers = async (): Promise<CustomerCard[]> => {
  const { data } = await apiClient.get('/customer-cards/sorted-by-surname');
  return data;
};

export const getCustomersSortedBySurname = async (): Promise<CustomerCard[]> => {
  const { data } = await apiClient.get('/customer-cards/sorted-by-surname');
  return data;
};

export const getCustomersSortedByPercent = async (): Promise<CustomerCard[]> => {
  const { data } = await apiClient.get('/customer-cards/sorted-by-percent');
  return data;
};

export const searchCustomersBySurname = async (surname: string): Promise<CustomerCard[]> => {
  const { data } = await apiClient.get(`/customer-cards/search-by-surname/${encodeURIComponent(surname.trim())}`);
  return data;
};

export const getCustomersByPercentSortedBySurname = async (percent: number): Promise<CustomerCard[]> => {
  const { data } = await apiClient.get(`/customer-cards/by-percent/${percent}/sorted-by-surname`);
  return data;
};

export const getCustomersByQuery = async (params?: CustomersQueryParams): Promise<CustomerCard[]> => {
  if (params?.surname) {
    const { data } = await apiClient.get(`/customer-cards/search-by-surname/${encodeURIComponent(params.surname)}`);
    return data;
  }
  if (params?.percent !== undefined) {
    const { data } = await apiClient.get(`/customer-cards/by-percent/${params.percent}/sorted-by-surname`);
    return data;
  }
  if (params?.sort === 'percent') {
    const { data } = await apiClient.get('/customer-cards/sorted-by-percent');
    return data;
  }
  const { data } = await apiClient.get('/customer-cards/sorted-by-surname');
  return data;
};

export const createCustomer = async (customer: CustomerCard): Promise<CustomerCard> => {
  const { data } = await apiClient.post('/customer-cards', customer);
  return data;
};

export const updateCustomer = async (cardNumber: string, customer: Partial<CustomerCard>): Promise<CustomerCard> => {
  const { data } = await apiClient.put(`/customer-cards/${cardNumber}`, customer);
  return data;
};

export const deleteCustomer = async (cardNumber: string): Promise<void> => {
  await apiClient.delete(`/customer-cards/${cardNumber}`);
};