<template>
  <div class="ns-customer-theme min-h-screen flex flex-col bg-slate-50 text-slate-900">
    <LayoutAppHeader />
    <main class="flex-1 pt-16">
      <slot />
    </main>
    <LayoutAppFooter />
    <BaseToast position="top-end" />
  </div>
</template>
