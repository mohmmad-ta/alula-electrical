<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { Check, ChevronRight, Lightbulb, Plus, Search, SlidersHorizontal, X, Zap } from '@lucide/vue';
import api, { resolveAssetUrl } from '../../axios/axios';
import CartDrawer from '../components/CartDrawer.vue';
import StoreFooter from '../components/StoreFooter.vue';
import StoreNavbar from '../components/StoreNavbar.vue';
import { useCart } from '../composables/useCart';

const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();
const { cartCount, addToCart: addCartItem } = useCart();

const products = ref([]);
const categories = ref([]);
const loading = ref(true);
const error = ref(false);
const searchTerm = ref('');
const selectedCategory = ref(typeof route.query.category === 'string' ? route.query.category : 'all');
const sortBy = ref('newest');
const failedImages = ref(new Set());
const cartOpen = ref(false);
const toastMessage = ref('');

const isArabic = computed(() => locale.value === 'ar');
const visibleProducts = computed(() => {
  const query = searchTerm.value.trim().toLowerCase();
  const filtered = products.value.filter((product) => {
    const categoryId = product.category?._id || product.category;
    const searchable = `${product.name || ''} ${product.description || ''} ${product.category?.name || ''}`.toLowerCase();
    return (selectedCategory.value === 'all' || categoryId === selectedCategory.value) && (!query || searchable.includes(query));
  });

  return [...filtered].sort((first, second) => {
    if (sortBy.value === 'price-low') return Number(first.price || 0) - Number(second.price || 0);
    if (sortBy.value === 'price-high') return Number(second.price || 0) - Number(first.price || 0);
    if (sortBy.value === 'name') return String(first.name || '').localeCompare(String(second.name || ''), locale.value);
    return 0;
  });
});

const formatPrice = (value) => `${new Intl.NumberFormat(isArabic.value ? 'ar-IQ' : 'en-IQ').format(Number(value || 0))} ${t('currency')}`;

const loadCatalog = async () => {
  loading.value = true;
  error.value = false;
  try {
    const [productResponse, categoryResponse] = await Promise.all([
      api.get('/product', { params: { limit: 200, sort: '-createdAt' } }),
      api.get('/category', { params: { limit: 200, sort: 'name' } }),
    ]);
    products.value = Array.isArray(productResponse.data?.data) ? productResponse.data.data : [];
    categories.value = Array.isArray(categoryResponse.data?.data) ? categoryResponse.data.data : [];
    if (selectedCategory.value !== 'all' && !categories.value.some((category) => category._id === selectedCategory.value)) {
      selectedCategory.value = 'all';
    }
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
};

const chooseCategory = (categoryId) => {
  selectedCategory.value = categoryId;
  const query = categoryId === 'all' ? {} : { category: categoryId };
  router.replace({ name: 'products', query });
};

const clearFilters = () => {
  searchTerm.value = '';
  sortBy.value = 'newest';
  chooseCategory('all');
};

const markImageFailed = (id) => {
  failedImages.value = new Set([...failedImages.value, id]);
};

let toastTimer;
const addToCart = (product) => {
  addCartItem(product);
  toastMessage.value = t('cart.added', { name: product.name });
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toastMessage.value = ''; }, 2200);
};

const browseFromCart = () => {
  cartOpen.value = false;
  document.querySelector('#catalog-products')?.scrollIntoView({ behavior: 'smooth' });
};

watch(() => route.query.category, (value) => {
  selectedCategory.value = typeof value === 'string' ? value : 'all';
});
watch(locale, () => {
  document.title = `${t('catalogPage.title')} | ${t('pageTitle')}`;
}, { immediate: true });
onMounted(loadCatalog);
</script>

