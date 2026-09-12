import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';

const routes: Array<RouteRecordRaw> = [
  { path: '/', redirect: '/tabs/photos' },
  {
    path: '/tabs',
    component: () => import('@/views/TabsPage.vue'),
    children: [
      { path: '', redirect: '/tabs/photos' },
      { path: 'photos', component: () => import('@/views/AllPhotosPage.vue') },
      { path: 'albums', component: () => import('@/views/AlbumsPage.vue') },
      { path: 'albums/:id', component: () => import('@/views/AlbumDetailPage.vue') },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
