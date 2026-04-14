<template>
  <div class="min-h-screen flex flex-col bg-white dark:bg-neutral-950">
    <LayoutAppHeader />
    <main class="flex-1 pt-16">
      <slot />
    </main>
    <LayoutAppFooter />
    <BaseToast position="top-end" />
  </div>
</template>
