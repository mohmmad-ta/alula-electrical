<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, Phone, UserRound } from '@lucide/vue';
import CartDrawer from '../components/CartDrawer.vue';
import StoreFooter from '../components/StoreFooter.vue';
import StoreNavbar from '../components/StoreNavbar.vue';
import { useCart } from '../composables/useCart';
import { useUserAuth } from '../composables/useUserAuth';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const { cartCount } = useCart();
const { loginUser, signupUser } = useUserAuth();

const mode = ref('login');
const loading = ref(false);
const error = ref('');
const showPassword = ref(false);
const cartOpen = ref(false);
const form = reactive({ name: '', phone: '', password: '', passwordConfirm: '' });
const isRegister = computed(() => mode.value === 'register');

watch(mode, () => {
  error.value = '';
  form.password = '';
  form.passwordConfirm = '';
});

const destination = () => {
  const redirect = route.query.redirect;
  return typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')
    ? redirect
    : '/checkout';
};

const submit = async () => {
  error.value = '';

  if (form.password.length < 8) {
    error.value = t('auth.passwordShort');
    return;
  }

  if (isRegister.value && form.password !== form.passwordConfirm) {
    error.value = t('auth.passwordMismatch');
    return;
  }

  loading.value = true;
  try {
    if (isRegister.value) {
      await signupUser({ name: form.name.trim(), phone: form.phone.trim(), password: form.password });
    } else {
      await loginUser({ phone: form.phone.trim(), password: form.password });
    }
    await router.replace(destination());
  } catch (requestError) {
    const status = requestError.response?.status;
    const code = requestError.response?.data?.code;
    if (status === 401) error.value = t('auth.invalid');
    else if (status === 429) error.value = t('auth.rateLimited');
    else if (code === 11000 || status === 409) error.value = t('auth.accountExists');
    else error.value = t('auth.genericError');
  } finally {
    loading.value = false;
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

    <main class="mx-auto grid min-h-[calc(100vh-116px)] w-[min(1180px,calc(100%-48px))] place-items-center py-16 max-sm:min-h-[calc(100vh-100px)] max-sm:w-[calc(100%-28px)] max-sm:py-10">
      <section class="w-full max-w-[510px] rounded-md border border-[#dce0d8] bg-white p-7 shadow-[0_18px_50px_rgba(29,36,46,0.08)] motion-safe:animate-rise-in max-sm:p-5" aria-labelledby="customer-login-title">
        <div class="mb-7">
          <p class="mb-3 text-[10px] font-extrabold uppercase text-main">{{ $t('auth.eyebrow') }}</p>
          <h1 id="customer-login-title" class="text-[32px] font-bold leading-tight max-sm:text-[28px]">{{ $t('auth.title') }}</h1>
          <p class="mt-3 text-sm leading-6 text-[#687066]">{{ $t('auth.description') }}</p>
        </div>

        <div class="mb-6 grid h-11 grid-cols-2 rounded border border-[#d7dbd3] bg-[#f3f4f0] p-1" role="tablist" :aria-label="$t('auth.modeLabel')">
          <button class="rounded-sm text-xs font-extrabold transition-colors" :class="mode === 'login' ? 'bg-white text-secondary shadow-sm' : 'text-[#737a70]'" type="button" role="tab" :aria-selected="mode === 'login'" @click="mode = 'login'">{{ $t('auth.loginTab') }}</button>
          <button class="rounded-sm text-xs font-extrabold transition-colors" :class="mode === 'register' ? 'bg-white text-secondary shadow-sm' : 'text-[#737a70]'" type="button" role="tab" :aria-selected="mode === 'register'" @click="mode = 'register'">{{ $t('auth.registerTab') }}</button>
        </div>

        <form class="space-y-4" @submit.prevent="submit">
          <Transition enter-active-class="transition duration-300 ease-out motion-reduce:transition-none" enter-from-class="-translate-y-2 opacity-0" leave-active-class="transition duration-150 ease-in motion-reduce:transition-none" leave-to-class="-translate-y-2 opacity-0"><label v-if="isRegister" class="block"><span class="mb-2 block text-xs font-bold">{{ $t('auth.name') }}</span><span class="flex h-12 items-center gap-2.5 rounded border border-[#ccd1c8] px-3 focus-within:border-main focus-within:ring-4 focus-within:ring-main/10"><UserRound :size="18" class="text-[#777e74]" /><input v-model="form.name" class="min-w-0 flex-1 bg-transparent text-sm outline-none" type="text" autocomplete="name" minlength="3" maxlength="40" required :placeholder="$t('auth.namePlaceholder')"></span></label></Transition>
          <label class="block"><span class="mb-2 block text-xs font-bold">{{ $t('auth.phone') }}</span><span class="flex h-12 items-center gap-2.5 rounded border border-[#ccd1c8] px-3 focus-within:border-main focus-within:ring-4 focus-within:ring-main/10"><Phone :size="18" class="text-[#777e74]" /><input v-model="form.phone" class="min-w-0 flex-1 bg-transparent text-sm outline-none" dir="ltr" type="tel" autocomplete="tel" required :placeholder="$t('auth.phonePlaceholder')"></span></label>
          <label class="block"><span class="mb-2 block text-xs font-bold">{{ $t('auth.password') }}</span><span class="flex h-12 items-center gap-2.5 rounded border border-[#ccd1c8] px-3 focus-within:border-main focus-within:ring-4 focus-within:ring-main/10"><LockKeyhole :size="18" class="text-[#777e74]" /><input v-model="form.password" class="min-w-0 flex-1 bg-transparent text-sm outline-none" :type="showPassword ? 'text' : 'password'" :autocomplete="isRegister ? 'new-password' : 'current-password'" minlength="8" required :placeholder="$t('auth.passwordPlaceholder')"><button class="grid size-8 shrink-0 place-items-center text-[#747b71]" type="button" :aria-label="$t(showPassword ? 'auth.hidePassword' : 'auth.showPassword')" @click="showPassword = !showPassword"><EyeOff v-if="showPassword" :size="18" /><Eye v-else :size="18" /></button></span></label>
          <Transition enter-active-class="transition duration-300 ease-out motion-reduce:transition-none" enter-from-class="-translate-y-2 opacity-0" leave-active-class="transition duration-150 ease-in motion-reduce:transition-none" leave-to-class="-translate-y-2 opacity-0"><label v-if="isRegister" class="block"><span class="mb-2 block text-xs font-bold">{{ $t('auth.passwordConfirm') }}</span><span class="flex h-12 items-center gap-2.5 rounded border border-[#ccd1c8] px-3 focus-within:border-main focus-within:ring-4 focus-within:ring-main/10"><LockKeyhole :size="18" class="text-[#777e74]" /><input v-model="form.passwordConfirm" class="min-w-0 flex-1 bg-transparent text-sm outline-none" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" minlength="8" required :placeholder="$t('auth.passwordConfirmPlaceholder')"></span></label></Transition>

          <p v-if="error" class="rounded border border-main/25 bg-main/10 px-3 py-2.5 text-xs font-bold leading-5 text-[#a73528]" role="alert">{{ error }}</p>

          <button class="group flex min-h-12 w-full items-center justify-center gap-2 rounded bg-main px-5 text-sm font-extrabold text-white transition hover:bg-[#e94330] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none" type="submit" :disabled="loading"><LoaderCircle v-if="loading" class="animate-spin motion-reduce:animate-none" :size="18" />{{ $t(loading ? 'auth.submitting' : isRegister ? 'auth.submitRegister' : 'auth.submitLogin') }}<ArrowRight v-if="!loading" class="transition-transform duration-200 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1 motion-reduce:transition-none" :size="18" /></button>
        </form>

        <p class="mt-5 text-center text-[11px] leading-5 text-[#747b71]">{{ $t('auth.secureNote') }}</p>
      </section>
    </main>

    <StoreFooter />
    <CartDrawer :open="cartOpen" @close="cartOpen = false" @browse="browseFromCart" />
  </div>
</template>
