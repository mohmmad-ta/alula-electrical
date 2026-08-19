<script setup>
import { RouterLink } from 'vue-router';

const currentYear = new Date().getFullYear();
</script>

<template>
  <footer class="bg-secondary text-[#c8cdc3]">
    <div class="mx-auto flex min-h-[155px] w-[min(1180px,calc(100%-48px))] items-center justify-between gap-6 max-sm:min-h-[210px] max-sm:w-[calc(100%-28px)] max-sm:flex-col max-sm:items-start max-sm:justify-center">
      <RouterLink class="shrink-0" :to="{ name: 'home' }" :aria-label="$t('brand.homeLabel')">
        <p class="m-0 text-xl font-bold text-white">{{ $t('brand.logo') }}</p>
      </RouterLink>
      <p class="m-0 text-xs">{{ $t('footer.description') }}</p>
      <p class="m-0 text-xs">{{ $t('footer.copyright', { year: currentYear }) }}</p>
    </div>
  </footer>
</template>
