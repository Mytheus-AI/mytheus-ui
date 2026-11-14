import { lazy, Suspense, type ComponentType } from "react";

// next/dynamic without Next: React.lazy behind a Suspense with no fallback.
export default function dynamic<P extends object>(loader: () => Promise<ComponentType<P>>): ComponentType<P> {
  const Lazy = lazy(async () => ({ default: await loader() }));
  return function Dynamic(props: P) {
    return (
      <Suspense fallback={null}>
        <Lazy {...props} />
      </Suspense>
    );
  };
}
