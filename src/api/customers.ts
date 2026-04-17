import apiClient from './client';
import { type CustomerCard } from '../types';

export interface CustomersQueryParams {
  surname?: string;
  percent?: number;
}

export const getCustomers = async (): Promise<CustomerCard[]> => {
  const { data } = await apiClient.get<CustomerCard[]>('/customer-cards');
  return data;
};

export const getCustomersSortedBySurname = async (): Promise<CustomerCard[]> => getCustomers();

export const searchCustomersBySurname = async (surname: string): Promise<CustomerCard[]> => {
  const { data } = await apiClient.get<CustomerCard[]>(
    `/customer-cards/search-by-surname/${encodeURIComponent(surname.trim())}`,
  );
  return data;
};

export const getCustomersByPercentSortedBySurname = async (percent: number): Promise<CustomerCard[]> => {
  const { data } = await apiClient.get<CustomerCard[]>(
    `/customer-cards/by-percent/${percent}/sorted-by-surname`,
  );
  return data;
};

export const getCustomersByQuery = async (params?: CustomersQueryParams): Promise<CustomerCard[]> => {
  if (params?.surname?.trim()) {
    return searchCustomersBySurname(params.surname);
  }
  if (params?.percent !== undefined) {
    return getCustomersByPercentSortedBySurname(params.percent);
  }
  return getCustomers();
};

export const createCustomer = async (customer: CustomerCard): Promise<CustomerCard> => {
  const { data } = await apiClient.post<CustomerCard>('/customer-cards', customer);
  return data;
};

export const updateCustomer = async (
  cardNumber: string,
  customer: Partial<CustomerCard>,
): Promise<CustomerCard> => {
  const { data } = await apiClient.put<CustomerCard>(`/customer-cards/${encodeURIComponent(cardNumber)}`, customer);
  return data;
};

export const deleteCustomer = async (cardNumber: string): Promise<void> => {
  await apiClient.delete(`/customer-cards/${encodeURIComponent(cardNumber)}`);
};
