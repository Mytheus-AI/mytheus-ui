import { PageSkeleton } from "@/components/ui/Page";

/* The fallback for an (app) screen without a skeleton of its own: the shared frame, a title row
   and a grid of cards. Every routed page has its own loading.tsx; this one covers the moment the
   shell's own reads are still out. */
export default function Loading() {
  return <PageSkeleton label="Loading the page" />;
}
