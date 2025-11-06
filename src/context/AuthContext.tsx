'use client';
import { createContext, useContext, ReactNode } from 'react';

const AuthContext = createContext({ user: { uid: 'DUMMY_USER_ID' } as { uid: string } | null, loading: false });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  return <AuthContext.Provider value={{ user: { uid: 'DUMMY_USER_ID' }, loading: false }}>{children}</AuthContext.Provider>;
};
