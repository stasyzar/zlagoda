import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { AppRole } from '../types';

interface Props {
  children: React.ReactElement;
  role?: AppRole;
}

export default function ProtectedRoute({ children, role }: Props) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/login" replace />;

  return children;
}