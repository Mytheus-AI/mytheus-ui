import type { Metadata } from "next";
import { SsoCallback } from "@/components/auth/SsoCallback";

export const metadata: Metadata = { title: "Signing you in · Mytheus" };

/** Where Google returns to. Clerk completes the handshake and any bot check here. */
export default function Page() {
  return <SsoCallback />;
}
