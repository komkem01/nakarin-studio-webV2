// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      apiBase: 'http://localhost:8080',
    },
  },

  vue: {
    compilerOptions: {
      isCustomElement: (tag) => tag.startsWith('calendar-'),
    },
  },

  // Route rules: separate admin and customer sections
  routeRules: {
    '/admin/**': { ssr: false },
  },

  app: {
    head: {
      title: 'Nakarin Studio',
      meta: [
        { name: 'description', content: 'รับจองและสั่งทำบายศรี Nakarin Studio' },
      ],
    },
  },
})
