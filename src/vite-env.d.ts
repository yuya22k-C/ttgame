/// <reference types="vite/client" />

// Vite が PNG をデフォルトでアセット URL として扱うことを TS に伝える.
declare module "*.png" {
  const src: string;
  export default src;
}
