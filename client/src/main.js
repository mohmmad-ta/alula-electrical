import './assets/main.css'
import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'

import App from './App.vue'
import router from './router'
import en from './locales/en.json'
import ar from './locales/ar.json'

const app = createApp(App)
const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem('alula-locale') || 'en',
  fallbackLocale: 'ar',
  messages: { en, ar },
})

app.use(router)
app.use(i18n)

app.mount('#app')
