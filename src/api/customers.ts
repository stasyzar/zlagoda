import apiClient from './client';
import { type CustomerCard } from '../types';

export const getCustomers = async (): Promise<CustomerCard[]> => {
  const { data } = await apiClient.get('/customer-cards');
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