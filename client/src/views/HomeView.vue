<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';
import {
  ArrowRight,
  Cable,
  Check,
  ChevronRight,
  Headphones,
  LampCeiling,
  LampDesk,
  Lightbulb,
  PackageCheck,
  PanelsTopLeft,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  X,
  Zap,
} from '@lucide/vue';
import api, { resolveAssetUrl } from '../../axios/axios';
import CartDrawer from '../components/CartDrawer.vue';
import StoreFooter from '../components/StoreFooter.vue';
import StoreNavbar from '../components/StoreNavbar.vue';
import { useCart } from '../composables/useCart';

const { t, locale } = useI18n();

const products = ref([]);
const categories = ref([]);
const loading = ref(true);
const error = ref('');
const searchTerm = ref('');
const selectedCategory = ref('all');
const cartOpen = ref(false);
const failedImages = ref(new Set());
const toastMessage = ref('');
const isArabic = computed(() => locale.value === 'ar');
const { cartCount, addToCart: addCartItem } = useCart();

const filteredProducts = computed(() => {
  const query = searchTerm.value.trim().toLowerCase();

  return products.value.filter((product) => {
    const categoryId = product.category?._id || product.category;
    const matchesCategory = selectedCategory.value === 'all' || categoryId === selectedCategory.value;
    const searchableText = `${product.name || ''} ${product.description || ''} ${product.category?.name || ''}`.toLowerCase();

    return matchesCategory && (!query || searchableText.includes(query));
  });
});

const formatPrice = (value) => {
  const numberLocale = isArabic.value ? 'ar-IQ' : 'en-IQ';
  return `${new Intl.NumberFormat(numberLocale).format(Number(value || 0))} ${t('currency')}`;
};

const fetchStoreData = async () => {
  loading.value = true;
  error.value = '';

  try {
    const [productResponse, categoryResponse] = await Promise.all([
      api.get('/product', { params: { limit: 100, sort: '-createdAt' } }),
      api.get('/category', { params: { limit: 100, sort: 'name' } }),
    ]);

    products.value = Array.isArray(productResponse.data?.data) ? productResponse.data.data : [];
    categories.value = Array.isArray(categoryResponse.data?.data) ? categoryResponse.data.data : [];
  } catch {
    error.value = 'states.loadError';
  } finally {
    loading.value = false;
  }
};

const scrollToProducts = () => {
  document.querySelector('#products')?.scrollIntoView({ behavior: 'smooth' });
};

const selectCategory = (categoryId) => {
  selectedCategory.value = categoryId;
  document.querySelector('#products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const categoryIcon = (name = '') => {
  const value = name.toLowerCase();
  if (value.includes('cable') || value.includes('wire')) return Cable;
  if (value.includes('plug') || value.includes('switch') || value.includes('electric')) return Zap;
  if (value.includes('panel') || value.includes('ceiling')) return PanelsTopLeft;
  if (value.includes('lamp') || value.includes('desk')) return LampDesk;
  return Lightbulb;
};

const productImage = (product) => resolveAssetUrl(product.image);

const markImageFailed = (productId) => {
  failedImages.value = new Set([...failedImages.value, productId]);
};

let toastTimer;
const showToast = (message) => {
  toastMessage.value = message;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toastMessage.value = '';
  }, 2200);
};

const addToCart = (product) => {
  addCartItem(product);
  showToast(t('cart.added', { name: product.name }));
};

const browseFromCart = () => {
  cartOpen.value = false;
  scrollToProducts();
};

onMounted(fetchStoreData);
</script>

