import apiClient from './client';
import { type Check } from '../types'; 

export interface CreateCheckPayload {
  card_number?: string | null;
  items: {
    upc: string;
    quantity: number;
  }[];
}

export const getChecks = async (params?: { cashier?: string; from?: string; to?: string }): Promise<Check[]> => {
  const { data } = await apiClient.get('/checks', { params });
  return data;
};

export const getMyChecks = async (params?: { from?: string; to?: string }): Promise<Check[]> => {
  const { data } = await apiClient.get('/checks/my', { params });
  return data;
};

export const getCheckByNumber = async (number: string): Promise<Check> => {
  const { data } = await apiClient.get(`/checks/${number}`);
  return data;
};

export const createCheck = async (payload: CreateCheckPayload): Promise<Check> => {
  const { data } = await apiClient.post('/checks', payload);
  return data;
};

export const deleteCheck = async (number: string): Promise<void> => {
  await apiClient.delete(`/checks/${number}`);
};