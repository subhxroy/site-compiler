export function generateNuxtConfig(): string {
  return `// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      htmlAttrs: {
        lang: 'en',
      },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
    },
  },
});
`;
}

export function generateNuxtPackageJson(projectName: string = 'sitecompiler-nuxt-export'): string {
  return JSON.stringify(
    {
      name: projectName,
      private: true,
      type: 'module',
      scripts: {
        build: 'nuxt build',
        dev: 'nuxt dev',
        generate: 'nuxt generate',
        preview: 'nuxt preview',
        postinstall: 'nuxt prepare',
      },
      dependencies: {
        nuxt: '^3.14.1592',
        vue: '^3.5.12',
        'vue-router': '^4.4.5',
        'lucide-vue-next': '^0.468.0',
      },
      devDependencies: {
        '@nuxtjs/tailwindcss': '^6.12.2',
        tailwindcss: '^3.4.14',
      },
    },
    null,
    2
  );
}

export function generateNuxtAppVue(): string {
  return `<template>
  <div class="min-h-screen bg-[#0d0e12] text-[#e1e2e5] antialiased">
    <NuxtPage />
  </div>
</template>
`;
}
