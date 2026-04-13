<script setup lang="ts">
const { start, stop } = useAdminActivityWatcher()
onMounted(start)
onUnmounted(stop)
</script>

<template>
  <div class="min-h-screen bg-[#f8fafc] flex">
    <AdminSidebar />
    <div class="flex flex-col flex-1 md:pl-72">
      <AdminHeader />
      <main class="flex-1 p-4 sm:p-6 lg:p-8">
        <slot />
      </main>
    </div>
    <BaseToast position="top-end" />
  </div>
</template>
