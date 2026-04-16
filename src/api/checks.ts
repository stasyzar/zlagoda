import apiClient from './client';
import { type Check } from '../types';

export interface CreateCheckPayload {
  card_number?: string | null;
  items: {
    upc: string;
    quantity: number;
  }[];
}

/** ISO date (yyyy-MM-dd) → початок/кінець дня для query params */
function periodParams(from: string, to: string) {
  return {
    from: `${from}T00:00:00`,
    to: `${to}T23:59:59`,
  };
}

/** Усі чеки менеджера, без обмеження періоду; порядок — бекенд (print_date DESC) */
export const getAllChecksSortedByPrintDateDesc = async (): Promise<Check[]> => {
  const { data } = await apiClient.get('/checks/all/sorted-by-print-date-desc');
  return data;
};

/** Усі чеки за період */
export const getAllChecksByPeriod = async (from: string, to: string): Promise<Check[]> => {
  const { data } = await apiClient.get('/checks/all/by-period', { params: periodParams(from, to) });
  return data;
};

/** Чеки конкретного касира без обмеження періоду */
export const getChecksByCashierSortedByPrintDateDesc = async (cashierId: string): Promise<Check[]> => {
  const { data } = await apiClient.get(`/checks/by-cashier/${cashierId}/sorted-by-print-date-desc`);
  return data;
};

/** Чеки конкретного касира за період */
export const getChecksByCashierAndPeriod = async (
  cashierId: string,
  from: string,
  to: string,
): Promise<Check[]> => {
  const { data } = await apiClient.get(`/checks/by-cashier/${cashierId}/by-period`, {
    params: periodParams(from, to),
  });
  return data;
};

/** Чеки поточного касира за сьогодні */
export const getMyChecksToday = async (): Promise<Check[]> => {
  const { data } = await apiClient.get('/checks/my/today');
  return data;
};

/** Чеки поточного касира за період */
export const getMyChecksByPeriod = async (from: string, to: string): Promise<Check[]> => {
  const { data } = await apiClient.get('/checks/my/by-period', { params: periodParams(from, to) });
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

export const getAllCashiersSalesSum = async (from: string, to: string): Promise<number> => {
  const { data } = await apiClient.get('/checks/sales-sum/all', {
    params: { from: `${from}T00:00:00`, to: `${to}T23:59:59` },
  });
  return Number(data.total_sum ?? data.totalSum ?? 0);
};
