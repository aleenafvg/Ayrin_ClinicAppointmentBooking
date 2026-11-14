import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types';

export const SEEDED_USERS: User[] = [
  { id: 1, name: 'Aarav Sharma', email: 'aarav.sharma@clinic.test', role: 'PATIENT', createdAt: '2026-10-01T00:00:00.000Z' },
  { id: 2, name: 'Priya Patel', email: 'priya.patel@clinic.test', role: 'PATIENT', createdAt: '2026-10-01T00:00:00.000Z' },
  { id: 3, name: 'Rohan Gupta', email: 'rohan.gupta@clinic.test', role: 'PATIENT', createdAt: '2026-10-01T00:00:00.000Z' },
  { id: 4, name: 'Ananya Iyer', email: 'ananya.iyer@clinic.test', role: 'PATIENT', createdAt: '2026-10-01T00:00:00.000Z' },
  { id: 5, name: 'Deepak Verma', email: 'deepak.verma@clinic.test', role: 'RECEPTION', createdAt: '2026-10-01T00:00:00.000Z' },
  { id: 6, name: 'Sunita Rao', email: 'sunita.rao@clinic.test', role: 'RECEPTION', createdAt: '2026-10-01T00:00:00.000Z' },
];

interface UserContextValue {
  currentUser: User;
  availableUsers: User[];
  selectUserById: (id: number) => void;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

const STORAGE_KEY = 'ayrin_selected_user_id';

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_KEY);
      if (savedId) {
        const found = SEEDED_USERS.find((u) => u.id === Number(savedId));
        if (found) return found;
      }
    } catch {
      // Fallback if localStorage is inaccessible
    }
    return SEEDED_USERS[0];
  });

  const selectUserById = (id: number) => {
    const user = SEEDED_USERS.find((u) => u.id === id);
    if (user) {
      setCurrentUser(user);
      try {
        localStorage.setItem(STORAGE_KEY, String(user.id));
      } catch {
        // Ignore storage errors
      }
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(currentUser.id));
    } catch {
      // Ignore
    }
  }, [currentUser]);

  return (
    <UserContext.Provider value={{ currentUser, availableUsers: SEEDED_USERS, selectUserById }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextValue => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

