<template>
  <footer class="border-t border-emerald-100 bg-white">
    <UContainer>
      <div class="py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Brand -->
        <div class="space-y-3">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center text-sm font-extrabold">N</div>
            <span class="font-bold text-sm tracking-wide text-emerald-800 uppercase">Nakarin Studio</span>
          </div>
          <p class="text-sm text-neutral-500 leading-relaxed">
            บริการบายศรีชั้นนำ ครบครัน จองง่าย อิทธิพลแน่นอน
          </p>
        </div>

        <!-- Links -->
        <div class="space-y-3">
          <h3 class="text-xs font-semibold text-emerald-800 uppercase tracking-widest">บริการ</h3>
          <ul class="space-y-2 text-sm text-slate-500">
            <li><a href="/#products" class="hover:text-emerald-700 transition-colors">รูปแบบบายศรี</a></li>
            <li><a href="/#packages" class="hover:text-emerald-700 transition-colors">แพคเกจพิเศษ</a></li>
            <li><NuxtLink to="/booking" class="hover:text-emerald-700 transition-colors">จองออนไลน์</NuxtLink></li>
          </ul>
        </div>

        <!-- Contact -->
        <div class="space-y-3">
          <h3 class="text-xs font-semibold text-emerald-800 uppercase tracking-widest">ติดต่อเรา</h3>
          <ul class="space-y-2 text-sm text-slate-500">
            <li class="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-emerald-700 shrink-0">
                <path fill-rule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.716 3.223a1.5 1.5 0 0 1-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 0 0 6.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 0 1 1.767-1.052l3.223.716A1.5 1.5 0 0 1 18 16.352V17.5a1.5 1.5 0 0 1-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 0 1 2.43 8.326 13.019 13.019 0 0 1 2 5V3.5Z" clip-rule="evenodd" />
              </svg>
              <span>02-xxx-xxxx</span>
            </li>
            <li class="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-emerald-700 shrink-0">
                <path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z" />
                <path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z" />
              </svg>
              <span>hello@nakarinstudio.com</span>
            </li>
            <li class="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-emerald-700 shrink-0">
                <path fill-rule="evenodd" d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C14.93 15.045 16.75 12.418 16.75 9a6.75 6.75 0 0 0-13.5 0c0 3.418 1.819 6.045 3.105 7.583A13.196 13.196 0 0 0 9.69 18.933ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" clip-rule="evenodd" />
              </svg>
              <span>กรุงเทพมหานคร</span>
            </li>
          </ul>
        </div>
      </div>

      <div class="py-4 border-t border-emerald-100 text-xs text-center text-slate-400">
        © {{ new Date().getFullYear() }} Nakarin Studio. สงวนลิขสิทธิ์ทุกประการ
      </div>
    </UContainer>
  </footer>
</template>
