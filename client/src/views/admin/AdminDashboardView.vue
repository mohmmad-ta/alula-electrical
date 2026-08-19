<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, useRouter } from 'vue-router';
import { AlertTriangle, Check, ChevronRight, ClipboardList, ExternalLink, Image, Languages, LoaderCircle, LogOut, MapPin, Menu, Package, Pencil, Phone, Plus, Search, Tags, Trash2, X } from '@lucide/vue';
import api, { resolveAssetUrl } from '../../../axios/axios';
import { useAdminAuth } from '../../composables/useAdminAuth';

const router = useRouter();
const { t, locale } = useI18n();
const { admin, clearAdminSession, logoutAdmin } = useAdminAuth();

const products = ref([]);
const categories = ref([]);
const orders = ref([]);
const loading = ref(true);
const loadError = ref(false);
const section = ref('products');
const search = ref('');
const orderSearch = ref('');
const orderStatusFilter = ref('all');
const selectedOrder = ref(null);
const orderDrawerOpen = ref(false);
const updatingOrderId = ref(null);
const mobileMenu = ref(false);
const drawerOpen = ref(false);
const editingId = ref(null);
const saving = ref(false);
const formError = ref('');
const newImages = ref([]);
const deleteTarget = ref(null);
const deleting = ref(false);
const categoryForm = ref({ name: '', description: '' });
const categorySaving = ref(false);
const categoryError = ref('');
const toastKey = ref('');

const MAX_PRODUCT_IMAGES = 8;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const acceptedImageTypes = new Set(['image/avif', 'image/jpeg', 'image/png', 'image/webp']);
const emptyForm = () => ({ name: '', category: '', price: '', images: [], description: '', active: true, options: [], tags: [] });
const form = ref(emptyForm());
const isArabic = computed(() => locale.value === 'ar');
const activeCount = computed(() => products.value.filter((item) => item.active !== false).length);
const filteredProducts = computed(() => {
  const query = search.value.trim().toLowerCase();
  return products.value.filter((item) => !query || `${item.name} ${item.category?.name || ''}`.toLowerCase().includes(query));
});
const filteredOrders = computed(() => {
  const query = orderSearch.value.trim().toLowerCase();
  return orders.value.filter((order) => {
    const customer = order.userId || {};
    const matchesSearch = !query || `${order._id} ${customer.name || ''} ${customer.phone || ''}`.toLowerCase().includes(query);
    return matchesSearch && (orderStatusFilter.value === 'all' || order.status === orderStatusFilter.value);
  });
});
const pendingOrderCount = computed(() => orders.value.filter((order) => order.status === '1').length);
const activeOrderCount = computed(() => orders.value.filter((order) => ['2', '3'].includes(order.status)).length);
const deliveredOrderCount = computed(() => orders.value.filter((order) => order.status === '4').length);
const orderStatuses = [
  { value: '1', key: 'admin.dashboard.statusPending' },
  { value: '2', key: 'admin.dashboard.statusPreparing' },
  { value: '3', key: 'admin.dashboard.statusOnTheWay' },
  { value: '4', key: 'admin.dashboard.statusDelivered' },
];

