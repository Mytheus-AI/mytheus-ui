/* Runs as an inline script inside the `.mx-app` root, before first paint: reads the saved or OS
   colour scheme and writes it to the root's `data-theme`, so there is no light flash in dark mode.
   `document.currentScript.parentElement` is the `.mx-app` element that contains the script. */
export const THEME_INIT =
  '(function(){try{var t=localStorage.getItem("mx-theme")||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.currentScript.parentElement.setAttribute("data-theme",t)}catch(e){}})()';
