import type { Metadata } from "next";
import { AskView } from "@/components/search/AskView";

export const metadata: Metadata = { title: "Ask | Mytheus" };

export default function SearchPage({ searchParams }: { searchParams: { q?: string | string[] } }) {
  const q = Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q;
  return <AskView initialQuery={(q ?? "").slice(0, 1000)} />;
}
