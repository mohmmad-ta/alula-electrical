<script setup>
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { ArrowLeft, Eye, EyeOff, Languages, LoaderCircle, LockKeyhole, ShieldCheck } from '@lucide/vue';
import { useAdminAuth } from '../../composables/useAdminAuth';

const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();
const { loginAdmin } = useAdminAuth();

const userID = ref('');
const password = ref('');
const showPassword = ref(false);
const submitting = ref(false);
const error = ref('');

const toggleLocale = () => {
  locale.value = locale.value === 'ar' ? 'en' : 'ar';
};

const submitLogin = async () => {
  submitting.value = true;
  error.value = '';

  try {
    await loginAdmin({ userID: userID.value.trim(), password: password.value });
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/admin')
      ? route.query.redirect
      : '/admin';
    await router.replace(redirect);
  } catch (requestError) {
    const status = requestError.response?.status;
    error.value = status === 401
      ? 'admin.login.invalid'
      : status === 429
        ? 'admin.login.rateLimited'
        : 'admin.login.genericError';
  } finally {
    submitting.value = false;
  }
};

watch(locale, () => {
  document.title = `${t('admin.login.title')} | ${t('pageTitle')}`;
}, { immediate: true });
</script>

<template>
  <main class="grid min-h-screen grid-cols-[0.9fr_1.1fr] bg-[#f6f7f5] text-secondary max-lg:grid-cols-1">
    <section class="relative flex min-h-screen flex-col justify-between overflow-hidden bg-secondary px-[clamp(28px,6vw,88px)] py-10 text-white max-lg:min-h-[340px] max-lg:py-7" aria-labelledby="admin-brand-title">
      <div class="flex items-center justify-between gap-4">
        <RouterLink class="flex items-center gap-3" :to="{ name: 'home' }" :aria-label="$t('brand.homeLabel')">
          <img class="size-16 object-contain" src="/logo-brand.png" :alt="$t('brand.homeLabel')">
          <span><strong class="block text-xl">{{ $t('brand.logo') }}</strong><small class="text-[10px] text-white/65">{{ $t('brand.tagline') }}</small></span>
        </RouterLink>
        <button class="flex min-h-10 items-center gap-2 rounded border border-white/20 px-3 text-xs font-bold hover:border-main" type="button" @click="toggleLocale"><Languages :size="17" /> {{ $t('nav.language') }}</button>
      </div>

      <div class="max-w-[520px] py-14 max-lg:py-8">
        <span class="mb-7 grid size-14 place-items-center rounded-md bg-main text-secondary"><ShieldCheck :size="30" /></span>
        <p class="mb-4 text-xs font-extrabold uppercase text-main">{{ $t('admin.login.eyebrow') }}</p>
        <h1 id="admin-brand-title" class="font-serif text-[52px] font-medium leading-[1.08] max-lg:text-[40px]">{{ $t('admin.login.secureTitle') }}</h1>
        <p class="mt-5 max-w-[450px] text-[15px] leading-7 text-white/65">{{ $t('admin.login.secureText') }}</p>
      </div>

      <RouterLink class="flex w-max items-center gap-2 text-xs font-bold text-white/70 hover:text-main" :to="{ name: 'home' }"><ArrowLeft class="rtl:rotate-180" :size="17" /> {{ $t('admin.login.backStore') }}</RouterLink>
    </section>

    <section class="flex min-h-screen items-center justify-center px-6 py-12 max-lg:min-h-0 max-sm:px-4">
      <div class="w-full max-w-[470px]">
        <div class="mb-9">
          <span class="mb-5 grid size-12 place-items-center rounded-md border border-[#dfe2da] bg-white text-main"><LockKeyhole :size="25" /></span>
          <p class="mb-3 text-xs font-extrabold uppercase text-main">{{ $t('admin.login.eyebrow') }}</p>
          <h2 class="font-serif text-[40px] font-medium leading-tight max-sm:text-[34px]">{{ $t('admin.login.title') }}</h2>
          <p class="mt-3 text-sm leading-6 text-[#6d7369]">{{ $t('admin.login.description') }}</p>
        </div>

        <form class="space-y-5" @submit.prevent="submitLogin">
          <label class="block">
            <span class="mb-2 block text-xs font-extrabold">{{ $t('admin.login.userId') }}</span>
            <input v-model="userID" class="h-12 w-full rounded border border-[#ced3ca] bg-white px-3.5 text-sm outline-none transition focus:border-main focus:ring-4 focus:ring-main/10" type="text" autocomplete="username" required :placeholder="$t('admin.login.userIdPlaceholder')">
          </label>

          <label class="block">
            <span class="mb-2 block text-xs font-extrabold">{{ $t('admin.login.password') }}</span>
            <span class="flex h-12 items-center rounded border border-[#ced3ca] bg-white focus-within:border-main focus-within:ring-4 focus-within:ring-main/10">
              <input v-model="password" class="min-w-0 flex-1 bg-transparent px-3.5 text-sm outline-none" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" required :placeholder="$t('admin.login.passwordPlaceholder')">
              <button class="grid size-11 shrink-0 place-items-center text-[#72786e] hover:text-main" type="button" :aria-label="$t(showPassword ? 'admin.login.hidePassword' : 'admin.login.showPassword')" @click="showPassword = !showPassword"><EyeOff v-if="showPassword" :size="19" /><Eye v-else :size="19" /></button>
            </span>
          </label>

          <p v-if="error" class="rounded border border-main/25 bg-main/10 px-3.5 py-3 text-xs font-bold leading-5 text-[#a42f21]" role="alert">{{ $t(error) }}</p>

          <button class="flex min-h-12 w-full items-center justify-center gap-2 rounded bg-main px-5 text-sm font-extrabold text-secondary transition hover:bg-main/90 disabled:cursor-not-allowed disabled:opacity-60" type="submit" :disabled="submitting">
            <LoaderCircle v-if="submitting" class="animate-spin" :size="19" />
            {{ $t(submitting ? 'admin.login.submitting' : 'admin.login.submit') }}
          </button>
        </form>
      </div>
    </section>
  </main>
</template>
