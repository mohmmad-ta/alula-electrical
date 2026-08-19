<script setup>
import { reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, useRouter } from 'vue-router';
import { ArrowRight, Check, Lightbulb, LoaderCircle, MapPin, PackageCheck, Phone, UserRound } from '@lucide/vue';
import api, { resolveAssetUrl } from '../../axios/axios';
import CartDrawer from '../components/CartDrawer.vue';
import StoreFooter from '../components/StoreFooter.vue';
import StoreNavbar from '../components/StoreNavbar.vue';
import { useCart } from '../composables/useCart';
import { useUserAuth } from '../composables/useUserAuth';

const router = useRouter();
const { t, locale } = useI18n();
const { cart, cartCount, cartTotal, clearCart } = useCart();
const { user, clearUserSession } = useUserAuth();

const cartOpen = ref(false);
const submitting = ref(false);
const error = ref('');
const completedOrder = ref(null);
const form = reactive({ city: '', district: '', address: '', notes: '' });

const formatPrice = (value) => `${new Intl.NumberFormat(locale.value === 'ar' ? 'ar-IQ' : 'en-IQ').format(Number(value || 0))} ${t('currency')}`;
const itemSelection = (item) => [item.option?.title, ...(item.tags || []).map((tag) => tag.title)].filter(Boolean).join(' · ');

const placeOrder = async () => {
  error.value = '';
  submitting.value = true;
  try {
    const response = await api.post('/order', {
      item: cart.value.map((item) => ({
        Id: item._id,
        count: item.quantity,
        option: item.option ? { title: item.option.title } : undefined,
        tags: (item.tags || []).map((tag) => ({ title: tag.title })),
      })),
      location: {
        city: form.city,
        district: form.district,
        address: form.address,
        notes: form.notes,
      },
    });
    completedOrder.value = response.data?.data?.order || null;
    clearCart();
  } catch (requestError) {
    if (requestError.response?.status === 401) {
      clearUserSession();
      await router.replace({ name: 'user-login', query: { redirect: '/checkout' } });
      return;
    }
    error.value = requestError.response?.data?.message || t('checkout.orderError');
  } finally {
    submitting.value = false;
  }
};

const browseFromCart = () => {
  cartOpen.value = false;
  router.push({ name: 'products' });
};
</script>

