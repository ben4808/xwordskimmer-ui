import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../models/User';
import { GoogleOAuthProvider } from '@react-oauth/google';
import CruziApi from '../api/CruziApi';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  handleGoogleSuccess: (credentialResponse: any) => Promise<void>;
  handleGoogleError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        
        if (token && userData) {
          // Verify token is still valid using the API
          const response = await CruziApi.verifyAuth();
          
          if (response.valid && response.user) {
            setUser(response.user);
          } else {
            // Token is invalid, clear storage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        }
      } catch (error) {
        console.error('Auth verification failed:', error);
        // Clear invalid auth data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = () => {
    // This will be handled by the GoogleLogin component
    console.log('Login initiated');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      setIsLoading(true);
      
      // Use the API to authenticate with Google
      const response = await CruziApi.authenticateWithGoogle(credentialResponse.credential);
      
      console.log('Login Success:', response);
      
      // Store JWT and user data
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      setUser(response.user);
    } catch (error) {
      console.error('Login Failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    console.error('Google Login Failed');
    setIsLoading(false);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    logout,
    handleGoogleSuccess,
    handleGoogleError,
  };

  return (
    <AuthContext.Provider value={value}>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
        {children}
      </GoogleOAuthProvider>
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
