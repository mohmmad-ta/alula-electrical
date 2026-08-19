import { readonly, ref } from 'vue';
import api from '../../axios/axios';

const admin = ref(null);
let sessionChecked = false;
let sessionRequest = null;

const checkAdminSession = async (force = false) => {
  if (sessionChecked && !force) return Boolean(admin.value);
  if (sessionRequest) return sessionRequest;

  sessionRequest = api.get('/auth/admin/getMe')
    .then((response) => {
      admin.value = response.data?.data || null;
      sessionChecked = true;
      return Boolean(admin.value);
    })
    .catch(() => {
      admin.value = null;
      sessionChecked = true;
      return false;
    })
    .finally(() => {
      sessionRequest = null;
    });

  return sessionRequest;
};

const loginAdmin = async (credentials) => {
  const response = await api.post('/auth/admin/login', credentials);
  localStorage.removeItem('token');
  admin.value = response.data?.data?.user || null;
  sessionChecked = true;
  return admin.value;
};

const logoutAdmin = async () => {
  try {
    await api.get('/auth/logout');
  } finally {
    localStorage.removeItem('token');
    admin.value = null;
    sessionChecked = true;
  }
};

const clearAdminSession = () => {
  admin.value = null;
  sessionChecked = true;
};

export const useAdminAuth = () => ({
  admin: readonly(admin),
  checkAdminSession,
  clearAdminSession,
  loginAdmin,
  logoutAdmin,
});
