export function useRouter() {
  return { push: () => undefined, replace: () => undefined, refresh: () => undefined, back: () => undefined };
}
export function notFound(): never {
  throw new Error("notFound");
}
