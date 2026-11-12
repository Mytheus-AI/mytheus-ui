/* Runs once, as an inline script in the root layout's <head>, before first paint: reads the saved
   choice (`mx-theme`, absent means "follow the system") and writes the resolved theme to
   `<html data-theme>`. The attribute lives on <html> on purpose: <html> is never re-rendered by a
   client-side navigation, so the theme survives every route change (an inline script inside a
   client-rendered subtree does NOT run on a client navigation, which is why a theme kept on the
   `.mx-app` root came back light after a trip through the auth pages). The dark token set in
   src/styles/app-theme.css applies under `:root[data-theme="dark"]` to `.mx-app` and `.mx-auth`;
   the marketing site has no dark set, so it is unaffected. `ThemeSync` keeps the attribute in
   step with later changes (the OS setting, another tab). */
export const THEME_INIT =
  '(function(){try{var t=localStorage.getItem("mx-theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.setAttribute("data-theme",t)}catch(e){}})()';
