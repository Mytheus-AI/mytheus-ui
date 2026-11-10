import { PageSkeleton } from "@/components/ui/Page";

/* Calm skeleton fallback for every (app) screen without its own: the shared page frame, title row
   and cards, so nothing jumps when the real page streams in. */
export default function Loading() {
  return <PageSkeleton />;
}
