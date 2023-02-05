// vite.config.js
import glsl from 'vite-plugin-glsl';
import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert'; 

export default defineConfig({
  base: '', 
  plugins: [glsl(), mkcert()]
});
