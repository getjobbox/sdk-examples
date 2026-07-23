import { createRouter, createWebHistory } from 'vue-router'
import JobsView from './views/JobsView.vue'

/** Category slug for HR & People in the JobBox catalog. */
export const HR_CATEGORY_SLUG = 'hr'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'all-jobs',
      component: JobsView,
      meta: { title: 'All Jobs' },
    },
    {
      path: '/hr',
      name: 'hr-jobs',
      component: JobsView,
      meta: {
        title: 'HR Jobs',
        lockedCategory: HR_CATEGORY_SLUG,
      },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

router.afterEach((to) => {
  const page = to.meta.title ? String(to.meta.title) : 'Jobs'
  document.title = `${page} · JobFinder`
})

export default router
