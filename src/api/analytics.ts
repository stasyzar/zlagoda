import apiClient from './client';

export type AnalyticsRow = Record<string, unknown>;

export type AnalyticsReportType =
  | 'category-sales-volume'
  | 'vip-customers';

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

export const runAnalyticsReport = async (
  reportType: AnalyticsReportType,
  params: { from?: string; to?: string }
): Promise<AnalyticsRow[]> => {
  switch (reportType) {
    case 'category-sales-volume':
      return getCategorySalesVolume(params.from ?? '', params.to ?? '');
    case 'vip-customers':
      return getVipCustomers();
    default:
      return [];
  }
};
