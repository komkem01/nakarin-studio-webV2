// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      apiBase: 'http://localhost:8080',
      paymentMethods: [
        {
          id: 'kbank-main',
          channel: 'bank',
          bankName: 'ธนาคารกสิกรไทย',
          accountName: 'Nakarin Studio',
          accountNumber: '123-4-56789-0',
        },
        {
          id: 'scb-main',
          channel: 'bank',
          bankName: 'ธนาคารไทยพาณิชย์',
          accountName: 'Nakarin Studio',
          accountNumber: '987-6-54321-0',
        },
        {
          id: 'promptpay-main',
          channel: 'promptpay',
          accountName: 'Nakarin Studio',
          promptPayId: '0891234567',
        },
      ],
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
