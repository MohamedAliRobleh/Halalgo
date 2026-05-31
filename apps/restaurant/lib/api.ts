import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000';

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('clerk_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: { response?: { status: number }; config: { _retry?: boolean } }) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      return api(error.config);
    }
    return Promise.reject(error);
  },
);
