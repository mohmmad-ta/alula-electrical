<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Lightbulb,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Zap,
} from '@lucide/vue';
import api, { resolveAssetUrl } from '../../axios/axios';
import CartDrawer from '../components/CartDrawer.vue';
import StoreFooter from '../components/StoreFooter.vue';
import StoreNavbar from '../components/StoreNavbar.vue';
import { useCart } from '../composables/useCart';

const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();
const { cartCount, addToCart } = useCart();

const product = ref(null);
const relatedProducts = ref([]);
const loading = ref(true);
const error = ref('');
const imageFailed = ref(false);
const selectedImage = ref('');
const failedRelatedImages = ref(new Set());
const selectedOption = ref(null);
const selectedTags = ref([]);
const quantity = ref(1);
const cartOpen = ref(false);
const toastMessage = ref('');

const isArabic = computed(() => locale.value === 'ar');
const basePrice = computed(() => Number(selectedOption.value?.price ?? product.value?.price ?? 0));
const addOnPrice = computed(() => selectedTags.value.reduce((total, tag) => total + Number(tag.price || 0), 0));
const unitPrice = computed(() => basePrice.value + addOnPrice.value);
const totalPrice = computed(() => unitPrice.value * quantity.value);
const productImages = computed(() => {
  if (product.value?.images?.length) return product.value.images;
  return product.value?.image ? [product.value.image] : [];
});

const formatPrice = (value) => {
  const numberLocale = isArabic.value ? 'ar-IQ' : 'en-IQ';
  return `${new Intl.NumberFormat(numberLocale).format(Number(value || 0))} ${t('currency')}`;
};

const fetchProduct = async () => {
  loading.value = true;
  error.value = '';
  product.value = null;
  relatedProducts.value = [];
  imageFailed.value = false;
  selectedOption.value = null;
  selectedTags.value = [];
  quantity.value = 1;

  try {
    const response = await api.get(`/product/${route.params.id}`);
    product.value = response.data?.data || null;

    if (!product.value) throw new Error('Product response is empty');

    selectedOption.value = product.value.options?.[0] || null;
    selectedImage.value = productImages.value[0] || '';
    document.title = `${product.value.name} | ${t('pageTitle')}`;

    const categoryId = product.value.category?._id || product.value.category;
    if (categoryId) {
      try {
        const relatedResponse = await api.get('/product', {
          params: { category: categoryId, limit: 5, sort: '-createdAt' },
        });
        relatedProducts.value = (relatedResponse.data?.data || [])
          .filter((item) => item._id !== product.value._id)
          .slice(0, 4);
      } catch {
        relatedProducts.value = [];
      }
    }
  } catch {
    error.value = 'productDetail.loadErrorText';
  } finally {
    loading.value = false;
  }
};

const toggleTag = (tag) => {
  const isSelected = selectedTags.value.some((item) => item._id === tag._id || item.title === tag.title);
  selectedTags.value = isSelected
    ? selectedTags.value.filter((item) => (item._id || item.title) !== (tag._id || tag.title))
    : [...selectedTags.value, tag];
};

const isTagSelected = (tag) => selectedTags.value.some((item) => item._id === tag._id || item.title === tag.title);

let toastTimer;
const addProductToCart = () => {
  addToCart(product.value, quantity.value, {
    option: selectedOption.value,
    tags: selectedTags.value,
    price: unitPrice.value,
  });
  toastMessage.value = t('productDetail.added', { quantity: quantity.value, name: product.value.name });
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toastMessage.value = '';
  }, 2200);
};

const markRelatedImageFailed = (id) => {
  failedRelatedImages.value = new Set([...failedRelatedImages.value, id]);
};

const chooseImage = (image) => {
  selectedImage.value = image;
  imageFailed.value = false;
};

const browseProducts = () => {
  cartOpen.value = false;
  router.push({ name: 'products' });
};

watch(() => route.params.id, fetchProduct, { immediate: true });
watch(locale, () => {
  if (product.value) document.title = `${product.value.name} | ${t('pageTitle')}`;
});
</script>