const formatPrice = (value) => `${new Intl.NumberFormat(isArabic.value ? 'ar-IQ' : 'en-IQ').format(Number(value || 0))} ${t('currency')}`;
const formatDate = (value) => new Intl.DateTimeFormat(isArabic.value ? 'ar-IQ' : 'en-IQ', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const shortOrderId = (order) => `#${String(order?._id || '').slice(-8).toUpperCase()}`;
const orderItemCount = (order) => (order.item || []).reduce((total, item) => total + Number(item.count || 0), 0);
const locationText = (location) => {
  if (!location || typeof location !== 'object') return t('admin.dashboard.locationUnavailable');
  const values = Object.values(location).filter((value) => ['string', 'number'].includes(typeof value) && String(value).trim());
  return values.length ? values.join(' · ') : t('admin.dashboard.locationUnavailable');
};
const statusClass = (status) => ({
  '1': 'bg-[#fff4d8] text-[#8a6310]',
  '2': 'bg-[#e9eefb] text-[#34558f]',
  '3': 'bg-main/10 text-[#a73527]',
  '4': 'bg-[#e7f4e9] text-[#27723a]',
}[status] || 'bg-[#eceeeb] text-[#666c63]');
const statusKey = (status) => orderStatuses.find((item) => item.value === status)?.key || 'admin.dashboard.statusDeleted';
const deleteTargetName = computed(() => deleteTarget.value?.type === 'order' ? shortOrderId(deleteTarget.value.item) : deleteTarget.value?.item?.name || '');
const notify = (key) => {
  toastKey.value = key;
  window.setTimeout(() => { if (toastKey.value === key) toastKey.value = ''; }, 2300);
};

const handleUnauthorized = async (error) => {
  if (error.response?.status !== 401) return false;
  clearAdminSession();
  await router.replace({ name: 'admin-login', query: { redirect: '/admin' } });
  return true;
};

const loadData = async () => {
  loading.value = true;
  loadError.value = false;
  try {
    const [productResponse, categoryResponse, orderResponse] = await Promise.all([
      api.get('/auth/admin/product', { params: { limit: 200, sort: '-createdAt' } }),
      api.get('/category', { params: { limit: 200, sort: 'name' } }),
      api.get('/auth/admin/order', { params: { limit: 200 } }),
    ]);
    products.value = productResponse.data?.data || [];
    categories.value = categoryResponse.data?.data || [];
    orders.value = orderResponse.data?.data || [];
  } catch (error) {
    if (!(await handleUnauthorized(error))) loadError.value = true;
  } finally {
    loading.value = false;
  }
};

const openCreate = () => {
  if (!categories.value.length) { section.value = 'categories'; return; }
  editingId.value = null;
  newImages.value.forEach((image) => URL.revokeObjectURL(image.preview));
  newImages.value = [];
  form.value = emptyForm();
  formError.value = '';
  drawerOpen.value = true;
};

const openEdit = (product) => {
  newImages.value.forEach((image) => URL.revokeObjectURL(image.preview));
  newImages.value = [];
  editingId.value = product._id;
  form.value = {
    name: product.name || '', category: product.category?._id || product.category || '', price: product.price ?? '',
    images: product.images?.length ? [...product.images] : product.image ? [product.image] : [], description: product.description || '', active: product.active !== false,
    options: (product.options || []).map(({ title, price }) => ({ title, price })),
    tags: (product.tags || []).map(({ title, price }) => ({ title, price })),
  };
  formError.value = '';
  drawerOpen.value = true;
};

const addRow = (field) => form.value[field].push({ title: '', price: 0 });
const removeRow = (field, index) => form.value[field].splice(index, 1);
const removeExistingImage = (index) => form.value.images.splice(index, 1);
const removeNewImage = (index) => {
  URL.revokeObjectURL(newImages.value[index].preview);
  newImages.value.splice(index, 1);
};
const selectImages = (event) => {
  const files = Array.from(event.target.files || []);
  event.target.value = '';

  if (form.value.images.length + newImages.value.length + files.length > MAX_PRODUCT_IMAGES) {
    formError.value = t('admin.dashboard.tooManyImages');
    return;
  }

  if (files.some((file) => !acceptedImageTypes.has(file.type) || file.size > MAX_IMAGE_SIZE)) {
    formError.value = t('admin.dashboard.invalidImage');
    return;
  }

  formError.value = '';
  newImages.value.push(...files.map((file) => ({
    file,
    preview: URL.createObjectURL(file),
    id: `${file.name}-${file.size}-${file.lastModified}`,
  })));
};
const closeProductDrawer = () => {
  drawerOpen.value = false;
  newImages.value.forEach((image) => URL.revokeObjectURL(image.preview));
  newImages.value = [];
};

const saveProduct = async () => {
  if (!form.value.images.length && !newImages.value.length) {
    formError.value = t('admin.dashboard.imageRequired');
    return;
  }

  saving.value = true;
  formError.value = '';
  const payload = new FormData();
  payload.append('name', form.value.name);
  payload.append('category', form.value.category);
  payload.append('price', String(Number(form.value.price)));
  payload.append('description', form.value.description || '');
  payload.append('active', String(form.value.active));
  payload.append('options', JSON.stringify(form.value.options.filter((item) => item.title.trim()).map((item) => ({ title: item.title.trim(), price: Number(item.price || 0) }))));
  payload.append('tags', JSON.stringify(form.value.tags.filter((item) => item.title.trim()).map((item) => ({ title: item.title.trim(), price: Number(item.price || 0) }))));
  payload.append('existingImages', JSON.stringify(form.value.images));
  newImages.value.forEach((image) => payload.append('images', image.file));
  try {
    if (editingId.value) {
      await api.patch(`/auth/admin/product/${editingId.value}`, payload);
      notify('admin.dashboard.updated');
    } else {
      await api.post('/auth/admin/product', payload);
      notify('admin.dashboard.created');
    }
    closeProductDrawer();
    await loadData();
  } catch (error) {
    if (!(await handleUnauthorized(error))) formError.value = error.response?.data?.message || t('admin.dashboard.saveError');
  } finally { saving.value = false; }
};

const saveCategory = async () => {
  categorySaving.value = true;
  categoryError.value = '';
  try {
    await api.post('/category', categoryForm.value);
    categoryForm.value = { name: '', description: '' };
    notify('admin.dashboard.categoryCreated');
    await loadData();
  } catch (error) {
    if (!(await handleUnauthorized(error))) categoryError.value = error.response?.data?.message || t('admin.dashboard.categorySaveError');
  } finally { categorySaving.value = false; }
};

const productCount = (id) => products.value.filter((item) => (item.category?._id || item.category) === id).length;
const openOrder = (order) => { selectedOrder.value = order; orderDrawerOpen.value = true; };
const updateOrderStatus = async (order, status) => {
  if (status === order.status) return;
  updatingOrderId.value = order._id;
  try {
    const response = await api.patch(`/auth/admin/order/${order._id}`, { status });
    const updated = response.data?.data || { ...order, status };
    orders.value = orders.value.map((item) => item._id === order._id ? updated : item);
    if (selectedOrder.value?._id === order._id) selectedOrder.value = updated;
    notify('admin.dashboard.statusUpdated');
  } catch (error) {
    if (!(await handleUnauthorized(error))) notify('admin.dashboard.statusUpdateError');
  } finally { updatingOrderId.value = null; }
};
const askDelete = (type, item) => {
  if (type === 'category' && productCount(item._id)) { notify('admin.dashboard.categoryInUse'); return; }
  deleteTarget.value = { type, item };
};

const confirmDelete = async () => {
  deleting.value = true;
  try {
    if (deleteTarget.value.type === 'product') {
      await api.delete(`/auth/admin/product/${deleteTarget.value.item._id}`);
      notify('admin.dashboard.deleted');
    } else if (deleteTarget.value.type === 'category') {
      await api.delete(`/category/${deleteTarget.value.item._id}`);
      notify('admin.dashboard.categoryDeleted');
    } else {
      await api.delete(`/auth/admin/order/${deleteTarget.value.item._id}`);
      if (selectedOrder.value?._id === deleteTarget.value.item._id) orderDrawerOpen.value = false;
      notify('admin.dashboard.orderDeleted');
    }
    deleteTarget.value = null;
    await loadData();
  } catch (error) {
    if (!(await handleUnauthorized(error))) notify(deleteTarget.value.type === 'product' ? 'admin.dashboard.deleteError' : deleteTarget.value.type === 'order' ? 'admin.dashboard.orderDeleteError' : 'admin.dashboard.categoryInUse');
  } finally { deleting.value = false; }
};

const switchSection = (value) => { section.value = value; mobileMenu.value = false; };
const signOut = async () => { await logoutAdmin(); await router.replace({ name: 'admin-login' }); };
watch(locale, () => { document.title = `${t('admin.dashboard.title')} | ${t('pageTitle')}`; }, { immediate: true });
onBeforeUnmount(() => newImages.value.forEach((image) => URL.revokeObjectURL(image.preview)));
onMounted(loadData);
</script>

<template>
  <div class="min-h-screen bg-[#f3f4f2] text-secondary">
    <div class="grid min-h-screen grid-cols-[244px_minmax(0,1fr)] max-lg:grid-cols-1">
      <aside class="sticky top-0 flex h-screen flex-col bg-secondary px-4 py-5 text-white max-lg:hidden">
        <RouterLink class="flex items-center gap-3 px-2" :to="{ name: 'home' }"><img class="size-14 object-contain" src="/logo-brand.png" :alt="$t('brand.homeLabel')"><span><strong class="block text-lg">{{ $t('brand.logo') }}</strong><small class="text-[9px] text-white/55">{{ $t('brand.tagline') }}</small></span></RouterLink>
        <nav class="mt-12 space-y-1">
          <button class="flex min-h-11 w-full items-center gap-3 rounded px-3 text-start text-sm font-bold" :class="section === 'products' ? 'bg-main text-secondary' : 'text-white/70 hover:bg-white/10'" type="button" @click="switchSection('products')"><Package :size="19" />{{ $t('admin.dashboard.products') }}</button>
          <button class="flex min-h-11 w-full items-center gap-3 rounded px-3 text-start text-sm font-bold" :class="section === 'orders' ? 'bg-main text-secondary' : 'text-white/70 hover:bg-white/10'" type="button" @click="switchSection('orders')"><ClipboardList :size="19" />{{ $t('admin.dashboard.orders') }}<span v-if="pendingOrderCount" class="ms-auto grid min-w-6 place-items-center rounded-full bg-white/15 px-1.5 py-0.5 text-[10px]">{{ pendingOrderCount }}</span></button>
          <button class="flex min-h-11 w-full items-center gap-3 rounded px-3 text-start text-sm font-bold" :class="section === 'categories' ? 'bg-main text-secondary' : 'text-white/70 hover:bg-white/10'" type="button" @click="switchSection('categories')"><Tags :size="19" />{{ $t('admin.dashboard.categories') }}</button>
        </nav>
        <div class="mt-auto border-t border-white/10 pt-4">
          <p class="mb-3 truncate px-3 text-[10px] text-white/55">{{ $t('admin.dashboard.welcome', { name: admin?.userID || 'Admin' }) }}</p>
          <RouterLink class="flex min-h-10 items-center gap-3 rounded px-3 text-xs font-bold text-white/70 hover:bg-white/10" :to="{ name: 'home' }"><ExternalLink :size="17" />{{ $t('admin.dashboard.storefront') }}</RouterLink>
          <button class="flex min-h-10 w-full items-center gap-3 rounded px-3 text-start text-xs font-bold text-white/70 hover:bg-white/10" type="button" @click="signOut"><LogOut :size="17" />{{ $t('admin.dashboard.logout') }}</button>
        </div>
      </aside>

      <div class="min-w-0">
        <header class="sticky top-0 z-20 hidden min-h-[70px] items-center justify-between border-b border-[#dfe2da] bg-white/95 px-4 backdrop-blur-md max-lg:flex">
          <RouterLink class="flex items-center gap-2" :to="{ name: 'home' }"><img class="size-11 object-contain" src="/logo-brand.png" :alt="$t('brand.homeLabel')"><strong>ALULA</strong></RouterLink>
          <div class="flex gap-2"><button class="grid size-10 place-items-center rounded border border-[#dfe2da]" type="button" @click="locale = locale === 'ar' ? 'en' : 'ar'"><Languages :size="18" /></button><button class="grid size-10 place-items-center rounded border border-[#dfe2da]" type="button" @click="mobileMenu = !mobileMenu"><X v-if="mobileMenu" :size="20" /><Menu v-else :size="20" /></button></div>
          <nav v-if="mobileMenu" class="absolute inset-x-0 top-[69px] border-b border-[#dfe2da] bg-white p-3 shadow-lg"><button class="flex min-h-11 w-full items-center gap-3 px-3 text-sm font-bold" type="button" @click="switchSection('products')"><Package :size="18" />{{ $t('admin.dashboard.products') }}</button><button class="flex min-h-11 w-full items-center gap-3 px-3 text-sm font-bold" type="button" @click="switchSection('orders')"><ClipboardList :size="18" />{{ $t('admin.dashboard.orders') }}<span v-if="pendingOrderCount" class="ms-auto rounded-full bg-main/10 px-2 py-0.5 text-[10px] text-main">{{ pendingOrderCount }}</span></button><button class="flex min-h-11 w-full items-center gap-3 px-3 text-sm font-bold" type="button" @click="switchSection('categories')"><Tags :size="18" />{{ $t('admin.dashboard.categories') }}</button><button class="flex min-h-11 w-full items-center gap-3 px-3 text-start text-sm font-bold" type="button" @click="signOut"><LogOut :size="18" />{{ $t('admin.dashboard.logout') }}</button></nav>
        </header>

        <main class="mx-auto max-w-[1450px] px-8 py-8 max-sm:px-3.5 max-sm:py-6">
          <div class="mb-8 flex items-end justify-between gap-5 max-md:flex-col max-md:items-start"><div><p class="mb-2 text-xs font-extrabold uppercase text-main">{{ $t('admin.dashboard.eyebrow') }}</p><h1 class="font-serif text-[36px] font-medium max-sm:text-[31px]">{{ $t('admin.dashboard.title') }}</h1></div><div class="flex gap-2 max-md:w-full"><button class="hidden min-h-11 items-center gap-2 rounded border border-[#ced3ca] bg-white px-4 text-xs font-bold lg:flex" type="button" @click="locale = locale === 'ar' ? 'en' : 'ar'"><Languages :size="17" />{{ $t('nav.language') }}</button><button v-if="section === 'products'" class="flex min-h-11 items-center justify-center gap-2 rounded bg-main px-4 text-xs font-extrabold max-md:flex-1" type="button" @click="openCreate"><Plus :size="18" />{{ $t('admin.dashboard.addProduct') }}</button></div></div>

          <div v-if="loading" class="flex min-h-[470px] items-center justify-center"><LoaderCircle class="animate-spin text-main" :size="34" /></div>
          <div v-else-if="loadError" class="flex min-h-[420px] flex-col items-center justify-center border border-[#dfe2da] bg-white px-6 text-center"><AlertTriangle class="text-main" :size="34" /><h2 class="mt-4 font-bold">{{ $t('admin.dashboard.loadError') }}</h2><button class="mt-5 min-h-11 rounded bg-main px-5 text-xs font-bold" type="button" @click="loadData">{{ $t('states.tryAgain') }}</button></div>

          <template v-else-if="section === 'products'">
            <div class="mb-5 grid grid-cols-3 gap-3 max-md:grid-cols-1"><article class="border-s-4 border-main bg-white p-5"><p class="text-xs font-bold text-[#73796f]">{{ $t('admin.dashboard.allProducts') }}</p><strong class="mt-2 block font-mono text-3xl">{{ products.length }}</strong></article><article class="border-s-4 border-secondary bg-white p-5"><p class="text-xs font-bold text-[#73796f]">{{ $t('admin.dashboard.activeProducts') }}</p><strong class="mt-2 block font-mono text-3xl">{{ activeCount }}</strong></article><article class="border-s-4 border-[#aab0a6] bg-white p-5"><p class="text-xs font-bold text-[#73796f]">{{ $t('admin.dashboard.totalCategories') }}</p><strong class="mt-2 block font-mono text-3xl">{{ categories.length }}</strong></article></div>
            <div v-if="!categories.length" class="mb-4 flex justify-between gap-4 border border-main/25 bg-main/10 p-4 text-xs font-bold"><span>{{ $t('admin.dashboard.noCategories') }}</span><button class="text-main" type="button" @click="switchSection('categories')">{{ $t('admin.dashboard.createCategory') }}</button></div>
            <section class="border border-[#dfe2da] bg-white"><div class="flex items-center justify-between gap-4 border-b border-[#e2e5de] p-4 max-sm:flex-col max-sm:items-stretch"><h2 class="font-bold">{{ $t('admin.dashboard.products') }}</h2><label class="flex h-10 w-[min(340px,100%)] items-center gap-2 rounded border border-[#ced3ca] px-3"><Search :size="18" /><input v-model="search" class="min-w-0 flex-1 bg-transparent text-xs outline-none" type="search" :placeholder="$t('admin.dashboard.searchPlaceholder')"></label></div>
              <div v-if="!filteredProducts.length" class="flex min-h-[300px] flex-col items-center justify-center px-5 text-center"><Package class="text-main" :size="34" /><h3 class="mt-4 font-bold">{{ $t(products.length ? 'admin.dashboard.noMatchesTitle' : 'admin.dashboard.emptyTitle') }}</h3><p class="mt-2 text-xs text-[#6d7369]">{{ $t(products.length ? 'admin.dashboard.noMatchesText' : 'admin.dashboard.emptyText') }}</p></div>
              <div v-else class="overflow-x-auto"><table class="w-full min-w-[760px] text-start"><thead><tr class="bg-[#f7f8f6] text-[11px] uppercase text-[#72786e]"><th class="px-4 py-3 text-start">{{ $t('admin.dashboard.product') }}</th><th class="px-4 py-3 text-start">{{ $t('admin.dashboard.category') }}</th><th class="px-4 py-3 text-start">{{ $t('admin.dashboard.price') }}</th><th class="px-4 py-3 text-start">{{ $t('admin.dashboard.status') }}</th><th class="px-4 py-3 text-end">{{ $t('admin.dashboard.actions') }}</th></tr></thead><tbody><tr v-for="product in filteredProducts" :key="product._id" class="border-t border-[#e7e9e4]"><td class="px-4 py-3"><div class="flex items-center gap-3"><span class="grid size-12 shrink-0 place-items-center overflow-hidden rounded bg-[#f1f2ef] text-main"><img v-if="product.image" class="size-full object-cover" :src="resolveAssetUrl(product.image)" :alt="product.name"><Image v-else :size="20" /></span><strong class="max-w-[250px] truncate text-sm">{{ product.name }}</strong></div></td><td class="px-4 py-3 text-xs font-bold">{{ product.category?.name || '-' }}</td><td class="px-4 py-3 text-xs font-extrabold">{{ formatPrice(product.price) }}</td><td class="px-4 py-3"><span class="rounded-sm px-2 py-1.5 text-[10px] font-extrabold" :class="product.active !== false ? 'bg-[#e7f4e9] text-[#27723a]' : 'bg-[#eceeeb] text-[#666c63]'">{{ $t(product.active !== false ? 'admin.dashboard.active' : 'admin.dashboard.inactive') }}</span></td><td class="px-4 py-3"><div class="flex justify-end gap-1"><button class="grid size-9 place-items-center rounded border border-[#d9ddd5] hover:text-main" type="button" :aria-label="$t('admin.dashboard.edit')" @click="openEdit(product)"><Pencil :size="16" /></button><button class="grid size-9 place-items-center rounded border border-[#d9ddd5] hover:text-main" type="button" :aria-label="$t('admin.dashboard.delete')" @click="askDelete('product', product)"><Trash2 :size="16" /></button></div></td></tr></tbody></table></div>
            </section>
          </template>

          <template v-else-if="section === 'orders'">
            <div class="mb-5 grid grid-cols-4 gap-3 max-xl:grid-cols-2 max-sm:grid-cols-1">
              <article class="border-s-4 border-secondary bg-white p-5"><p class="text-xs font-bold text-[#73796f]">{{ $t('admin.dashboard.allOrders') }}</p><strong class="mt-2 block font-mono text-3xl">{{ orders.length }}</strong></article>
              <article class="border-s-4 border-[#d7a62e] bg-white p-5"><p class="text-xs font-bold text-[#73796f]">{{ $t('admin.dashboard.pendingOrders') }}</p><strong class="mt-2 block font-mono text-3xl">{{ pendingOrderCount }}</strong></article>
              <article class="border-s-4 border-main bg-white p-5"><p class="text-xs font-bold text-[#73796f]">{{ $t('admin.dashboard.activeOrders') }}</p><strong class="mt-2 block font-mono text-3xl">{{ activeOrderCount }}</strong></article>
              <article class="border-s-4 border-[#4f9a61] bg-white p-5"><p class="text-xs font-bold text-[#73796f]">{{ $t('admin.dashboard.deliveredOrders') }}</p><strong class="mt-2 block font-mono text-3xl">{{ deliveredOrderCount }}</strong></article>
            </div>

            <section class="border border-[#dfe2da] bg-white" aria-labelledby="orders-title">
              <div class="flex items-center justify-between gap-4 border-b border-[#e2e5de] p-4 max-lg:flex-col max-lg:items-stretch">
                <h2 id="orders-title" class="font-bold">{{ $t('admin.dashboard.orders') }}</h2>
                <div class="flex gap-2 max-sm:flex-col">
                  <label class="flex h-10 w-[min(330px,100%)] items-center gap-2 rounded border border-[#ced3ca] px-3 max-sm:w-full"><Search :size="18" /><input v-model="orderSearch" class="min-w-0 flex-1 bg-transparent text-xs outline-none" type="search" :placeholder="$t('admin.dashboard.searchOrders')"></label>
                  <select v-model="orderStatusFilter" class="h-10 rounded border border-[#ced3ca] bg-white px-3 text-xs font-bold outline-none focus:border-main"><option value="all">{{ $t('admin.dashboard.filterAllStatuses') }}</option><option v-for="status in orderStatuses" :key="status.value" :value="status.value">{{ $t(status.key) }}</option></select>
                </div>
              </div>

              <div v-if="!filteredOrders.length" class="flex min-h-[300px] flex-col items-center justify-center px-5 text-center"><ClipboardList class="text-main" :size="35" /><h3 class="mt-4 font-bold">{{ $t(orders.length ? 'admin.dashboard.noOrderMatches' : 'admin.dashboard.emptyOrdersTitle') }}</h3><p v-if="!orders.length" class="mt-2 text-xs text-[#6d7369]">{{ $t('admin.dashboard.emptyOrdersText') }}</p></div>
              <div v-else class="overflow-x-auto">
                <table class="w-full min-w-[940px] text-start">
                  <thead><tr class="bg-[#f7f8f6] text-[11px] uppercase text-[#72786e]"><th class="px-4 py-3 text-start">{{ $t('admin.dashboard.order') }}</th><th class="px-4 py-3 text-start">{{ $t('admin.dashboard.customer') }}</th><th class="px-4 py-3 text-start">{{ $t('admin.dashboard.items') }}</th><th class="px-4 py-3 text-start">{{ $t('admin.dashboard.total') }}</th><th class="px-4 py-3 text-start">{{ $t('admin.dashboard.orderStatus') }}</th><th class="px-4 py-3 text-end">{{ $t('admin.dashboard.actions') }}</th></tr></thead>
                  <tbody><tr v-for="order in filteredOrders" :key="order._id" class="border-t border-[#e7e9e4] hover:bg-[#fafbf9]"><td class="px-4 py-3"><strong class="block font-mono text-xs">{{ shortOrderId(order) }}</strong><small class="mt-1 block text-[10px] text-[#757b71]">{{ formatDate(order.createdAt) }}</small></td><td class="px-4 py-3"><strong class="block max-w-[190px] truncate text-xs">{{ order.userId?.name || $t('admin.dashboard.unknownCustomer') }}</strong><small class="mt-1 block text-[10px] text-[#757b71]">{{ order.userId?.phone || '-' }}</small></td><td class="px-4 py-3 text-xs font-bold">{{ orderItemCount(order) }}</td><td class="px-4 py-3 text-xs font-extrabold">{{ formatPrice(order.totalPrice) }}</td><td class="px-4 py-3"><select class="h-9 min-w-[145px] rounded border border-[#d6dad2] bg-white px-2 text-[11px] font-bold outline-none focus:border-main disabled:opacity-50" :value="order.status" :disabled="updatingOrderId === order._id" @change="updateOrderStatus(order, $event.target.value)"><option v-for="status in orderStatuses" :key="status.value" :value="status.value">{{ $t(status.key) }}</option></select></td><td class="px-4 py-3"><div class="flex justify-end gap-1"><button class="grid size-9 place-items-center rounded border border-[#d9ddd5] hover:border-main hover:text-main" type="button" :aria-label="$t('admin.dashboard.viewOrder')" @click="openOrder(order)"><ChevronRight class="rtl:rotate-180" :size="17" /></button><button class="grid size-9 place-items-center rounded border border-[#d9ddd5] hover:border-main hover:text-main" type="button" :aria-label="$t('admin.dashboard.deleteOrder')" @click="askDelete('order', order)"><Trash2 :size="16" /></button></div></td></tr></tbody>
                </table>
              </div>
            </section>
          </template>

          <template v-else>
            <div class="grid grid-cols-[minmax(270px,0.7fr)_minmax(0,1.3fr)] gap-5 max-md:grid-cols-1"><section class="self-start border border-[#dfe2da] bg-white p-5"><h2 class="font-bold">{{ $t('admin.dashboard.createCategory') }}</h2><form class="mt-5 space-y-4" @submit.prevent="saveCategory"><label class="block"><span class="mb-2 block text-xs font-bold">{{ $t('admin.dashboard.categoryName') }}</span><input v-model="categoryForm.name" class="h-11 w-full rounded border border-[#ced3ca] px-3 text-sm outline-none focus:border-main" required></label><label class="block"><span class="mb-2 block text-xs font-bold">{{ $t('admin.dashboard.categoryDescription') }}</span><textarea v-model="categoryForm.description" class="min-h-24 w-full rounded border border-[#ced3ca] p-3 text-sm outline-none focus:border-main"></textarea></label><p v-if="categoryError" class="text-xs font-bold text-main">{{ categoryError }}</p><button class="flex min-h-11 w-full items-center justify-center gap-2 rounded bg-main px-4 text-xs font-extrabold" type="submit" :disabled="categorySaving"><LoaderCircle v-if="categorySaving" class="animate-spin" :size="17" />{{ $t('admin.dashboard.saveCategory') }}</button></form></section>
              <section class="border border-[#dfe2da] bg-white"><div class="border-b border-[#e2e5de] p-4"><h2 class="font-bold">{{ $t('admin.dashboard.categories') }}</h2></div><div v-if="!categories.length" class="flex min-h-[250px] items-center justify-center text-sm text-[#71776d]">{{ $t('admin.dashboard.categoryEmpty') }}</div><article v-for="category in categories" v-else :key="category._id" class="flex items-center justify-between gap-4 border-b border-[#e7e9e4] p-4 last:border-0"><div class="min-w-0"><h3 class="text-sm font-bold">{{ category.name }}</h3><p class="mt-1 text-xs text-[#73796f]">{{ category.description || '-' }}</p><small class="mt-2 block text-[10px] font-bold text-main">{{ productCount(category._id) }} {{ $t('admin.dashboard.products') }}</small></div><button class="grid size-9 shrink-0 place-items-center rounded border border-[#d9ddd5] hover:text-main disabled:opacity-35" type="button" :disabled="productCount(category._id) > 0" :aria-label="$t('admin.dashboard.deleteCategory')" @click="askDelete('category', category)"><Trash2 :size="16" /></button></article></section></div>
          </template>
        </main>
      </div>
    </div>

    <Transition enter-active-class="transition-opacity" enter-from-class="opacity-0" leave-active-class="transition-opacity" leave-to-class="opacity-0"><div v-if="drawerOpen" class="fixed inset-0 z-40 bg-black/50" @click="closeProductDrawer"></div></Transition>
    <aside class="fixed inset-y-0 end-0 z-50 flex w-[min(670px,100%)] flex-col bg-white shadow-[-20px_0_50px_rgba(20,25,19,0.2)] transition-transform rtl:shadow-[20px_0_50px_rgba(20,25,19,0.2)]" :class="drawerOpen ? 'translate-x-0' : 'translate-x-[105%] rtl:-translate-x-[105%]'" :aria-hidden="!drawerOpen"><div class="flex min-h-[76px] items-center justify-between border-b border-[#dfe2da] px-6 max-sm:px-4"><div><p class="text-[10px] font-bold uppercase text-main">{{ $t('admin.dashboard.products') }}</p><h2 class="mt-1 text-xl font-bold">{{ $t(editingId ? 'admin.dashboard.editTitle' : 'admin.dashboard.createTitle') }}</h2></div><button class="grid size-10 place-items-center rounded border border-[#dfe2da]" type="button" @click="closeProductDrawer"><X :size="20" /></button></div>
      <form class="flex-1 overflow-y-auto px-6 py-5 max-sm:px-4" enctype="multipart/form-data" @submit.prevent="saveProduct">
        <div class="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <label><span class="mb-2 block text-xs font-bold">{{ $t('admin.dashboard.name') }}</span><input v-model="form.name" class="h-11 w-full rounded border border-[#ced3ca] px-3 text-sm outline-none focus:border-main" required minlength="3" maxlength="40"></label>
          <label><span class="mb-2 block text-xs font-bold">{{ $t('admin.dashboard.category') }}</span><select v-model="form.category" class="h-11 w-full rounded border border-[#ced3ca] bg-white px-3 text-sm outline-none focus:border-main" required><option value="" disabled>{{ $t('admin.dashboard.selectCategory') }}</option><option v-for="category in categories" :key="category._id" :value="category._id">{{ category.name }}</option></select></label>
          <label><span class="mb-2 block text-xs font-bold">{{ $t('admin.dashboard.priceField') }}</span><input v-model="form.price" class="h-11 w-full rounded border border-[#ced3ca] px-3 text-sm outline-none focus:border-main" type="number" min="0" required></label>
        </div>

        <fieldset class="mt-5 border border-[#d9ddd5] bg-[#fafbf9] p-4">
          <div class="flex items-start justify-between gap-4 max-sm:flex-col"><div><legend class="text-xs font-bold">{{ $t('admin.dashboard.image') }}</legend><p class="mt-1 text-[10px] leading-5 text-[#73796f]">{{ $t('admin.dashboard.uploadHint') }}</p></div><label class="flex min-h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded bg-secondary px-4 text-xs font-bold text-white"><Image :size="17" />{{ $t('admin.dashboard.uploadImages') }}<input class="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple @change="selectImages"></label></div>
          <div v-if="form.images.length || newImages.length" class="mt-4 grid grid-cols-4 gap-2 max-sm:grid-cols-3">
            <div v-for="(imagePath, index) in form.images" :key="imagePath" class="group relative aspect-square overflow-hidden rounded border border-[#d9ddd5] bg-white"><img class="size-full object-cover" :src="resolveAssetUrl(imagePath)" :alt="$t('admin.dashboard.image')"><span v-if="index === 0" class="absolute start-1.5 top-1.5 rounded-sm bg-main px-1.5 py-1 text-[8px] font-bold text-secondary">{{ $t('admin.dashboard.primaryImage') }}</span><button class="absolute end-1.5 top-1.5 grid size-7 place-items-center rounded bg-secondary/90 text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100" type="button" :aria-label="$t('admin.dashboard.removeImage')" @click="removeExistingImage(index)"><X :size="14" /></button></div>
            <div v-for="(imageFile, index) in newImages" :key="imageFile.id" class="group relative aspect-square overflow-hidden rounded border border-main/40 bg-white"><img class="size-full object-cover" :src="imageFile.preview" :alt="imageFile.file.name"><span v-if="!form.images.length && index === 0" class="absolute start-1.5 top-1.5 rounded-sm bg-main px-1.5 py-1 text-[8px] font-bold text-secondary">{{ $t('admin.dashboard.primaryImage') }}</span><button class="absolute end-1.5 top-1.5 grid size-7 place-items-center rounded bg-secondary/90 text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100" type="button" :aria-label="$t('admin.dashboard.removeImage')" @click="removeNewImage(index)"><X :size="14" /></button></div>
          </div>
        </fieldset>

        <label class="mt-4 block"><span class="mb-2 block text-xs font-bold">{{ $t('admin.dashboard.description') }}</span><textarea v-model="form.description" class="min-h-28 w-full rounded border border-[#ced3ca] p-3 text-sm outline-none focus:border-main"></textarea></label><label class="mt-4 flex min-h-11 items-center gap-3 rounded border border-[#ced3ca] px-3"><input v-model="form.active" class="size-4 accent-main" type="checkbox"><span class="text-xs font-bold">{{ $t('admin.dashboard.activeLabel') }}</span></label>
        <fieldset v-for="field in ['options', 'tags']" :key="field" class="mt-7 border-t border-[#e1e4dd] pt-5"><div class="mb-3 flex items-center justify-between"><legend class="text-sm font-bold">{{ $t(field === 'options' ? 'admin.dashboard.options' : 'admin.dashboard.addOns') }}</legend><button class="flex items-center gap-1 text-xs font-bold text-main" type="button" @click="addRow(field)"><Plus :size="16" />{{ $t(field === 'options' ? 'admin.dashboard.addOption' : 'admin.dashboard.addAddOn') }}</button></div><div class="space-y-2"><div v-for="(row, index) in form[field]" :key="index" class="grid grid-cols-[1fr_120px_38px] gap-2 max-sm:grid-cols-[1fr_90px_38px]"><input v-model="row.title" class="h-10 min-w-0 rounded border border-[#ced3ca] px-3 text-xs outline-none focus:border-main" :placeholder="$t(field === 'options' ? 'admin.dashboard.optionTitle' : 'admin.dashboard.addOnTitle')"><input v-model="row.price" class="h-10 min-w-0 rounded border border-[#ced3ca] px-2 text-xs outline-none focus:border-main" type="number" min="0" :placeholder="$t('admin.dashboard.itemPrice')"><button class="grid size-10 place-items-center rounded border border-[#d9ddd5] hover:text-main" type="button" :aria-label="$t('admin.dashboard.removeRow')" @click="removeRow(field, index)"><Trash2 :size="15" /></button></div></div></fieldset>
        <p v-if="formError" class="mt-5 whitespace-pre-line rounded border border-main/25 bg-main/10 p-3 text-xs font-bold leading-5 text-[#a42f21]">{{ formError }}</p><div class="sticky bottom-0 mt-7 flex gap-2 border-t border-[#e1e4dd] bg-white py-4"><button class="min-h-11 flex-1 rounded border border-[#ced3ca] px-4 text-xs font-bold" type="button" @click="closeProductDrawer">{{ $t('admin.dashboard.cancel') }}</button><button class="flex min-h-11 flex-[1.4] items-center justify-center gap-2 rounded bg-main px-4 text-xs font-extrabold" type="submit" :disabled="saving"><LoaderCircle v-if="saving" class="animate-spin" :size="17" />{{ $t(saving ? 'admin.dashboard.saving' : 'admin.dashboard.save') }}</button></div></form></aside>

    <Transition enter-active-class="transition-opacity" enter-from-class="opacity-0" leave-active-class="transition-opacity" leave-to-class="opacity-0"><div v-if="orderDrawerOpen" class="fixed inset-0 z-40 bg-black/50" @click="orderDrawerOpen = false"></div></Transition>
    <aside class="fixed inset-y-0 end-0 z-50 flex w-[min(580px,100%)] flex-col bg-white shadow-[-20px_0_50px_rgba(20,25,19,0.2)] transition-transform rtl:shadow-[20px_0_50px_rgba(20,25,19,0.2)]" :class="orderDrawerOpen ? 'translate-x-0' : 'translate-x-[105%] rtl:-translate-x-[105%]'" :aria-hidden="!orderDrawerOpen">
      <template v-if="selectedOrder">
        <div class="flex min-h-[82px] items-center justify-between border-b border-[#dfe2da] px-6 max-sm:px-4"><div><p class="font-mono text-[10px] font-bold uppercase text-main">{{ shortOrderId(selectedOrder) }}</p><h2 class="mt-1 text-xl font-bold">{{ $t('admin.dashboard.orderDetails') }}</h2></div><button class="grid size-10 place-items-center rounded border border-[#dfe2da]" type="button" @click="orderDrawerOpen = false"><X :size="20" /></button></div>
        <div class="flex-1 overflow-y-auto px-6 py-5 max-sm:px-4">
          <div class="flex items-center justify-between gap-4 border-b border-[#e2e5de] pb-5"><div><p class="text-[10px] font-bold text-[#73796f]">{{ $t('admin.dashboard.date') }}</p><p class="mt-1 text-xs font-bold">{{ formatDate(selectedOrder.createdAt) }}</p></div><span class="rounded-sm px-2.5 py-2 text-[10px] font-extrabold" :class="statusClass(selectedOrder.status)">{{ $t(statusKey(selectedOrder.status)) }}</span></div>

          <section class="border-b border-[#e2e5de] py-5"><h3 class="mb-4 text-sm font-bold">{{ $t('admin.dashboard.customerDetails') }}</h3><div class="grid grid-cols-2 gap-3 max-sm:grid-cols-1"><div class="bg-[#f6f7f5] p-3"><p class="text-[10px] font-bold text-[#73796f]">{{ $t('admin.dashboard.customer') }}</p><p class="mt-2 text-xs font-extrabold">{{ selectedOrder.userId?.name || $t('admin.dashboard.unknownCustomer') }}</p></div><div class="bg-[#f6f7f5] p-3"><p class="flex items-center gap-1 text-[10px] font-bold text-[#73796f]"><Phone :size="13" />{{ $t('admin.dashboard.customerDetails') }}</p><p class="mt-2 text-xs font-extrabold" dir="ltr">{{ selectedOrder.userId?.phone || '-' }}</p></div></div></section>

          <section class="border-b border-[#e2e5de] py-5"><h3 class="mb-3 flex items-center gap-2 text-sm font-bold"><MapPin class="text-main" :size="18" />{{ $t('admin.dashboard.deliveryLocation') }}</h3><p class="break-words text-xs leading-6 text-[#686e65]">{{ locationText(selectedOrder.location) }}</p></section>

          <section class="py-5"><h3 class="mb-3 text-sm font-bold">{{ $t('admin.dashboard.orderItems') }}</h3><div class="space-y-2"><article v-for="line in selectedOrder.item" :key="line._id" class="grid grid-cols-[58px_1fr_auto] gap-3 border border-[#e0e3dc] p-3"><span class="grid size-[58px] place-items-center overflow-hidden rounded bg-[#f1f2ef] text-main"><img v-if="line.Id?.image" class="size-full object-cover" :src="resolveAssetUrl(line.Id.image)" :alt="line.Id.name"><Image v-else :size="20" /></span><div class="min-w-0"><h4 class="break-words text-xs font-extrabold">{{ line.Id?.name || '-' }}</h4><p v-if="line.option?.title" class="mt-1 text-[10px] text-[#72786e]">{{ $t('admin.dashboard.option') }}: {{ line.option.title }}</p><p v-if="line.tags?.length" class="mt-1 text-[10px] text-[#72786e]">{{ $t('admin.dashboard.addOnsLabel') }}: {{ line.tags.map((tag) => tag.title).join(' · ') }}</p><p v-if="line.notes?.length" class="mt-1 text-[10px] text-[#72786e]">{{ $t('admin.dashboard.notes') }}: {{ line.notes.map((note) => note.title).join(' · ') }}</p></div><strong class="text-xs">× {{ line.count }}</strong></article></div></section>
        </div>
        <div class="border-t border-[#dfe2da] bg-[#f7f8f6] px-6 py-5 max-sm:px-4"><div class="mb-4 flex items-center justify-between"><span class="text-xs font-bold text-[#73796f]">{{ $t('admin.dashboard.total') }}</span><strong class="text-lg">{{ formatPrice(selectedOrder.totalPrice) }}</strong></div><div class="flex gap-2"><select class="h-11 min-w-0 flex-1 rounded border border-[#ced3ca] bg-white px-3 text-xs font-bold" :value="selectedOrder.status" :disabled="updatingOrderId === selectedOrder._id" @change="updateOrderStatus(selectedOrder, $event.target.value)"><option v-for="status in orderStatuses" :key="status.value" :value="status.value">{{ $t(status.key) }}</option></select><button class="grid size-11 place-items-center rounded border border-main/40 text-main hover:bg-main/10" type="button" :aria-label="$t('admin.dashboard.deleteOrder')" @click="askDelete('order', selectedOrder)"><Trash2 :size="18" /></button></div></div>
      </template>
    </aside>

    <div v-if="deleteTarget" class="fixed inset-0 z-[60] grid place-items-center bg-black/55 p-4"><section class="w-full max-w-[430px] rounded-md bg-white p-6" role="alertdialog"><span class="grid size-12 place-items-center rounded bg-main/10 text-main"><AlertTriangle :size="25" /></span><h2 class="mt-5 text-xl font-bold">{{ $t(deleteTarget.type === 'product' ? 'admin.dashboard.deleteTitle' : deleteTarget.type === 'order' ? 'admin.dashboard.deleteOrderTitle' : 'admin.dashboard.deleteCategoryTitle') }}</h2><p class="mt-3 text-sm leading-6 text-[#6e746a]">{{ $t(deleteTarget.type === 'product' ? 'admin.dashboard.deleteText' : deleteTarget.type === 'order' ? 'admin.dashboard.deleteOrderText' : 'admin.dashboard.deleteCategoryText', { name: deleteTargetName }) }}</p><div class="mt-6 flex justify-end gap-2"><button class="min-h-10 rounded border border-[#ced3ca] px-4 text-xs font-bold" type="button" @click="deleteTarget = null">{{ $t('admin.dashboard.cancel') }}</button><button class="flex min-h-10 items-center gap-2 rounded bg-main px-4 text-xs font-extrabold" type="button" :disabled="deleting" @click="confirmDelete"><LoaderCircle v-if="deleting" class="animate-spin" :size="16" />{{ $t(deleteTarget.type === 'product' ? 'admin.dashboard.confirmDelete' : deleteTarget.type === 'order' ? 'admin.dashboard.confirmDeleteOrder' : 'admin.dashboard.confirmDeleteCategory') }}</button></div></section></div>
    <Transition enter-active-class="transition" enter-from-class="translate-y-2 opacity-0" leave-active-class="transition" leave-to-class="translate-y-2 opacity-0"><div v-if="toastKey" class="fixed bottom-5 left-1/2 z-[80] flex min-h-11 max-w-[calc(100%-28px)] -translate-x-1/2 items-center gap-2 rounded bg-secondary px-4 text-xs font-bold text-white shadow-xl" role="status"><Check :size="17" class="text-main" />{{ $t(toastKey) }}</div></Transition>
  </div>
</template>
