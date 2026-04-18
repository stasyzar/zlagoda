import apiClient from './client';
import { type Employee } from '../types';

export interface EmployeeCreatePayload extends Omit<Employee, 'id_employee' | 'check_count'> {
  id_employee: string;
  password: string;
}

export interface EmployeesQueryParams {
  role?: 'manager' | 'cashier';
  surname?: string;
}

export interface EmployeeContactInfo {
  id_employee: string;
  full_name: string;
  phone_number: string;
  address: string;
}

export interface CashierSalesReport {
  id_employee: string;
  empl_surname: string;
  empl_name: string;
  total_sum: number;
}

export const getEmployees = async (): Promise<Employee[]> => {
  const { data } = await apiClient.get<Employee[]>('/employees/sorted-by-surname');
  return data;
};

export const getEmployeesSortedBySurname = async (): Promise<Employee[]> => getEmployees();

export const getCashiersSortedBySurname = async (): Promise<Employee[]> => {
  const { data } = await apiClient.get<Employee[]>('/employees/cashiers/sorted-by-surname');
  return data;
};

/** Менеджер п.11: GET /employees/contacts/{surname} */
export const searchEmployeeContactsBySurname = async (surname: string): Promise<EmployeeContactInfo[]> => {
  const { data } = await apiClient.get<EmployeeContactInfo[]>(
    `/employees/contacts/${encodeURIComponent(surname.trim())}`,
  );
  return data;
};

/** Менеджер: пошук працівників за прізвищем у загальному переліку. */
export const searchEmployeesBySurname = async (surname: string): Promise<Employee[]> => {
  const { data } = await apiClient.get<Employee[]>(
    `/employees/search-by-surname/${encodeURIComponent(surname.trim())}`,
  );
  return data;
};

export const getEmployeesByQuery = async (params?: EmployeesQueryParams): Promise<Employee[]> => {
  if (params?.role === 'cashier') {
    return getCashiersSortedBySurname();
  }
  return getEmployeesSortedBySurname();
};

export const getCashiers = async (): Promise<Employee[]> => getCashiersSortedBySurname();

export const getMyEmployeeProfile = async (): Promise<Employee> => {
  const { data } = await apiClient.get<Employee>('/employees/me');
  return data;
};

export const getCashierSalesReport = async (
  id: string,
  from: string,
  to: string,
): Promise<CashierSalesReport> => {
  const { data } = await apiClient.get<Record<string, unknown>>(`/checks/sales-sum/by-cashier/${id}`, {
    params: { from: `${from}T00:00:00`, to: `${to}T23:59:59` },
  });
  const raw = data.total_sum ?? data.totalSum;
  return {
    id_employee: id,
    empl_surname: '',
    empl_name: '',
    total_sum: typeof raw === 'number' ? raw : Number(raw ?? 0),
  };
};

export const createEmployee = async (employee: EmployeeCreatePayload): Promise<Employee> => {
  const { data } = await apiClient.post<Employee>('/employees', employee);
  return data;
};

export const updateEmployee = async (id: string, employee: Partial<Employee>): Promise<Employee> => {
  const { data } = await apiClient.put<Employee>(`/employees/${id}`, employee);
  return data;
};

export const deleteEmployee = async (id: string): Promise<void> => {
  await apiClient.delete(`/employees/${id}`);
};
