// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  modules: ['nuxt-primevue', '@nuxtjs/tailwindcss', 'nuxt-lodash'],
  css: ['primevue/resources/themes/aura-light-green/theme.css', 'primeicons/primeicons.css'],
  nitro: {
    externals: {
      inline: ['pg'],
    },
  }
})