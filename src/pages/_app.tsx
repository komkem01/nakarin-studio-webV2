import type { AppProps } from "next/app";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import "../styles/globals.css";
import { ToastProvider } from "../components/ui/Toast";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function start() {
      if (pendingTimer.current) clearTimeout(pendingTimer.current);
      pendingTimer.current = setTimeout(() => setLoading(true), 80);
    }

    function done() {
      if (pendingTimer.current) {
        clearTimeout(pendingTimer.current);
        pendingTimer.current = null;
      }
      setLoading(false);
    }

    router.events.on("routeChangeStart", start);
    router.events.on("routeChangeComplete", done);
    router.events.on("routeChangeError", done);

    return () => {
      router.events.off("routeChangeStart", start);
      router.events.off("routeChangeComplete", done);
      router.events.off("routeChangeError", done);
      if (pendingTimer.current) clearTimeout(pendingTimer.current);
    };
  }, [router.events]);

  return (
    <>
      <Head>
        <title>NAKARIN STUDIO</title>
        <meta name="description" content="สั่งจองงานบายศรี เลือกแบบสินค้า และติดตามสถานะการจอง" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      {loading ? (
        <div className="pointer-events-none fixed inset-0 z-[9999]">
          <div className="h-1 w-full overflow-hidden bg-emerald-100">
            <div className="h-full w-1/3 animate-pulse bg-emerald-700" />
          </div>
          <div className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-emerald-800 shadow">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" />
            Loading...
          </div>
        </div>
      ) : null}

      <ToastProvider>
        <Component {...pageProps} />
      </ToastProvider>
    </>
  );
}
