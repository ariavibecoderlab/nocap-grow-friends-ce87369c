import React, { createContext, useContext, useState, useCallback } from 'react';

interface ApiCredentials {
  apiKey: string;
  apiSecret: string;
  userToken: string;
}

interface ApiCredentialsContextType {
  credentials: ApiCredentials;
  setCredentials: (creds: Partial<ApiCredentials>) => void;
  saved: boolean;
  save: () => void;
  clear: () => void;
}

const STORAGE_KEY = 'nocap_api_credentials';

const defaults: ApiCredentials = { apiKey: '', apiSecret: '', userToken: '' };

const ApiCredentialsContext = createContext<ApiCredentialsContextType>({
  credentials: defaults,
  setCredentials: () => {},
  saved: false,
  save: () => {},
  clear: () => {},
});

export const useApiCredentials = () => useContext(ApiCredentialsContext);

export const ApiCredentialsProvider = ({ children }: { children: React.ReactNode }) => {
  const [credentials, setCredsState] = useState<ApiCredentials>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
    } catch {
      return defaults;
    }
  });
  const [saved, setSaved] = useState(() => !!localStorage.getItem(STORAGE_KEY));

  const setCredentials = useCallback((creds: Partial<ApiCredentials>) => {
    setCredsState(prev => ({ ...prev, ...creds }));
  }, []);

  const save = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
    setSaved(true);
  }, [credentials]);

  const clear = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setCredsState(defaults);
    setSaved(false);
  }, []);

  return (
    <ApiCredentialsContext.Provider value={{ credentials, setCredentials, saved, save, clear }}>
      {children}
    </ApiCredentialsContext.Provider>
  );
};
