import apiClient from './client';
import { type AuthUser } from '../types';

export const loginRequest = async (
  id: string,
  password: string
): Promise<AuthUser> => {
  const { data } = await apiClient.post('/auth/login', { id, password });
  return data;
};