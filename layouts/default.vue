<template>
  <div class="min-h-screen flex flex-col bg-white dark:bg-neutral-950">
    <AppHeader />
    <main class="flex-1">
      <slot />
    </main>
    <AppFooter />
    <BaseToast position="top-end" />
  </div>
</template>
