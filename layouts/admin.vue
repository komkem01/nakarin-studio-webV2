<script setup lang="ts">
const { start, stop } = useAdminActivityWatcher()
onMounted(start)
onUnmounted(stop)
</script>

<template>
  <div class="ns-admin-theme relative min-h-screen bg-slate-50 text-slate-900">
    <div class="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,_rgba(22,163,74,0.12),_transparent_60%)]" />

    <div class="relative flex min-h-screen">
      <AdminSidebar />
      <div class="flex flex-col flex-1 md:pl-72">
        <AdminHeader />
        <main class="flex-1 px-4 pb-6 pt-4 sm:px-6 sm:pb-8 lg:px-8 lg:pb-10">
          <div class="mx-auto w-full max-w-[1560px]">
            <slot />
          </div>
        </main>
      </div>
    </div>

    <BaseToast position="top-end" />
  </div>
</template>
