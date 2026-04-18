import apiClient from './client';

export type AnalyticsRow = Record<string, unknown>;

export type AnalyticsReportType =
  | 'category-sales-volume'
  | 'vip-customers'
  | 'loyal-category-fans'
  | 'top-products-premium'
  | 'purchasing-power'
  | 'base-basket';

function periodParams(from: string, to: string) {
  return {
    from: `${from}T00:00:00`,
    to: `${to}T23:59:59`,
  };
}

export const getCategorySalesVolume = async (from: string, to: string): Promise<AnalyticsRow[]> => {
  const { data } = await apiClient.get<AnalyticsRow[]>('/analytics/category-sales-volume', {
    params: periodParams(from, to),
  });
  return data;
};

export const getVipCustomers = async (): Promise<AnalyticsRow[]> => {
  const { data } = await apiClient.get<AnalyticsRow[]>('/analytics/vip-customers');
  return data;
};

export const getLoyalCategoryFans = async (categoryName: string): Promise<AnalyticsRow[]> => {
  const { data } = await apiClient.get<AnalyticsRow[]>('/analytics/loyal-category-fans', {
    params: { categoryName: categoryName.trim() },
  });
  return data;
};

export const getTopProductsPremium = async (): Promise<AnalyticsRow[]> => {
  const { data } = await apiClient.get<AnalyticsRow[]>('/analytics/top-products-premium');
  return data;
};

export const getPurchasingPowerByCity = async (city: string): Promise<AnalyticsRow[]> => {
  const { data } = await apiClient.get<AnalyticsRow[]>('/analytics/reports/purchasing-power', {
    params: { city: city.trim() },
  });
  return data;
};

export const getBaseBasket = async (): Promise<AnalyticsRow[]> => {
  const { data } = await apiClient.get<AnalyticsRow[]>('/analytics/base-basket');
  return data;
};

export const runAnalyticsReport = async (
  reportType: AnalyticsReportType,
  params: { from?: string; to?: string; categoryName?: string; city?: string },
): Promise<AnalyticsRow[]> => {
  switch (reportType) {
    case 'category-sales-volume':
      return getCategorySalesVolume(params.from ?? '', params.to ?? '');
    case 'vip-customers':
      return getVipCustomers();
    case 'loyal-category-fans':
      return getLoyalCategoryFans(params.categoryName ?? '');
    case 'top-products-premium':
      return getTopProductsPremium();
    case 'purchasing-power':
      return getPurchasingPowerByCity(params.city ?? '');
    case 'base-basket':
      return getBaseBasket();
    default:
      return [];
  }
};