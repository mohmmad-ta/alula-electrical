import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { useAdminAuth } from '../composables/useAdminAuth'
import { useUserAuth } from '../composables/useUserAuth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/products',
      name: 'products',
      component: () => import('../views/ProductCatalogView.vue'),
    },
    {
      path: '/products/:id',
      name: 'product-detail',
      component: () => import('../views/ProductDetailView.vue'),
    },
    {
      path: '/login',
      name: 'user-login',
      component: () => import('../views/UserLoginView.vue'),
      meta: { userGuestOnly: true },
    },
    {
      path: '/checkout',
      name: 'checkout',
      component: () => import('../views/CheckoutView.vue'),
      meta: { requiresUser: true },
    },
    {
      path: '/admin/login',
      name: 'admin-login',
      component: () => import('../views/admin/AdminLoginView.vue'),
      meta: { adminGuestOnly: true },
    },
    {
      path: '/admin',
      name: 'admin-dashboard',
      component: () => import('../views/admin/AdminDashboardView.vue'),
      meta: { requiresAdmin: true },
    },
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, top: 116, behavior: 'smooth' }
    return { top: 0 }
  },
})

router.beforeEach(async (to) => {
  if (to.meta.requiresAdmin || to.meta.adminGuestOnly) {
    const { checkAdminSession } = useAdminAuth()
    const isAdmin = await checkAdminSession()

    if (to.meta.requiresAdmin && !isAdmin) {
      return {
        name: 'admin-login',
        query: { redirect: to.fullPath },
      }
    }

    if (to.meta.adminGuestOnly && isAdmin) return { name: 'admin-dashboard' }
  }

  if (to.meta.requiresUser || to.meta.userGuestOnly) {
    const { checkUserSession } = useUserAuth()
    const isUser = await checkUserSession()

    if (to.meta.requiresUser && !isUser) {
      return {
        name: 'user-login',
        query: { redirect: to.fullPath },
      }
    }

    if (to.meta.userGuestOnly && isUser) return { name: 'checkout' }
  }

  return true
})

export default router
