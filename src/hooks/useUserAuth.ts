import { useState, useEffect, useCallback } from 'react';
import type { CitizenUser, UserAuthState } from '../types/userAuth';

const USERS_STORAGE_KEY = 'drishti_citizen_users_v1';
const SESSION_STORAGE_KEY = 'drishti_citizen_session_v1';

// Helper: Cryptographically secure password hashing using Web Crypto API SHA-256
const generateSalt = (): string => {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

const hashPassword = async (password: string, salt: string): Promise<string> => {
  const enc = new TextEncoder();
  const data = enc.encode(password + salt);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const getStoredUsers = (): CitizenUser[] => {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveStoredUsers = (users: CitizenUser[]) => {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.warn('Failed to save citizen users to local storage:', e);
  }
};

const getStoredSession = (): { user: CitizenUser | null; isGuest: boolean; hasVisitedBefore: boolean } => {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // fallback
  }
  return { user: null, isGuest: false, hasVisitedBefore: false };
};

const saveStoredSession = (session: { user: CitizenUser | null; isGuest: boolean; hasVisitedBefore: boolean }) => {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (e) {
    console.warn('Failed to save citizen session to local storage:', e);
  }
};

const AVATAR_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#14b8a6'
];

export const useUserAuth = () => {
  const [authState, setAuthState] = useState<UserAuthState>(() => {
    const session = getStoredSession();
    return {
      user: session.user,
      isAuthenticated: !!session.user,
      isGuest: session.isGuest,
      hasVisitedBefore: session.hasVisitedBefore
    };
  });

  const [isLoading, setIsLoading] = useState(false);

  // Sync state on session updates
  useEffect(() => {
    const handleAuthChange = () => {
      const session = getStoredSession();
      setAuthState({
        user: session.user,
        isAuthenticated: !!session.user,
        isGuest: session.isGuest,
        hasVisitedBefore: session.hasVisitedBefore
      });
    };

    window.addEventListener('drishti-auth-changed', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);

    return () => {
      window.removeEventListener('drishti-auth-changed', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  // Register New Citizen Account
  const register = useCallback(async (
    fullName: string,
    emailOrPhone: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const cleanName = fullName.trim();
      const cleanIdentifier = emailOrPhone.trim().toLowerCase();

      if (!cleanName) {
        return { success: false, error: 'Full name is required.' };
      }
      if (!cleanIdentifier) {
        return { success: false, error: 'Email or phone number is required.' };
      }
      if (password.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters.' };
      }

      const users = getStoredUsers();
      const existing = users.find(u => u.emailOrPhone.toLowerCase() === cleanIdentifier);
      if (existing) {
        return { success: false, error: 'An account with this email or phone number already exists.' };
      }

      const salt = generateSalt();
      const hashedPassword = await hashPassword(password, salt);
      const colorIndex = Math.floor(Math.random() * AVATAR_COLORS.length);

      const newUser: CitizenUser = {
        id: `CITIZEN-${Date.now().toString().slice(-6)}`,
        fullName: cleanName,
        emailOrPhone: cleanIdentifier,
        hashedPassword,
        salt,
        createdAt: new Date().toISOString(),
        avatarColor: AVATAR_COLORS[colorIndex]
      };

      const updatedUsers = [...users, newUser];
      saveStoredUsers(updatedUsers);

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Account creation failed. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Login Citizen Account
  const login = useCallback(async (
    emailOrPhone: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const cleanIdentifier = emailOrPhone.trim().toLowerCase();
      if (!cleanIdentifier || !password) {
        return { success: false, error: 'Please enter both your identifier and password.' };
      }

      const users = getStoredUsers();
      const user = users.find(u => u.emailOrPhone.toLowerCase() === cleanIdentifier);

      if (!user || !user.hashedPassword || !user.salt) {
        return { success: false, error: 'No account found with this email or phone number.' };
      }

      const inputHash = await hashPassword(password, user.salt);
      if (inputHash !== user.hashedPassword) {
        return { success: false, error: 'Incorrect password. Please try again.' };
      }

      // Safe user object (without password & salt)
      const safeUser: CitizenUser = {
        id: user.id,
        fullName: user.fullName,
        emailOrPhone: user.emailOrPhone,
        createdAt: user.createdAt,
        avatarColor: user.avatarColor,
        emergencyContacts: user.emergencyContacts
      };

      const newSession = {
        user: safeUser,
        isGuest: false,
        hasVisitedBefore: true
      };

      saveStoredSession(newSession);
      setAuthState({
        user: safeUser,
        isAuthenticated: true,
        isGuest: false,
        hasVisitedBefore: true
      });

      window.dispatchEvent(new CustomEvent('drishti-auth-changed'));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Login failed. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Continue as Guest
  const continueAsGuest = useCallback(() => {
    const newSession = {
      user: null,
      isGuest: true,
      hasVisitedBefore: true
    };
    saveStoredSession(newSession);
    setAuthState({
      user: null,
      isAuthenticated: false,
      isGuest: true,
      hasVisitedBefore: true
    });
    window.dispatchEvent(new CustomEvent('drishti-auth-changed'));
  }, []);

  // Logout
  const logout = useCallback(() => {
    const newSession = {
      user: null,
      isGuest: true, // Seamlessly transition back to guest so safety is never broken
      hasVisitedBefore: true
    };
    saveStoredSession(newSession);
    setAuthState({
      user: null,
      isAuthenticated: false,
      isGuest: true,
      hasVisitedBefore: true
    });
    window.dispatchEvent(new CustomEvent('drishti-auth-changed'));
  }, []);

  return {
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    isGuest: authState.isGuest,
    hasVisitedBefore: authState.hasVisitedBefore,
    isLoading,
    register,
    login,
    continueAsGuest,
    logout
  };
};
