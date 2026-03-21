import { createContext, useContext, useState, useEffect } from 'react';
import { getProfile, loginUser, registerUser } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('awp_token');
    if (token) {
      getProfile()
        .then((res) => {
          setUser(res.data.user || res.data);
        })
        .catch(() => {
          localStorage.removeItem('awp_token');
          localStorage.removeItem('awp_user');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await loginUser({ email, password });
    const { token, user: userData } = res.data;
    localStorage.setItem('awp_token', token);
    localStorage.setItem('awp_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const register = async (data) => {
    const res = await registerUser(data);
    const { token, user: userData } = res.data;
    if (token) {
      localStorage.setItem('awp_token', token);
      localStorage.setItem('awp_user', JSON.stringify(userData));
      setUser(userData);
    }
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('awp_token');
    localStorage.removeItem('awp_user');
    setUser(null);
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('awp_user', JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
