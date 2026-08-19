<script setup>
import { watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterView } from 'vue-router';

const { t, locale } = useI18n();

watch(locale, (value) => {
  document.documentElement.lang = value;
  document.documentElement.dir = value === 'ar' ? 'rtl' : 'ltr';
  document.title = t('pageTitle');
  localStorage.setItem('alula-locale', value);
}, { immediate: true });
</script>

<template>
  <div class="min-h-screen font-sans">
    <RouterView />
  </div>
</template>
