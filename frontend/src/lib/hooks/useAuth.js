// src/lib/hooks/useAuth.js
import { useState, useEffect, useCallback } from 'react';
import {
  setAuthToken,
  removeAuthToken,
  getAuthToken,
  isAuthenticated,
  registerUser // Import the registerUser function
} from '../../services/auth';

export const useAuth = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(isAuthenticated());
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchUser = useCallback(async () => {
    if (!isLoggedIn) return;
    
    try {
      const token = getAuthToken();
      const response = await fetch('http://localhost:5000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        throw new Error('Failed to fetch user');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      logout();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchUser();
    }
  }, [isLoggedIn, fetchUser]);

  const login = async (credentials) => {
    setIsLoading(true);
    try {
        const response = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(credentials)
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }

        setAuthToken(data.token);
        setUser(data.user);
        setIsLoggedIn(true);
        return data;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    } finally {
        setIsLoading(false);
    }
};

    // Add the signup function
  const signup = async (userData) => {
    setIsLoading(true);
    try {
      const data = await registerUser(userData);
      setAuthToken(data.token);
      setUser(data.user);
      setIsLoggedIn(true);
      return data;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const token = getAuthToken();
      await fetch('http://localhost:5000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      removeAuthToken();
      setUser(null);
      setIsLoggedIn(false);
    }
  };

  return {
    isLoggedIn,
    isLoading,
    user,
    login,
    logout,
    fetchUser,
    signup,
  };
};