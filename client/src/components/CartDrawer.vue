<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { ArrowRight, Lightbulb, Minus, Plus, ShoppingBag, Trash2, X } from '@lucide/vue';
import { resolveAssetUrl } from '../../axios/axios';
import { useCart } from '../composables/useCart';

defineProps({
  open: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['close', 'browse']);
const { t, locale } = useI18n();
const router = useRouter();
const { cart, cartCount, cartTotal, updateQuantity, removeFromCart } = useCart();
const isArabic = computed(() => locale.value === 'ar');

const formatPrice = (value) => {
  const numberLocale = isArabic.value ? 'ar-IQ' : 'en-IQ';
  return `${new Intl.NumberFormat(numberLocale).format(Number(value || 0))} ${t('currency')}`;
};

const cartItemKey = (item) => item.key || `${item._id}:${item.option?.title || ''}:${(item.tags || []).map((tag) => tag.title).sort().join('|')}`;
const itemSelection = (item) => [
  item.option?.title,
  ...(item.tags || []).map((tag) => tag.title),
].filter(Boolean).join(' · ');

const itemTotal = (item) => Number(item.price || 0) * Number(item.quantity || 0);

const requestOrder = () => {
  emit('close');
  router.push({ name: 'checkout' });
};
</script>

<template>
  <Transition enter-active-class="transition-opacity duration-200 motion-reduce:transition-none" enter-from-class="opacity-0" leave-active-class="transition-opacity duration-200 motion-reduce:transition-none" leave-to-class="opacity-0">
    <div v-if="open" class="fixed inset-0 z-50 bg-secondary/60 backdrop-blur-[2px]" @click="emit('close')"></div>
  </Transition>

  <Transition enter-active-class="transition-transform duration-300 ease-out motion-reduce:transition-none" enter-from-class="translate-x-full rtl:-translate-x-full" leave-active-class="transition-transform duration-200 ease-in motion-reduce:transition-none" leave-to-class="translate-x-full rtl:-translate-x-full">
    <aside
      v-if="open"
      class="fixed inset-y-0 end-0 z-[60] flex w-full flex-col overflow-hidden bg-white text-secondary shadow-[-20px_0_55px_rgba(29,36,46,0.22)] sm:w-[440px] rtl:shadow-[20px_0_55px_rgba(29,36,46,0.22)]"
      role="dialog"
      aria-modal="true"
      :aria-label="$t('cart.label')"
    >
      <header class="flex min-h-[84px] shrink-0 items-center justify-between gap-4 border-b border-[#e2e5de] px-5 py-4 sm:px-6">
        <div class="min-w-0">
          <p class="mb-1 text-[10px] font-extrabold uppercase text-main">{{ $t('cart.selection') }}</p>
          <div class="flex items-center gap-2.5">
            <h2 class="truncate text-xl font-bold">{{ $t('cart.title') }}</h2>
            <span v-if="cartCount" class="grid min-w-6 place-items-center rounded-sm bg-[#fff0ee] px-1.5 py-1 text-[10px] font-extrabold text-main">{{ $t('cart.count', { count: cartCount }) }}</span>
          </div>
        </div>
        <button class="grid size-10 shrink-0 place-items-center rounded border border-[#dfe2da] bg-white transition-colors hover:border-main hover:bg-[#fff0ee]" type="button" :aria-label="$t('cart.close')" @click="emit('close')"><X :size="20" /></button>
      </header>

      <div v-if="!cart.length" class="flex flex-1 flex-col items-center justify-center px-7 py-12 text-center motion-safe:animate-rise-in">
        <span class="grid size-[72px] place-items-center rounded bg-[#fff0ee] text-main motion-safe:animate-pop-in"><ShoppingBag :size="32" stroke-width="1.8" /></span>
        <h3 class="mb-2 mt-5 text-lg font-bold">{{ $t('cart.emptyTitle') }}</h3>
        <p class="mb-6 max-w-[290px] text-[13px] leading-6 text-[#6f746c]">{{ $t('cart.emptyText') }}</p>
        <button class="flex min-h-11 items-center justify-center gap-2 rounded bg-main px-5 text-sm font-bold text-white transition-colors hover:bg-[#e94330]" type="button" @click="emit('browse')">{{ $t('cart.browse') }} <ArrowRight class="rtl:rotate-180" :size="17" /></button>
      </div>

      <TransitionGroup v-else tag="div" class="flex-1 overflow-y-auto px-4 py-1 sm:px-6" enter-active-class="transition duration-300 ease-out motion-reduce:transition-none" enter-from-class="translate-x-3 opacity-0 rtl:-translate-x-3" leave-active-class="transition duration-200 ease-in motion-reduce:transition-none" leave-to-class="translate-x-3 opacity-0 rtl:-translate-x-3" move-class="transition-transform duration-200 motion-reduce:transition-none">
        <article v-for="item in cart" :key="cartItemKey(item)" class="grid grid-cols-[84px_minmax(0,1fr)] gap-4 border-b border-[#e9ebe5] py-5">
          <div class="grid h-24 w-[84px] place-items-center overflow-hidden rounded bg-[#f3f4f0] text-main">
            <img v-if="item.image" class="size-full object-cover" :src="resolveAssetUrl(item.image)" :alt="item.name">
            <Lightbulb v-else :size="28" stroke-width="1.7" />
          </div>
          <div class="flex min-w-0 flex-col justify-between gap-3">
            <div>
              <div class="flex items-start justify-between gap-3">
                <h3 class="min-w-0 break-words text-sm font-bold leading-5">{{ item.name }}</h3>
                <button class="grid size-8 shrink-0 place-items-center rounded text-[#858b81] transition-colors hover:bg-[#fff0ee] hover:text-main" type="button" :aria-label="$t('cart.remove')" @click="removeFromCart(cartItemKey(item))"><Trash2 :size="17" /></button>
              </div>
              <p v-if="itemSelection(item)" class="mt-1 break-words text-[11px] leading-4 text-[#6f746c]">{{ itemSelection(item) }}</p>
              <p class="mt-1 text-[11px] font-semibold text-[#777d73]">{{ formatPrice(item.price) }}</p>
            </div>
            <div class="flex items-end justify-between gap-3">
              <div class="grid h-9 w-[108px] shrink-0 grid-cols-[34px_40px_34px] items-center rounded border border-[#dfe2da] bg-white">
                <button class="grid size-[34px] place-items-center transition hover:bg-[#f3f4f0] active:scale-90 motion-reduce:transition-none" type="button" :aria-label="$t('cart.decrease')" @click="updateQuantity(cartItemKey(item), -1)"><Minus :size="15" /></button>
                <span class="text-center text-xs font-extrabold">{{ item.quantity }}</span>
                <button class="grid size-[34px] place-items-center transition hover:bg-[#f3f4f0] active:scale-90 motion-reduce:transition-none" type="button" :aria-label="$t('cart.increase')" @click="updateQuantity(cartItemKey(item), 1)"><Plus :size="15" /></button>
              </div>
              <strong class="break-words text-end text-sm">{{ formatPrice(itemTotal(item)) }}</strong>
            </div>
          </div>
        </article>
      </TransitionGroup>

      <footer v-if="cart.length" class="shrink-0 border-t border-[#dfe2da] bg-[#fafaf7] px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-5 shadow-[0_-10px_30px_rgba(29,36,46,0.05)] sm:px-6">
        <div class="mb-4 flex items-end justify-between gap-4"><span class="text-[13px] font-semibold text-[#6f746c]">{{ $t('cart.total') }}</span><strong class="text-xl leading-none">{{ formatPrice(cartTotal) }}</strong></div>
        <button class="group flex min-h-12 w-full items-center justify-center gap-2 rounded bg-main px-5 text-sm font-bold text-white transition-colors hover:bg-[#e94330]" type="button" @click="requestOrder">{{ $t('cart.request') }} <ArrowRight class="transition-transform duration-200 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1 motion-reduce:transition-none" :size="18" /></button>
        <p class="mx-auto mt-2.5 max-w-[330px] text-center text-[10px] leading-4 text-[#6f746c]">{{ $t('cart.checkoutNote') }}</p>
      </footer>
    </aside>
  </Transition>
</template>
