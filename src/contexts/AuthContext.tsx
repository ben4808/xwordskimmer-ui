import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { DEFAULT_USER_SETTINGS, User, UserSettings } from 'cruzi-models';
import { GoogleOAuthProvider } from '@react-oauth/google';
import CruziApi from '../api/CruziApi';
import appSettings from '../settings.json';

interface AppSettings {
  google_client_id: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  userSettings: UserSettings;
  login: () => void;
  logout: () => void;
  updateUserSettings: (settings: UserSettings) => Promise<void>;
  handleGoogleSuccess: (credentialResponse: any) => Promise<void>;
  handleGoogleError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

async function loadUserSettings(): Promise<UserSettings> {
  try {
    return await CruziApi.getUserSettings();
  } catch (error) {
    console.error('Failed to load user settings:', error);
    return { ...DEFAULT_USER_SETTINGS };
  }
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userSettings, setUserSettings] = useState<UserSettings>({ ...DEFAULT_USER_SETTINGS });

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
            setUserSettings(await loadUserSettings());
          } else {
            // Token is invalid, clear storage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUserSettings({ ...DEFAULT_USER_SETTINGS });
          }
        }
      } catch (error) {
        console.error('Auth verification failed:', error);
        // Clear invalid auth data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUserSettings({ ...DEFAULT_USER_SETTINGS });
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
    setUserSettings({ ...DEFAULT_USER_SETTINGS });
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const updateUserSettings = useCallback(async (settings: UserSettings) => {
    const previous = userSettings;
    setUserSettings(settings);
    try {
      const saved = await CruziApi.updateUserSettings(settings);
      setUserSettings(saved);
    } catch (error) {
      setUserSettings(previous);
      console.error('Failed to update user settings:', error);
      throw error;
    }
  }, [userSettings]);

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
      setUserSettings(await loadUserSettings());
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
    userSettings,
    login,
    logout,
    updateUserSettings,
    handleGoogleSuccess,
    handleGoogleError,
  };

  return (
    <AuthContext.Provider value={value}>
      <GoogleOAuthProvider clientId={(appSettings as AppSettings).google_client_id}>
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
