import apiClient from './client';
import { type CustomerCard } from '../types'; 
export const getCustomerCards = async (): Promise<CustomerCard[]> => {
  const { data } = await apiClient.get('/customer-cards');
  return data;
};

export const createCustomerCard = async (card: CustomerCard): Promise<CustomerCard> => {
  const { data } = await apiClient.post('/customer-cards', card);
  return data;
};

export const updateCustomerCard = async (cardNumber: string, card: Partial<CustomerCard>): Promise<CustomerCard> => {
  const { data } = await apiClient.put(`/customer-cards/${cardNumber}`, card);
  return data;
};

export const deleteCustomerCard = async (cardNumber: string): Promise<void> => {
  await apiClient.delete(`/customer-cards/${cardNumber}`);
};