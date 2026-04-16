import apiClient from './client';

export type AdvancedRow = Record<string, string | number | boolean | null>;

const asDateTimeParams = (from: string, to: string) => ({
  from: `${from}T00:00:00`,
  to: `${to}T23:59:59`,
});

export const q1Member1GroupingByCategory = async (from: string, to: string): Promise<AdvancedRow[]> => {
  const { data } = await apiClient.get('/categories/sales/by-period', {
    params: asDateTimeParams(from, to),
  });
  return data;
};

export const q2Member1DoubleNegationByCategory = async (categoryId: number): Promise<AdvancedRow[]> => {
  const { data } = await apiClient.get(`/customer-cards/bought-all-products-in-category/${categoryId}`);
  return data;
};

export const q3Member2GroupingPromoSales = async (from: string, to: string): Promise<AdvancedRow[]> => {
  const { data } = await apiClient.get('/employees/promo-sales/by-period', {
    params: asDateTimeParams(from, to),
  });
  return data;
};

export const q4Member2DoubleNegationCashiersByCategory = async (categoryId: number): Promise<AdvancedRow[]> => {
  const { data } = await apiClient.get(`/employees/sold-all-products-in-category/${categoryId}`);
  return data;
};

export const q5Member3GroupingByProducer = async (from: string, to: string): Promise<AdvancedRow[]> => {
  const { data } = await apiClient.get('/products/producers/sales/by-period', {
    params: asDateTimeParams(from, to),
  });
  return data;
};

export const q6Member3DoubleNegationCardsByCashier = async (
  cashierId: string,
  from: string,
  to: string,
): Promise<AdvancedRow[]> => {
  const { data } = await apiClient.get(`/customer-cards/covering-cashier-upcs/${cashierId}`, {
    params: asDateTimeParams(from, to),
  });
  return data;
};
