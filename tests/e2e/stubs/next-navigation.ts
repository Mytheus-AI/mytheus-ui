export function useRouter() {
  return { push: () => undefined, replace: () => undefined, refresh: () => undefined, back: () => undefined };
}
export function useSearchParams() {
  return new URLSearchParams();
}
export function usePathname() {
  return "/";
}
export function notFound(): never {
  throw new Error("notFound");
}