<template>
  <div class="min-h-screen bg-[#f5f6f2] text-secondary">
    <StoreNavbar :cart-count="cartCount" @open-cart="cartOpen = true" />

    <main class="mx-auto w-[min(1180px,calc(100%-48px))] py-14 max-sm:w-[calc(100%-28px)] max-sm:py-9">
      <section v-if="completedOrder" class="mx-auto flex min-h-[520px] max-w-[680px] flex-col items-center justify-center text-center motion-safe:animate-rise-in" aria-labelledby="order-success-title">
        <span class="grid size-20 place-items-center rounded bg-[#e7f6ec] text-[#1f7a43] motion-safe:animate-pop-in"><PackageCheck :size="38" /></span>
        <p class="mb-3 mt-6 text-[10px] font-extrabold uppercase text-main">{{ $t('checkout.successEyebrow') }}</p>
        <h1 id="order-success-title" class="text-[38px] font-bold leading-tight max-sm:text-[31px]">{{ $t('checkout.successTitle') }}</h1>
        <p class="mt-3 max-w-[520px] text-sm leading-6 text-[#687066]">{{ $t('checkout.successText') }}</p>
        <p class="mt-6 rounded border border-[#d8ddd4] bg-white px-4 py-3 font-mono text-xs font-bold">{{ $t('checkout.orderNumber') }}: {{ completedOrder._id }}</p>
        <RouterLink class="mt-7 flex min-h-11 items-center justify-center gap-2 rounded bg-main px-5 text-sm font-bold text-white" :to="{ name: 'products' }">{{ $t('checkout.continueShopping') }} <ArrowRight class="rtl:rotate-180" :size="18" /></RouterLink>
      </section>

      <section v-else-if="!cart.length" class="mx-auto flex min-h-[520px] max-w-[620px] flex-col items-center justify-center text-center motion-safe:animate-rise-in" aria-labelledby="empty-checkout-title">
        <span class="grid size-16 place-items-center rounded bg-[#fff0ee] text-main motion-safe:animate-pop-in"><Lightbulb :size="30" /></span>
        <h1 id="empty-checkout-title" class="mt-5 text-2xl font-bold">{{ $t('checkout.emptyTitle') }}</h1>
        <p class="mt-2 text-sm text-[#687066]">{{ $t('checkout.emptyText') }}</p>
        <RouterLink class="mt-6 flex min-h-11 items-center justify-center rounded bg-main px-5 text-sm font-bold text-white" :to="{ name: 'products' }">{{ $t('checkout.browseProducts') }}</RouterLink>
      </section>

      <template v-else>
        <nav class="mb-7 flex items-center gap-2 text-xs font-bold text-[#737a70] motion-safe:animate-fade-in" :aria-label="$t('nav.label')"><RouterLink class="hover:text-main" :to="{ name: 'home' }">{{ $t('checkout.home') }}</RouterLink><span>/</span><span class="text-secondary">{{ $t('checkout.title') }}</span></nav>
        <div class="mb-9 max-w-[760px] motion-safe:animate-rise-in"><p class="mb-3 text-[10px] font-extrabold uppercase text-main">{{ $t('checkout.eyebrow') }}</p><h1 class="text-[40px] font-bold leading-tight max-sm:text-[32px]">{{ $t('checkout.title') }}</h1><p class="mt-3 text-sm leading-6 text-[#687066]">{{ $t('checkout.description') }}</p></div>

        <form class="grid grid-cols-[minmax(0,1fr)_390px] items-start gap-8 max-lg:grid-cols-1" @submit.prevent="placeOrder">
          <section class="border-t border-[#d9ddd5] pt-6 motion-safe:animate-rise-in-delay" aria-labelledby="delivery-details-title">
            <div class="mb-6 flex items-center gap-3"><span class="grid size-10 place-items-center rounded bg-[#fff0ee] text-main"><MapPin :size="21" /></span><div><p class="text-[10px] font-bold uppercase text-[#777d73]">{{ $t('checkout.step') }}</p><h2 id="delivery-details-title" class="mt-0.5 text-lg font-bold">{{ $t('checkout.deliveryTitle') }}</h2></div></div>

            <div class="mb-6 grid grid-cols-2 gap-3 border border-[#dce0d8] bg-white p-4 max-sm:grid-cols-1">
              <div class="flex items-center gap-3"><UserRound :size="18" class="text-main" /><div><p class="text-[10px] font-bold text-[#777d73]">{{ $t('checkout.customer') }}</p><p class="mt-1 text-xs font-extrabold">{{ user?.name }}</p></div></div>
              <div class="flex items-center gap-3"><Phone :size="18" class="text-main" /><div><p class="text-[10px] font-bold text-[#777d73]">{{ $t('checkout.phone') }}</p><p class="mt-1 text-xs font-extrabold" dir="ltr">{{ user?.phone }}</p></div></div>
            </div>

            <div class="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
              <label><span class="mb-2 block text-xs font-bold">{{ $t('checkout.city') }}</span><input v-model="form.city" class="h-12 w-full rounded border border-[#ccd1c8] bg-white px-3 text-sm outline-none focus:border-main focus:ring-4 focus:ring-main/10" type="text" maxlength="80" required :placeholder="$t('checkout.cityPlaceholder')"></label>
              <label><span class="mb-2 block text-xs font-bold">{{ $t('checkout.district') }} <small class="font-normal text-[#7a8177]">({{ $t('checkout.optional') }})</small></span><input v-model="form.district" class="h-12 w-full rounded border border-[#ccd1c8] bg-white px-3 text-sm outline-none focus:border-main focus:ring-4 focus:ring-main/10" type="text" maxlength="120" :placeholder="$t('checkout.districtPlaceholder')"></label>
            </div>
            <label class="mt-4 block"><span class="mb-2 block text-xs font-bold">{{ $t('checkout.address') }}</span><textarea v-model="form.address" class="min-h-28 w-full rounded border border-[#ccd1c8] bg-white p-3 text-sm leading-6 outline-none focus:border-main focus:ring-4 focus:ring-main/10" minlength="5" maxlength="240" required :placeholder="$t('checkout.addressPlaceholder')"></textarea></label>
            <label class="mt-4 block"><span class="mb-2 block text-xs font-bold">{{ $t('checkout.notes') }} <small class="font-normal text-[#7a8177]">({{ $t('checkout.optional') }})</small></span><textarea v-model="form.notes" class="min-h-24 w-full rounded border border-[#ccd1c8] bg-white p-3 text-sm leading-6 outline-none focus:border-main focus:ring-4 focus:ring-main/10" maxlength="300" :placeholder="$t('checkout.notesPlaceholder')"></textarea></label>
          </section>

          <aside class="sticky top-[132px] rounded-md border border-[#d9ddd5] bg-white p-5 motion-safe:animate-rise-in-delay max-lg:static" aria-labelledby="order-summary-title">
            <div class="flex items-center justify-between border-b border-[#e1e4dd] pb-4"><h2 id="order-summary-title" class="text-lg font-bold">{{ $t('checkout.summaryTitle') }}</h2><span class="rounded-sm bg-[#fff0ee] px-2 py-1 text-[10px] font-extrabold text-main">{{ $t('checkout.itemCount', { count: cartCount }) }}</span></div>
            <div class="max-h-[340px] overflow-y-auto">
              <article v-for="item in cart" :key="item.key" class="grid grid-cols-[58px_minmax(0,1fr)_auto] gap-3 border-b border-[#eceee9] py-4">
                <span class="grid size-[58px] place-items-center overflow-hidden rounded bg-[#f2f3ef] text-main"><img v-if="item.image" class="size-full object-cover" :src="resolveAssetUrl(item.image)" :alt="item.name"><Lightbulb v-else :size="21" /></span>
                <div class="min-w-0"><h3 class="break-words text-xs font-extrabold leading-5">{{ item.name }}</h3><p v-if="itemSelection(item)" class="mt-0.5 break-words text-[10px] leading-4 text-[#747b71]">{{ itemSelection(item) }}</p><p class="mt-1 text-[10px] text-[#747b71]">{{ item.quantity }} × {{ formatPrice(item.price) }}</p></div>
                <strong class="text-end text-xs">{{ formatPrice(item.price * item.quantity) }}</strong>
              </article>
            </div>
            <div class="flex items-end justify-between gap-4 pt-5"><span class="text-xs font-bold text-[#6e756b]">{{ $t('checkout.total') }}</span><strong class="text-xl">{{ formatPrice(cartTotal) }}</strong></div>
            <p v-if="error" class="mt-4 rounded border border-main/25 bg-main/10 px-3 py-2.5 text-xs font-bold leading-5 text-[#a73528]" role="alert">{{ error }}</p>
            <button class="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded bg-main px-5 text-sm font-extrabold text-white transition hover:bg-[#e94330] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none" type="submit" :disabled="submitting"><LoaderCircle v-if="submitting" class="animate-spin motion-reduce:animate-none" :size="18" /><Check v-else :size="18" />{{ $t(submitting ? 'checkout.placing' : 'checkout.placeOrder') }}</button>
            <p class="mt-3 text-center text-[10px] leading-4 text-[#737a70]">{{ $t('checkout.confirmationNote') }}</p>
          </aside>
        </form>
      </template>
    </main>

    <StoreFooter />
    <CartDrawer :open="cartOpen" @close="cartOpen = false" @browse="browseFromCart" />
  </div>
</template>
