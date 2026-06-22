import { defineConfig } from 'vite';

// base: './' makes every emitted URL relative, so the static build runs from any
// path — GitHub Pages project subpaths (/okcc-engine/), Cloudflare Pages, or a
// plain file host — with no rebuild. (CLAUDE.md: static and serverless.)
//
// assetsDir: 'build' keeps Vite's hashed JS/CSS out of `assets/`, so the kids'
// drop-in art under public/assets/ stays in a clean, predictable place in dist/.
export default defineConfig({
  base: './',
  build: {
    assetsDir: 'build',
    target: 'es2020',
    // Phaser is one big dependency; a single ~1.5MB chunk is expected and fine
    // for a static game. Raise the warning ceiling so CI logs stay clean.
    chunkSizeWarningLimit: 1600,
  },
  server: {
    host: true,
  },
});
