"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootRedirect() {
  const router = useRouter();
  useEffect(() => {
    // After onboarding users land on platform home
    router.replace("/home");
  }, [router]);
  return null;
}
