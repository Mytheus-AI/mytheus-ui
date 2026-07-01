import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Log in — Mytheus" };

export default function Page() {
  return (
    <ComingSoon
      eyebrow="Welcome back"
      title="Log in is on its way."
      blurb="Accounts aren't open just yet. Mytheus is still being built — you'll be able to sign in here soon."
    />
  );
}
