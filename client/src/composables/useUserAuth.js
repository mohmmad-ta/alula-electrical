import { readonly, ref } from 'vue';
import api from '../../axios/axios';

const user = ref(null);
let sessionChecked = false;
let sessionRequest = null;

const responseUser = (response) => response.data?.data?.user || response.data?.data || null;

const checkUserSession = async (force = false) => {
  if (sessionChecked && !force) return Boolean(user.value);
  if (sessionRequest) return sessionRequest;

  sessionRequest = api.get('/auth/user/me')
    .then((response) => {
      user.value = responseUser(response);
      sessionChecked = true;
      return Boolean(user.value);
    })
    .catch(() => {
      localStorage.removeItem('token');
      user.value = null;
      sessionChecked = true;
      return false;
    })
    .finally(() => {
      sessionRequest = null;
    });

  return sessionRequest;
};

const saveSession = (response) => {
  if (response.data?.token) localStorage.setItem('token', response.data.token);
  user.value = responseUser(response);
  sessionChecked = true;
  return user.value;
};

const loginUser = async (credentials) => saveSession(await api.post('/auth/user/login', credentials));

const signupUser = async (details) => saveSession(await api.post('/auth/user/signup', details));

const logoutUser = async () => {
  try {
    await api.get('/auth/logout');
  } finally {
    localStorage.removeItem('token');
    user.value = null;
    sessionChecked = true;
  }
};

const clearUserSession = () => {
  localStorage.removeItem('token');
  user.value = null;
  sessionChecked = true;
};

export const useUserAuth = () => ({
  user: readonly(user),
  checkUserSession,
  clearUserSession,
  loginUser,
  logoutUser,
  signupUser,
});
