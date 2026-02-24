import axios from 'axios';

const baseURL = `${import.meta.env.VITE_AUTH_USER}`;

export const httpClient = axios.create({
  baseURL,
});

export const httpClientPrivate = axios.create({
  baseURL,
  withCredentials: true,
});

export const buildAuthUrl = (path: string): string => {
  const base = baseURL?.trim() || '';
  return base ? `${base}${path}` : path;
};
