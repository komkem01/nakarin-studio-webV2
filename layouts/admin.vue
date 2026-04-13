<template>
  <div class="min-h-screen bg-[#f0fdf4] flex flex-col">
    <AdminSidebar />
    <div class="flex flex-col flex-1 md:pl-64">
      <AdminHeader />
      <main class="flex-1 p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
