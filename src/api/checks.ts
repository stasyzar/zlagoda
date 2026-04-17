import apiClient from './client';
import type { Check, CheckDetails } from '../types';

export interface CreateCheckPayload {
  card_number?: string | null;
  items: {
    upc: string;
    quantity: number;
  }[];
}

function periodParams(from: string, to: string) {
  return {
    from: `${from}T00:00:00`,
    to: `${to}T23:59:59`,
  };
}

export const getAllChecksByPeriod = async (from: string, to: string): Promise<Check[]> => {
  const { data } = await apiClient.get<Check[]>('/checks/all/by-period', { params: periodParams(from, to) });
  return data;
};

export const getChecksByCashierAndPeriod = async (
  cashierId: string,
  from: string,
  to: string,
): Promise<Check[]> => {
  const { data } = await apiClient.get<Check[]>(`/checks/by-cashier/${cashierId}/by-period`, {
    params: periodParams(from, to),
  });
  return data;
};

export const getMyChecksToday = async (): Promise<Check[]> => {
  const { data } = await apiClient.get<Check[]>('/checks/my/today');
  return data;
};

export const getMyChecksByPeriod = async (from: string, to: string): Promise<Check[]> => {
  const { data } = await apiClient.get<Check[]>('/checks/my/by-period', { params: periodParams(from, to) });
  return data;
};

export const getCheckByNumber = async (number: string): Promise<CheckDetails> => {
  const { data } = await apiClient.get<CheckDetails>(`/checks/${number}`);
  return data;
};

export const createCheck = async (payload: CreateCheckPayload): Promise<CheckDetails> => {
  const { data } = await apiClient.post<CheckDetails>('/checks', payload);
  return data;
};

export const deleteCheck = async (number: string): Promise<void> => {
  await apiClient.delete(`/checks/${number}`);
};

export const getAllCashiersSalesSum = async (from: string, to: string): Promise<number> => {
  const { data } = await apiClient.get<Record<string, unknown>>('/checks/sales-sum/all', {
    params: { from: `${from}T00:00:00`, to: `${to}T23:59:59` },
  });
  const raw = data.total_sum ?? data.totalSum;
  return typeof raw === 'number' ? raw : Number(raw ?? 0);
};