<template>
  <div id="top" class="min-h-screen scroll-mt-[100px] bg-[#f5f6f4] font-sans text-secondary antialiased sm:scroll-mt-[116px]">
    <StoreNavbar :cart-count="cartCount" @open-cart="cartOpen = true" />

    <main>
      <section class="border-b border-[#dfe2da] bg-white">
        <div class="mx-auto w-[min(1180px,calc(100%-48px))] py-12 max-sm:w-[calc(100%-28px)] max-sm:py-9">
          <nav class="mb-7 flex items-center gap-2 text-xs font-bold text-[#73796f]" :aria-label="$t('nav.label')"><RouterLink class="hover:text-main" :to="{ name: 'home' }">{{ $t('catalogPage.home') }}</RouterLink><ChevronRight class="rtl:rotate-180" :size="15" /><span class="text-secondary">{{ $t('catalogPage.title') }}</span></nav>
          <div class="flex items-end justify-between gap-10 motion-safe:animate-rise-in max-md:flex-col max-md:items-start">
            <div><p class="mb-3 text-xs font-extrabold uppercase text-main">{{ $t('catalogPage.eyebrow') }}</p><h1 class="font-serif text-[48px] font-medium leading-tight max-sm:text-[38px]">{{ $t('catalogPage.title') }}</h1><p class="mt-4 max-w-2xl text-sm leading-7 text-[#666c63]">{{ $t('catalogPage.description') }}</p></div>
            <strong v-if="!loading && !error" class="shrink-0 font-mono text-sm">{{ $t('catalogPage.results', { count: visibleProducts.length }) }}</strong>
          </div>
        </div>
      </section>

      <section id="categories" class="scroll-mt-[100px] border-b border-[#dfe2da] bg-white sm:scroll-mt-[116px]" aria-labelledby="catalog-categories-title">
        <div class="mx-auto w-[min(1180px,calc(100%-48px))] py-5 max-sm:w-[calc(100%-28px)]">
          <h2 id="catalog-categories-title" class="mb-3 text-xs font-extrabold">{{ $t('catalogPage.categories') }}</h2>
          <div class="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button class="min-h-10 shrink-0 rounded border px-4 text-xs font-bold transition" :class="selectedCategory === 'all' ? 'border-main bg-main text-secondary' : 'border-[#d2d6ce] bg-white hover:border-main/50'" type="button" @click="chooseCategory('all')">{{ $t('catalogPage.allCategories') }}</button>
            <button v-for="category in categories" :key="category._id" class="min-h-10 shrink-0 rounded border px-4 text-xs font-bold transition" :class="selectedCategory === category._id ? 'border-main bg-main text-secondary' : 'border-[#d2d6ce] bg-white hover:border-main/50'" type="button" @click="chooseCategory(category._id)">{{ category.name }}</button>
          </div>
        </div>
      </section>

      <section id="catalog-products" class="scroll-mt-[100px] py-9 sm:scroll-mt-[116px] max-sm:py-6">
        <div class="mx-auto w-[min(1180px,calc(100%-48px))] max-sm:w-[calc(100%-28px)]">
          <div class="mb-6 flex items-center justify-between gap-3 max-md:flex-col max-md:items-stretch">
            <label class="flex h-11 w-[min(430px,100%)] items-center gap-2.5 rounded border border-[#cfd3ca] bg-white px-3 focus-within:border-main focus-within:ring-4 focus-within:ring-main/10 max-md:w-full"><Search :size="19" /><input v-model="searchTerm" class="min-w-0 flex-1 bg-transparent text-sm outline-none" type="search" :aria-label="$t('catalogPage.search')" :placeholder="$t('catalogPage.searchPlaceholder')"><button v-if="searchTerm" class="grid size-7 place-items-center text-[#72786e]" type="button" :aria-label="$t('catalog.clearSearch')" @click="searchTerm = ''"><X :size="16" /></button></label>
            <label class="flex h-11 items-center gap-2 rounded border border-[#cfd3ca] bg-white px-3"><SlidersHorizontal :size="18" /><span class="sr-only">{{ $t('catalogPage.sort') }}</span><select v-model="sortBy" class="min-w-[180px] bg-transparent text-xs font-bold outline-none max-sm:min-w-0 max-sm:flex-1"><option value="newest">{{ $t('catalogPage.sortNewest') }}</option><option value="price-low">{{ $t('catalogPage.sortPriceLow') }}</option><option value="price-high">{{ $t('catalogPage.sortPriceHigh') }}</option><option value="name">{{ $t('catalogPage.sortName') }}</option></select></label>
          </div>

          <div v-if="loading" class="grid grid-cols-4 gap-[18px] max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:gap-2.5" :aria-label="$t('catalogPage.loading')"><div v-for="index in 8" :key="index" class="overflow-hidden rounded-md border border-[#dde0d8] bg-white"><div class="aspect-square animate-pulse bg-[#e4e6e1]"></div><div class="space-y-3 p-4"><div class="h-3 w-2/3 animate-pulse rounded bg-[#e4e6e1]"></div><div class="h-4 w-full animate-pulse rounded bg-[#e4e6e1]"></div><div class="h-4 w-1/2 animate-pulse rounded bg-[#e4e6e1]"></div></div></div></div>

          <div v-else-if="error" class="flex min-h-[420px] flex-col items-center justify-center rounded-md border border-[#dfe2da] bg-white px-6 text-center"><Zap class="text-main" :size="34" /><h2 class="mt-5 text-xl font-bold">{{ $t('catalogPage.errorTitle') }}</h2><p class="mt-2 text-sm text-[#686e65]">{{ $t('catalogPage.errorText') }}</p><button class="mt-6 min-h-11 rounded bg-main px-5 text-xs font-extrabold" type="button" @click="loadCatalog">{{ $t('catalogPage.retry') }}</button></div>

          <div v-else-if="!visibleProducts.length" class="flex min-h-[420px] flex-col items-center justify-center rounded-md border border-[#dfe2da] bg-white px-6 text-center"><Search class="text-main" :size="34" /><h2 class="mt-5 text-xl font-bold">{{ $t('catalogPage.emptyTitle') }}</h2><p class="mt-2 text-sm text-[#686e65]">{{ $t('catalogPage.emptyText') }}</p><button class="mt-6 min-h-11 rounded border border-main px-5 text-xs font-extrabold text-main" type="button" @click="clearFilters">{{ $t('catalogPage.clear') }}</button></div>

          <div v-else class="grid grid-cols-4 gap-[18px] max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:gap-2.5">
            <article v-for="product in visibleProducts" :key="product._id" class="group min-w-0 overflow-hidden rounded-md border border-[#dde0d8] bg-white transition motion-safe:animate-rise-in hover:-translate-y-1 hover:shadow-[0_17px_36px_rgba(34,42,31,0.1)]">
              <RouterLink class="relative block aspect-square overflow-hidden bg-[#f1f2ef] focus:outline-none focus-visible:ring-4 focus-visible:ring-main/30" :to="{ name: 'product-detail', params: { id: product._id } }">
                <img v-if="product.image && !failedImages.has(product._id)" class="size-full object-cover transition-transform duration-300 group-hover:scale-[1.035]" :src="resolveAssetUrl(product.image)" :alt="product.name" loading="lazy" @error="markImageFailed(product._id)">
                <span v-else class="flex size-full flex-col items-center justify-center gap-2 text-[#858b81]"><Lightbulb :size="43" /><small class="text-[10px] font-bold">{{ $t('catalog.imageSoon') }}</small></span>
                <span class="absolute start-2.5 top-2.5 flex items-center gap-1 rounded-sm bg-white/90 px-2 py-1.5 text-[9px] font-extrabold"><Check :size="12" class="text-main" />{{ $t('catalog.inStock') }}</span>
              </RouterLink>
              <div class="p-4 max-sm:p-3"><p class="mb-2 truncate text-[10px] font-extrabold uppercase text-[#777d73]">{{ product.category?.name || $t('catalog.defaultCategory') }}</p><h2 class="min-h-[42px] break-words text-sm font-bold leading-snug"><RouterLink class="hover:text-main" :to="{ name: 'product-detail', params: { id: product._id } }">{{ product.name }}</RouterLink></h2><p class="mt-2 line-clamp-2 min-h-[38px] text-xs leading-5 text-[#6c7268] max-sm:hidden">{{ product.description || $t('catalog.defaultDescription') }}</p><div class="mt-3 flex items-center justify-between gap-2 border-t border-[#e8ebe5] pt-3 max-sm:flex-col max-sm:items-stretch"><strong class="break-words text-sm">{{ formatPrice(product.price) }}</strong><button class="flex min-h-9 items-center justify-center gap-1 rounded bg-main px-3 text-[11px] font-extrabold" type="button" :aria-label="$t('catalog.addLabel', { name: product.name })" @click="addToCart(product)"><Plus :size="16" />{{ $t('catalogPage.add') }}</button></div></div>
            </article>
          </div>
        </div>
      </section>
    </main>

    <StoreFooter />

    <CartDrawer :open="cartOpen" @close="cartOpen = false" @browse="browseFromCart" />
    <Transition enter-active-class="transition duration-200" enter-from-class="translate-y-2 opacity-0" leave-active-class="transition duration-200" leave-to-class="translate-y-2 opacity-0"><div v-if="toastMessage" class="fixed bottom-6 left-1/2 z-[70] flex min-h-11 max-w-[calc(100%-32px)] -translate-x-1/2 items-center gap-2 rounded bg-secondary px-4 text-xs font-bold text-white shadow-xl" role="status"><Check :size="17" class="text-main" />{{ toastMessage }}</div></Transition>
  </div>
</template>