<template>
  <div id="top" class="min-h-screen scroll-mt-[100px] overflow-x-hidden bg-[#f7f7f7] font-sans text-secondary antialiased sm:scroll-mt-[116px]">
    <StoreNavbar :cart-count="cartCount" @open-cart="cartOpen = true" />

    <main class="mx-auto w-[min(1180px,calc(100%-48px))] pb-24 pt-7 max-sm:w-[calc(100%-28px)] max-sm:pb-16 max-sm:pt-5">
      <nav class="mb-7 flex min-w-0 items-center gap-2 overflow-hidden text-xs font-semibold text-[#72776e]" :aria-label="$t('nav.label')">
        <RouterLink class="shrink-0 hover:text-main" :to="{ name: 'home', hash: '#top' }">{{ $t('productDetail.home') }}</RouterLink>
        <ChevronRight class="shrink-0 rtl:rotate-180" :size="15" />
        <RouterLink class="shrink-0 hover:text-main" :to="{ name: 'products' }">{{ $t('productDetail.products') }}</RouterLink>
        <ChevronRight v-if="product" class="shrink-0 rtl:rotate-180" :size="15" />
        <span v-if="product" class="truncate text-secondary">{{ product.name }}</span>
      </nav>

      <div v-if="loading" class="grid grid-cols-2 gap-14 max-lg:gap-8 max-md:grid-cols-1" :aria-label="$t('productDetail.loading')">
        <div class="aspect-square animate-pulse rounded-md bg-[#e5e7e2]"></div>
        <div class="py-4">
          <div class="h-4 w-28 animate-pulse rounded bg-[#e5e7e2]"></div>
          <div class="mt-5 h-12 w-4/5 animate-pulse rounded bg-[#e5e7e2]"></div>
          <div class="mt-7 h-7 w-36 animate-pulse rounded bg-[#e5e7e2]"></div>
          <div class="mt-8 h-24 animate-pulse rounded bg-[#e5e7e2]"></div>
          <div class="mt-8 h-14 animate-pulse rounded bg-[#e5e7e2]"></div>
        </div>
      </div>

      <section v-else-if="error" class="flex min-h-[480px] flex-col items-center justify-center rounded-md border border-[#dfe2da] bg-white px-5 py-12 text-center">
        <span class="grid size-16 place-items-center rounded-full bg-main/10 text-main"><Zap :size="31" /></span>
        <h1 class="mb-2 mt-5 font-serif text-[34px] font-medium">{{ $t('productDetail.loadErrorTitle') }}</h1>
        <p class="mb-6 max-w-lg text-sm leading-relaxed text-[#6f746c]">{{ $t(error) }}</p>
        <RouterLink class="flex min-h-11 items-center justify-center gap-2 rounded bg-main px-5 text-sm font-bold text-secondary" :to="{ name: 'products' }"><ArrowLeft class="rtl:rotate-180" :size="18" /> {{ $t('productDetail.backToProducts') }}</RouterLink>
      </section>

      <template v-else-if="product">
        <section class="grid grid-cols-2 items-start gap-14 max-lg:gap-8 max-md:grid-cols-1">
          <div class="sticky top-[125px] motion-safe:animate-rise-in max-md:static">
            <div class="aspect-square overflow-hidden rounded-md border border-[#e0e2dc] bg-white">
              <img v-if="selectedImage && !imageFailed" class="size-full object-contain p-6 max-sm:p-3" :src="resolveAssetUrl(selectedImage)" :alt="product.name" @error="imageFailed = true">
              <div v-else class="flex size-full flex-col items-center justify-center gap-3 text-[#8a9084]"><Lightbulb :size="62" /><span class="text-xs font-semibold">{{ $t('productDetail.imageSoon') }}</span></div>
            </div>
            <div v-if="productImages.length > 1" class="mt-3 grid grid-cols-5 gap-2 max-sm:grid-cols-4">
              <button v-for="image in productImages" :key="image" class="aspect-square overflow-hidden rounded border bg-white p-1 transition" :class="selectedImage === image ? 'border-main ring-2 ring-main/20' : 'border-[#d9ddd5] hover:border-main/60'" type="button" @click="chooseImage(image)"><img class="size-full object-cover" :src="resolveAssetUrl(image)" :alt="product.name"></button>
            </div>
          </div>

          <div class="min-w-0 py-2 motion-safe:animate-rise-in-delay">
            <div class="flex flex-wrap items-center gap-2.5">
              <p class="text-xs font-extrabold uppercase text-main">{{ product.category?.name || $t('catalog.defaultCategory') }}</p>
              <span class="flex min-h-7 items-center gap-1 rounded-sm bg-main/10 px-2.5 text-[11px] font-extrabold text-secondary"><Check :size="14" /> {{ $t('productDetail.inStock') }}</span>
            </div>
            <h1 class="mt-4 break-words font-serif text-[48px] font-medium leading-[1.08] max-lg:text-[40px] max-sm:text-[34px]">{{ product.name }}</h1>

            <div class="mt-7 border-y border-[#dfe2da] py-5">
              <p class="mb-1 text-[11px] font-bold uppercase text-[#777d72]">{{ $t('productDetail.price') }}</p>
              <strong class="break-words text-[27px] text-secondary">{{ formatPrice(totalPrice) }}</strong>
            </div>

            <div class="mt-7">
              <h2 class="mb-2 text-sm font-extrabold">{{ $t('productDetail.description') }}</h2>
              <p class="text-[15px] leading-7 text-[#62685f]">{{ product.description || $t('productDetail.noDescription') }}</p>
            </div>

            <fieldset v-if="product.options?.length" class="mt-8">
              <legend class="mb-3 text-sm font-extrabold">{{ $t('productDetail.options') }}</legend>
              <div class="grid grid-cols-2 gap-2 max-sm:grid-cols-1">
                <button v-for="option in product.options" :key="option._id || option.title" class="flex min-h-12 items-center justify-between gap-3 rounded border px-3.5 text-start text-sm font-bold transition" :class="selectedOption === option ? 'border-main bg-main/10 ring-1 ring-main' : 'border-[#d7dad3] bg-white hover:border-main/50'" type="button" @click="selectedOption = option">
                  <span class="break-words">{{ option.title }}</span>
                  <span class="shrink-0 text-xs text-[#666c62]">{{ formatPrice(option.price) }}</span>
                </button>
              </div>
            </fieldset>

            <fieldset v-if="product.tags?.length" class="mt-8">
              <legend class="mb-3 text-sm font-extrabold">{{ $t('productDetail.addOns') }}</legend>
              <div class="space-y-2">
                <button v-for="tag in product.tags" :key="tag._id || tag.title" class="flex min-h-12 w-full items-center gap-3 rounded border bg-white px-3.5 text-start transition hover:border-main/50" :class="isTagSelected(tag) ? 'border-main ring-1 ring-main' : 'border-[#d7dad3]'" type="button" @click="toggleTag(tag)">
                  <span class="grid size-5 shrink-0 place-items-center rounded-sm border" :class="isTagSelected(tag) ? 'border-main bg-main text-secondary' : 'border-[#b9beb4]'"> <Check v-if="isTagSelected(tag)" :size="14" /></span>
                  <span class="min-w-0 flex-1 break-words text-sm font-bold">{{ tag.title }}</span>
                  <span class="shrink-0 text-xs font-bold text-main">+ {{ formatPrice(tag.price) }}</span>
                </button>
              </div>
            </fieldset>

            <div class="mt-9 flex gap-3 max-sm:flex-col">
              <div class="grid h-12 w-[132px] shrink-0 grid-cols-[42px_48px_42px] items-center rounded border border-[#cfd3ca] bg-white max-sm:w-full max-sm:grid-cols-[1fr_52px_1fr]" :aria-label="$t('productDetail.quantity')">
                <button class="grid h-11 place-items-center" type="button" :aria-label="$t('cart.decrease')" :disabled="quantity === 1" @click="quantity = Math.max(1, quantity - 1)"><Minus :size="17" /></button>
                <span class="text-center text-sm font-extrabold">{{ quantity }}</span>
                <button class="grid h-11 place-items-center" type="button" :aria-label="$t('cart.increase')" @click="quantity += 1"><Plus :size="17" /></button>
              </div>
              <button class="flex min-h-12 flex-1 items-center justify-center gap-2 rounded bg-main px-5 text-sm font-extrabold text-secondary transition hover:bg-main/90" type="button" @click="addProductToCart"><ShoppingBag :size="20" /> {{ $t('productDetail.addToCart') }}</button>
            </div>

            <div class="mt-8 grid grid-cols-2 border-s border-t border-[#dfe2da] max-sm:grid-cols-1">
              <article class="border-b border-e border-[#dfe2da] p-4"><ShieldCheck class="mb-3 text-main" :size="23" /><h3 class="text-sm font-bold">{{ $t('productDetail.qualityTitle') }}</h3><p class="mt-1 text-xs leading-relaxed text-[#6f746c]">{{ $t('productDetail.qualityText') }}</p></article>
              <article class="border-b border-e border-[#dfe2da] p-4"><Truck class="mb-3 text-main" :size="23" /><h3 class="text-sm font-bold">{{ $t('productDetail.deliveryTitle') }}</h3><p class="mt-1 text-xs leading-relaxed text-[#6f746c]">{{ $t('productDetail.deliveryText') }}</p></article>
            </div>
          </div>
        </section>

        <section class="mt-24 border-y border-[#dfe2da] py-12 max-sm:mt-16" aria-labelledby="product-information-title">
          <h2 id="product-information-title" class="font-serif text-[32px] font-medium">{{ $t('productDetail.detailsTitle') }}</h2>
          <dl class="mt-7 grid grid-cols-3 gap-px overflow-hidden rounded-md border border-[#dfe2da] bg-[#dfe2da] max-md:grid-cols-1">
            <div class="bg-white p-5"><dt class="text-xs font-bold text-[#747a70]">{{ $t('productDetail.category') }}</dt><dd class="mt-2 break-words text-sm font-extrabold">{{ product.category?.name || $t('catalog.defaultCategory') }}</dd></div>
            <div class="bg-white p-5"><dt class="text-xs font-bold text-[#747a70]">{{ $t('productDetail.availability') }}</dt><dd class="mt-2 text-sm font-extrabold text-main">{{ $t('productDetail.available') }}</dd></div>
            <div class="bg-white p-5"><dt class="text-xs font-bold text-[#747a70]">{{ $t('productDetail.productCode') }}</dt><dd class="mt-2 break-all font-mono text-xs font-bold">{{ product._id }}</dd></div>
          </dl>
        </section>

        <section v-if="relatedProducts.length" class="pt-20" aria-labelledby="related-products-title">
          <p class="mb-3 text-xs font-extrabold uppercase text-main">{{ $t('productDetail.relatedEyebrow') }}</p>
          <h2 id="related-products-title" class="font-serif text-[36px] font-medium max-sm:text-[31px]">{{ $t('productDetail.relatedTitle') }}</h2>
          <div class="mt-7 grid grid-cols-4 gap-[18px] max-lg:grid-cols-2 max-sm:gap-2.5">
            <RouterLink v-for="item in relatedProducts" :key="item._id" class="group min-w-0 overflow-hidden rounded-md border border-[#dde0d8] bg-white transition hover:-translate-y-1 hover:shadow-[0_17px_36px_rgba(34,42,31,0.1)]" :to="{ name: 'product-detail', params: { id: item._id } }">
              <div class="aspect-square overflow-hidden bg-[#f4f4f4]">
                <img v-if="item.image && !failedRelatedImages.has(item._id)" class="size-full object-cover transition-transform duration-300 group-hover:scale-[1.035]" :src="resolveAssetUrl(item.image)" :alt="item.name" loading="lazy" @error="markRelatedImageFailed(item._id)">
                <div v-else class="grid size-full place-items-center text-[#8a9084]"><Lightbulb :size="40" /></div>
              </div>
              <div class="p-4"><h3 class="min-h-[42px] break-words text-sm font-bold leading-snug">{{ item.name }}</h3><div class="mt-3 flex items-center justify-between gap-2 border-t border-[#ebede7] pt-3"><strong class="break-words text-sm">{{ formatPrice(item.price) }}</strong><span class="text-main"><ChevronRight class="rtl:rotate-180" :size="18" /></span></div></div>
            </RouterLink>
          </div>
        </section>
      </template>
    </main>

    <StoreFooter />

    <CartDrawer :open="cartOpen" @close="cartOpen = false" @browse="browseProducts" />

    <Transition enter-active-class="transition duration-200" enter-from-class="translate-y-2 opacity-0" leave-active-class="transition duration-200" leave-to-class="translate-y-2 opacity-0">
      <div v-if="toastMessage" class="fixed bottom-6 left-1/2 z-[70] flex min-h-11 max-w-[calc(100%-32px)] -translate-x-1/2 items-center gap-2 rounded border border-white/10 bg-secondary px-4 text-[13px] font-semibold text-white shadow-xl" role="status"><Check :size="17" /> {{ toastMessage }}</div>
    </Transition>
  </div>
</template>
