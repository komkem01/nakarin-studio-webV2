import { useEffect } from "react";
import { useRouter } from "next/router";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    void router.replace("/customer");
  }, [router]);

  return null;
}