<template>
  <div class="min-h-screen overflow-x-hidden bg-[#f7f7f7] font-sans text-[#1d242e] antialiased">
    <StoreNavbar :cart-count="cartCount" @open-cart="cartOpen = true" />

    <main id="top" class="scroll-mt-[100px] sm:scroll-mt-[116px]">
      <section class="relative mx-auto mt-6 min-h-[545px] w-[min(1180px,calc(100%-48px))] overflow-hidden rounded-md bg-[#1d242e] text-white max-sm:mt-3.5 max-sm:min-h-[530px] max-sm:w-[calc(100%-28px)]" aria-labelledby="hero-title">
        <img class="absolute inset-0 size-full object-cover object-center max-sm:object-[58%_center]" src="/header.png" :alt="$t('hero.imageAlt')">
        <div class="absolute inset-0 bg-black/30 max-sm:bg-black/50" aria-hidden="true"></div>
        <div class="relative z-10 w-[58%] py-[88px] ps-16 motion-safe:animate-rise-in max-lg:w-[70%] max-lg:ps-[46px] max-sm:w-full max-sm:px-6 max-sm:pb-[110px] max-sm:pt-[60px]">
          <p class="mb-4 flex items-center gap-2 text-xs font-extrabold uppercase text-[#fd4e38]"><Sparkles :size="16" /> {{ $t('hero.eyebrow') }}</p>
          <h1 id="hero-title" class="m-0 max-w-[560px] font-serif text-[64px] font-medium leading-[0.98] max-lg:text-[55px] max-sm:text-[44px] max-sm:leading-[1.02]">{{ $t('hero.titleLineOne') }}<br>{{ $t('hero.titleLineTwo') }}</h1>
          <p class="mt-6 max-w-[495px] text-[17px] leading-relaxed text-[#e6e8ea] max-sm:text-[15px]">{{ $t('hero.description') }}</p>
          <div class="mt-8 flex flex-wrap items-center gap-3 max-sm:flex-col max-sm:items-stretch">
            <button class="flex min-h-[45px] items-center justify-center gap-2 rounded bg-[#fd4e38] px-[18px] text-sm font-bold text-[#1d242e] transition-colors hover:bg-[#fd4e38]/90" type="button" @click="scrollToProducts">
              {{ $t('hero.shop') }} <ArrowRight class="rtl:rotate-180" :size="18" />
            </button>
            <a class="flex min-h-[45px] items-center justify-center rounded border border-white/55 px-[18px] text-sm font-bold text-white hover:border-white" href="#categories">{{ $t('hero.browse') }}</a>
          </div>
        </div>
        <div class="absolute bottom-[26px] end-7 z-10 flex items-center gap-3 rounded-md border border-white/15 bg-[#1d242e]/85 px-4 py-3 backdrop-blur-md max-sm:bottom-4 max-sm:end-[18px] max-sm:start-[18px]">
          <LampCeiling :size="21" />
          <span class="flex flex-col"><strong class="text-xs">{{ $t('hero.noteTitle') }}</strong><small class="mt-1 text-[10px] text-[#c8cdc3]">{{ $t('hero.noteText') }}</small></span>
        </div>
      </section>

      <section id="categories" class="mx-auto w-[min(1180px,calc(100%-48px))] scroll-mt-[100px] pb-20 pt-[74px] sm:scroll-mt-[116px] max-sm:w-[calc(100%-28px)] max-sm:pb-[62px] max-sm:pt-[58px]" aria-labelledby="categories-title">
        <div class="mb-[30px] flex items-end justify-between gap-8 max-sm:items-start max-sm:gap-[18px]">
          <div>
            <p class="mb-4 flex items-center gap-2 text-xs font-extrabold uppercase text-[#fd4e38]">{{ $t('categories.eyebrow') }}</p>
            <h2 id="categories-title" class="m-0 font-serif text-[38px] font-medium leading-tight max-sm:text-[32px]">{{ $t('categories.title') }}</h2>
          </div>
          <button class="flex items-center gap-1 bg-transparent py-2 font-bold text-[#fd4e38]" type="button" @click="selectCategory('all')">{{ $t('categories.viewAll') }} <ChevronRight class="rtl:rotate-180" :size="17" /></button>
        </div>

        <div v-if="loading" class="grid grid-cols-4 gap-3.5 max-lg:grid-cols-2 max-sm:grid-cols-1" :aria-label="$t('categories.loading')">
          <div v-for="index in 4" :key="index" class="min-h-[168px] animate-pulse rounded-md bg-[#e6e8ea] max-sm:min-h-[105px]"></div>
        </div>
        <div v-else class="grid grid-cols-4 gap-3.5 max-lg:grid-cols-2 max-sm:grid-cols-1">
          <button
            v-for="category in categories.slice(0, 4)"
            :key="category._id"
            class="group relative flex min-h-[168px] flex-col items-start rounded-md border border-[#dfe2da] bg-white p-5 text-start transition motion-safe:animate-rise-in hover:-translate-y-1 hover:border-[#fd4e38] hover:shadow-[0_14px_30px_rgba(39,49,35,0.08)] max-sm:grid max-sm:min-h-[105px] max-sm:grid-cols-[48px_1fr_20px] max-sm:items-center max-sm:gap-3.5"
            type="button"
            @click="selectCategory(category._id)"
          >
            <span class="mb-5 grid size-12 place-items-center rounded-md bg-[#fff0ee] text-[#fd4e38] max-sm:mb-0"><component :is="categoryIcon(category.name)" :size="27" /></span>
            <span class="flex min-w-0 flex-col"><strong class="break-words text-base">{{ category.name }}</strong><small class="mt-1 line-clamp-2 text-xs leading-relaxed text-[#6f746c]">{{ category.description || $t('categories.explore') }}</small></span>
            <ChevronRight :size="19" class="absolute end-[18px] top-5 text-[#9da297] rtl:rotate-180 max-sm:static" />
          </button>
          <button v-if="!categories.length" class="relative flex min-h-[168px] flex-col items-start rounded-md border border-[#dfe2da] bg-white p-5 text-start transition hover:-translate-y-1 hover:border-[#fd4e38] hover:shadow-[0_14px_30px_rgba(39,49,35,0.08)] max-sm:grid max-sm:min-h-[105px] max-sm:grid-cols-[48px_1fr_20px] max-sm:items-center max-sm:gap-3.5" type="button" @click="scrollToProducts">
            <span class="mb-5 grid size-12 place-items-center rounded-md bg-[#fff0ee] text-[#fd4e38] max-sm:mb-0"><Lightbulb :size="27" /></span>
            <span class="flex min-w-0 flex-col"><strong class="break-words text-base">{{ $t('categories.fallbackTitle') }}</strong><small class="mt-1 text-xs leading-relaxed text-[#6f746c]">{{ $t('categories.fallbackText') }}</small></span>
            <ChevronRight :size="19" class="absolute end-[18px] top-5 text-[#9da297] rtl:rotate-180 max-sm:static" />
          </button>
        </div>
      </section>

      <section id="products" class="scroll-mt-[100px] bg-[#f2f3f4] py-[76px] sm:scroll-mt-[116px] max-sm:py-[60px]">
        <div class="mx-auto w-[min(1180px,calc(100%-48px))] max-sm:w-[calc(100%-28px)]">
          <div class="mb-[30px] flex items-center justify-between gap-8 max-sm:flex-col max-sm:items-start max-sm:gap-[18px]">
            <div>
              <p class="mb-4 text-xs font-extrabold uppercase text-[#fd4e38]">{{ $t('catalog.eyebrow') }}</p>
              <h2 class="m-0 font-serif text-[38px] font-medium leading-tight max-sm:text-[32px]">{{ $t('catalog.title') }}</h2>
              <p v-if="!loading" class="mt-2.5 text-[13px] text-[#6f746c]">{{ $t('catalog.results', { count: filteredProducts.length }) }}</p>
            </div>
            <label class="flex min-h-[46px] w-[min(350px,100%)] items-center gap-2.5 rounded border border-[#d4d8ce] bg-white px-3 focus-within:border-[#fd4e38] focus-within:ring-4 focus-within:ring-[#fd4e38]/10 max-sm:w-full">
              <Search :size="19" />
              <input v-model="searchTerm" class="min-w-0 flex-1 border-0 bg-transparent outline-none" type="search" :placeholder="$t('catalog.searchPlaceholder')" :aria-label="$t('catalog.searchLabel')">
              <button v-if="searchTerm" class="grid size-7 place-items-center bg-transparent text-[#6f746c]" type="button" :aria-label="$t('catalog.clearSearch')" @click="searchTerm = ''"><X :size="17" /></button>
            </label>
          </div>

          <div v-if="categories.length" class="mb-7 -mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" :aria-label="$t('catalog.filterLabel')">
            <button class="min-h-9 shrink-0 rounded-full border px-4 text-[13px] font-bold" :class="selectedCategory === 'all' ? 'border-[#fd4e38] bg-[#fd4e38] text-[#1d242e]' : 'border-[#cbd0c5] bg-transparent text-[#5e635a]'" type="button" @click="selectedCategory = 'all'">{{ $t('catalog.all') }}</button>
            <button
              v-for="category in categories"
              :key="category._id"
              class="min-h-9 shrink-0 rounded-full border px-4 text-[13px] font-bold"
              :class="selectedCategory === category._id ? 'border-[#fd4e38] bg-[#fd4e38] text-[#1d242e]' : 'border-[#cbd0c5] bg-transparent text-[#5e635a]'"
              type="button"
              @click="selectedCategory = category._id"
            >{{ category.name }}</button>
          </div>

          <div v-if="loading" class="grid grid-cols-4 gap-[18px] max-lg:grid-cols-2 max-sm:gap-2.5" :aria-label="$t('catalog.loading')">
            <div v-for="index in 8" :key="index" class="overflow-hidden rounded-md border border-[#dde0d8] bg-white">
              <div class="aspect-square animate-pulse bg-[#e6e8ea]"></div>
              <div class="mx-4 mt-3.5 h-[13px] w-3/4 animate-pulse rounded bg-[#e6e8ea]"></div>
              <div class="mx-4 mb-4 mt-3 h-[13px] w-1/2 animate-pulse rounded bg-[#e6e8ea]"></div>
            </div>
          </div>

          <div v-else-if="error" class="flex min-h-[310px] flex-col items-center justify-center rounded-md border border-[#dfe2da] bg-white px-5 py-10 text-center">
            <Zap class="text-[#fd4e38]" :size="30" />
            <h3 class="mb-1 mt-4 text-xl font-bold">{{ $t('states.loadTitle') }}</h3>
            <p class="mb-5 max-w-lg leading-relaxed text-[#6f746c]">{{ $t(error) }}</p>
            <button class="flex min-h-[45px] items-center justify-center rounded bg-[#fd4e38] px-[18px] text-sm font-bold text-[#1d242e] hover:bg-[#fd4e38]/90" type="button" @click="fetchStoreData">{{ $t('states.tryAgain') }}</button>
          </div>

          <div v-else-if="!filteredProducts.length" class="flex min-h-[310px] flex-col items-center justify-center rounded-md border border-[#dfe2da] bg-white px-5 py-10 text-center">
            <Search class="text-[#fd4e38]" :size="30" />
            <h3 class="mb-1 mt-4 text-xl font-bold">{{ $t('states.emptyTitle') }}</h3>
            <p class="mb-5 max-w-lg leading-relaxed text-[#6f746c]">{{ $t('states.emptyText') }}</p>
            <button class="flex min-h-[45px] items-center justify-center rounded border border-[#fd4e38] bg-transparent px-[18px] text-sm font-bold text-[#fd4e38]" type="button" @click="searchTerm = ''; selectedCategory = 'all'">{{ $t('states.clearFilters') }}</button>
          </div>

          <div v-else class="grid grid-cols-4 gap-[18px] max-lg:grid-cols-2 max-sm:gap-2.5">
            <article v-for="product in filteredProducts" :key="product._id" class="group min-w-0 overflow-hidden rounded-md border border-[#dde0d8] bg-white transition motion-safe:animate-rise-in hover:-translate-y-1 hover:shadow-[0_17px_36px_rgba(34,42,31,0.1)]">
              <RouterLink class="relative block aspect-square w-full overflow-hidden bg-[#f4f4f4] focus:outline-none focus-visible:ring-4 focus-visible:ring-main/30" :to="{ name: 'product-detail', params: { id: product._id } }">
                <img
                  v-if="product.image && !failedImages.has(product._id)"
                  class="size-full object-cover transition-transform duration-300 group-hover:scale-[1.035]"
                  :src="productImage(product)"
                  :alt="product.name"
                  loading="lazy"
                  @error="markImageFailed(product._id)"
                >
                <div v-else class="flex size-full flex-col items-center justify-center gap-2 text-[#8a9084]"><Lightbulb :size="44" /><span class="text-[11px] font-semibold">{{ $t('catalog.imageSoon') }}</span></div>
                <span v-if="product.active !== false" class="absolute start-2.5 top-2.5 flex min-h-[25px] items-center gap-1 rounded-sm border border-[#fd4e38]/20 bg-[#fff0ee]/90 px-2 text-[10px] font-extrabold text-[#1d242e]"><Check :size="13" /> {{ $t('catalog.inStock') }}</span>
              </RouterLink>
              <div class="p-[17px] max-sm:p-3">
                <p class="mb-2 text-[10px] font-extrabold uppercase text-[#7c8277]">{{ product.category?.name || $t('catalog.defaultCategory') }}</p>
                <h3 class="min-h-[42px] break-words text-base font-bold leading-snug max-sm:min-h-[39px] max-sm:text-sm"><RouterLink class="transition-colors hover:text-main focus:outline-none focus-visible:text-main" :to="{ name: 'product-detail', params: { id: product._id } }">{{ product.name }}</RouterLink></h3>
                <p class="mt-2 line-clamp-2 min-h-[39px] text-xs leading-relaxed text-[#6f746c] max-sm:hidden">{{ product.description || $t('catalog.defaultDescription') }}</p>
                <div class="mt-3 flex items-center justify-between gap-2.5 border-t border-[#ebede7] pt-3 max-sm:items-start max-sm:flex-col">
                  <strong class="min-w-0 break-words text-sm text-[#1d242e]">{{ formatPrice(product.price) }}</strong>
                  <button class="flex min-h-9 min-w-[70px] items-center justify-center gap-1 rounded bg-[#fd4e38] px-2.5 text-xs font-extrabold text-[#1d242e] max-sm:w-full" type="button" :aria-label="$t('catalog.addLabel', { name: product.name })" @click="addToCart(product)">
                    <Plus :size="18" /> <span>{{ $t('catalog.add') }}</span>
                  </button>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="why-us" class="mx-auto grid w-[min(1180px,calc(100%-48px))] scroll-mt-[100px] grid-cols-[0.78fr_1.22fr] gap-20 py-24 sm:scroll-mt-[116px] max-lg:grid-cols-1 max-lg:gap-10 max-sm:w-[calc(100%-28px)] max-sm:py-[68px]" aria-labelledby="why-title">
        <div>
          <p class="mb-4 text-xs font-extrabold uppercase text-[#fd4e38]">{{ $t('benefits.eyebrow') }}</p>
          <h2 id="why-title" class="m-0 font-bold text-[38px] text-secondary leading-tight max-sm:text-[32px]">{{ $t('benefits.titleLineOne') }}<br>{{ $t('benefits.titleLineTwo') }}</h2>
          <p class="mt-5 max-w-[410px] text-[15px] leading-relaxed text-[#6f746c]">{{ $t('benefits.intro') }}</p>
        </div>
        <div class="grid grid-cols-2 border-s border-t border-[#dfe2da] max-sm:grid-cols-1">
          <article class="min-h-[190px] border-b border-e border-[#dfe2da] p-6 max-sm:min-h-[155px]"><span class="grid size-[42px] place-items-center rounded bg-[#fff0ee] text-[#fd4e38]"><ShieldCheck :size="24" /></span><h3 class="mb-2 mt-[18px] text-[18px] font-bold">{{ $t('benefits.qualityTitle') }}</h3><p class="text-xs leading-relaxed text-[#6f746c]">{{ $t('benefits.qualityText') }}</p></article>
          <article class="min-h-[190px] border-b border-e border-[#dfe2da] p-6 max-sm:min-h-[155px]"><span class="grid size-[42px] place-items-center rounded bg-[#fff0ee] text-[#fd4e38]"><PackageCheck :size="24" /></span><h3 class="mb-2 mt-[18px] text-[18px] font-bold">{{ $t('benefits.projectTitle') }}</h3><p class="text-xs leading-relaxed text-[#6f746c]">{{ $t('benefits.projectText') }}</p></article>
          <article class="min-h-[190px] border-b border-e border-[#dfe2da] p-6 max-sm:min-h-[155px]"><span class="grid size-[42px] place-items-center rounded bg-[#fff0ee] text-[#fd4e38]"><Headphones :size="24" /></span><h3 class="mb-2 mt-[18px] text-[18px] font-bold">{{ $t('benefits.supportTitle') }}</h3><p class="text-xs leading-relaxed text-[#6f746c]">{{ $t('benefits.supportText') }}</p></article>
          <article class="min-h-[190px] border-b border-e border-[#dfe2da] p-6 max-sm:min-h-[155px]"><span class="grid size-[42px] place-items-center rounded bg-[#fff0ee] text-[#fd4e38]"><Truck :size="24" /></span><h3 class="mb-2 mt-[18px] text-[18px] font-bold">{{ $t('benefits.deliveryTitle') }}</h3><p class="text-xs leading-relaxed text-[#6f746c]">{{ $t('benefits.deliveryText') }}</p></article>
        </div>
      </section>

      <section class="bg-[#1d242e]/95 text-white">
        <div class="mx-auto flex min-h-[235px] w-[min(1180px,calc(100%-48px))] items-center justify-between gap-9 max-sm:min-h-[285px] max-sm:w-[calc(100%-28px)] max-sm:flex-col max-sm:items-start max-sm:justify-center">
          <div><p class="mb-4 text-xs font-extrabold uppercase text-[#fd4e38]">{{ $t('cta.eyebrow') }}</p><h2 class="max-w-[680px] font-serif text-[38px] font-medium leading-tight max-sm:text-[32px]">{{ $t('cta.title') }}</h2></div>
          <button class="flex min-h-[45px] shrink-0 items-center justify-center gap-2 rounded bg-[#fd4e38] px-[18px] text-sm font-bold text-white max-sm:w-full" type="button" @click="scrollToProducts">{{ $t('cta.button') }} <ArrowRight class="rtl:rotate-180" :size="18" /></button>
        </div>
      </section>
    </main>

    <StoreFooter />

    <CartDrawer :open="cartOpen" @close="cartOpen = false" @browse="browseFromCart" />

    <Transition enter-active-class="transition duration-200" enter-from-class="translate-y-2 opacity-0" leave-active-class="transition duration-200" leave-to-class="translate-y-2 opacity-0">
      <div v-if="toastMessage" class="fixed bottom-6 left-1/2 z-[70] flex min-h-11 max-w-[calc(100%-32px)] -translate-x-1/2 items-center gap-2 rounded border border-white/10 bg-[#1d242e] px-4 text-[13px] font-semibold text-white shadow-xl" role="status"><Check :size="17" /> {{ toastMessage }}</div>
    </Transition>
  </div>
</template>
