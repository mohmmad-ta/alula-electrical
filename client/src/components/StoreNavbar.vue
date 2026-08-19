<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';
import { Languages, Menu, ShoppingBag, Truck, X } from '@lucide/vue';

defineProps({
  cartCount: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits(['open-cart']);
const { locale } = useI18n();
const mobileMenuOpen = ref(false);

const toggleLocale = () => {
  locale.value = locale.value === 'ar' ? 'en' : 'ar';
};

const closeMobileMenu = () => {
  mobileMenuOpen.value = false;
};
</script>

<template>
  <div class="fixed inset-x-0 top-0 z-30">
    <div class="bg-secondary text-xs text-[#f5f4ed]">
      <div class="mx-auto flex min-h-[35px] w-[min(1180px,calc(100%-48px))] items-center justify-between max-sm:min-h-8 max-sm:w-[calc(100%-28px)] max-sm:justify-center">
        <p class="m-0 flex items-center gap-2"><Truck :size="15" /> {{ $t('utility.delivery') }}</p>
        <p class="m-0 text-[#cdd5c7] max-sm:hidden">{{ $t('utility.trust') }}</p>
      </div>
    </div>

    <header class="border-b border-secondary/10 bg-[#f7f7f2]/95 backdrop-blur-md">
      <div class="mx-auto grid min-h-[76px] w-[min(1180px,calc(100%-48px))] grid-cols-[1fr_auto_1fr] items-center gap-7 max-lg:grid-cols-[1fr_auto] max-sm:min-h-[68px] max-sm:w-[calc(100%-28px)]">
        <RouterLink class="flex w-max items-center gap-3" :to="{ name: 'home', hash: '#top' }" :aria-label="$t('brand.homeLabel')">
          <img class="size-20 object-contain max-sm:size-14" src="/logo-brand.png" :alt="$t('brand.homeLabel')">
          <span class="flex flex-col max-[480px]:hidden"><strong class="text-xl leading-none max-sm:text-lg">{{ $t('brand.logo') }}</strong><small class="mt-1 text-[10px] font-semibold text-[#6f746c] max-sm:text-[9px]">{{ $t('brand.tagline') }}</small></span>
        </RouterLink>

        <nav class="flex items-center gap-8 text-sm font-semibold max-lg:hidden" :aria-label="$t('nav.label')">
          <RouterLink class="transition-colors hover:text-main" :to="{ name: 'home', hash: '#top' }">{{ $t('nav.home') }}</RouterLink>
          <RouterLink class="transition-colors hover:text-main" :to="{ name: 'products' }">{{ $t('nav.products') }}</RouterLink>
          <RouterLink class="transition-colors hover:text-main" :to="{ name: 'home', hash: '#why-us' }">{{ $t('nav.why') }}</RouterLink>
        </nav>

        <div class="flex min-w-0 items-center justify-end gap-2 max-[380px]:gap-1.5">
          <button class="flex min-h-10 items-center justify-center gap-2 rounded border border-[#dfe2da] px-3 text-xs font-extrabold text-secondary transition-colors hover:border-main/40 hover:bg-main/10 max-[360px]:size-10 max-[360px]:p-0" type="button" @click="toggleLocale">
            <Languages :size="17" /> <span class="max-[360px]:hidden">{{ $t('nav.language') }}</span>
          </button>
          <button class="hidden size-10 items-center justify-center rounded border border-[#dfe2da] bg-transparent max-lg:flex" type="button" :aria-label="$t(mobileMenuOpen ? 'nav.menuClose' : 'nav.menuOpen')" @click="mobileMenuOpen = !mobileMenuOpen">
            <X v-if="mobileMenuOpen" :size="21" />
            <Menu v-else :size="21" />
          </button>
          <button class="relative flex min-h-10 items-center justify-center gap-2 rounded border border-main bg-main px-3 font-bold text-white transition-colors hover:bg-main/90 max-sm:size-10 max-sm:p-0" type="button" :aria-label="$t('cart.open')" @click="emit('open-cart')">
            <ShoppingBag :size="20" />
            <span class="max-sm:hidden">{{ $t('cart.title') }}</span>
            <b v-if="cartCount" class="grid min-w-[19px] place-items-center rounded-full bg-secondary px-1 text-[11px] text-white max-sm:absolute max-sm:-end-1.5 max-sm:-top-2">{{ cartCount }}</b>
          </button>
        </div>
      </div>

      <Transition enter-active-class="transition duration-200 ease-out motion-reduce:transition-none" enter-from-class="-translate-y-2 opacity-0" leave-active-class="transition duration-150 ease-in motion-reduce:transition-none" leave-to-class="-translate-y-2 opacity-0">
        <nav v-if="mobileMenuOpen" class="hidden flex-col gap-0.5 border-t border-[#dfe2da] bg-[#f7f7f2] px-6 pb-4 pt-2 max-lg:flex" :aria-label="$t('nav.mobileLabel')">
          <RouterLink class="py-3 text-sm font-bold" :to="{ name: 'home', hash: '#top' }" @click="closeMobileMenu">{{ $t('nav.home') }}</RouterLink>
          <RouterLink class="py-3 text-sm font-bold" :to="{ name: 'products' }" @click="closeMobileMenu">{{ $t('nav.products') }}</RouterLink>
          <RouterLink class="py-3 text-sm font-bold" :to="{ name: 'products', hash: '#categories' }" @click="closeMobileMenu">{{ $t('nav.categories') }}</RouterLink>
          <RouterLink class="py-3 text-sm font-bold" :to="{ name: 'home', hash: '#why-us' }" @click="closeMobileMenu">{{ $t('nav.why') }}</RouterLink>
        </nav>
      </Transition>
    </header>
  </div>

  <div class="h-[116px] max-sm:h-[100px]" aria-hidden="true"></div>
</template>
