import apiClient from './client';
import { type Employee } from '../types';

export const getEmployees = async (): Promise<Employee[]> => {
  const { data } = await apiClient.get('/employees');
  return data;
};

export const getEmployee = async (id: string): Promise<Employee> => {
  const { data } = await apiClient.get(`/employees/${id}`);
  return data;
};

export const createEmployee = async (employee: Omit<Employee, 'id_employee'>): Promise<Employee> => {
  const { data } = await apiClient.post('/employees', employee);
  return data;
};

export const updateEmployee = async (id: string, employee: Partial<Employee>): Promise<Employee> => {
  const { data } = await apiClient.put(`/employees/${id}`, employee);
  return data;
};

export const deleteEmployee = async (id: string): Promise<void> => {
  await apiClient.delete(`/employees/${id}`);
};