import apiClient from './client';
import { type AuthUser } from '../types';

interface LoginResponse {
  token: string;
  role: string;
  id_employee: string;
}

export const loginRequest = async (
  idEmployee: string,
  password: string
): Promise<AuthUser> => {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', { idEmployee, password });
  const role = data.role === 'ROLE_MANAGER' ? 'Manager' : 'Cashier';
  return { id_employee: data.id_employee, role, token: data.token };
};
