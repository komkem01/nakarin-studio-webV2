import { useEffect } from "react";
import { useRouter } from "next/router";

import { getCustomerSession } from "../../store/customerSession";

type CustomerGuardProps = {
  children: React.ReactNode;
};

export default function CustomerGuard({ children }: CustomerGuardProps) {
  const router = useRouter();

  useEffect(() => {
    const session = getCustomerSession();
    if (!session) {
      void router.replace("/customer/login");
    }
  }, [router]);

  return <>{children}</>;
}
