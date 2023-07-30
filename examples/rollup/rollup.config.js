const path = require('path');
const svelte = require('rollup-plugin-svelte');
const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const terser = require('@rollup/plugin-terser');
const serve = require('rollup-plugin-serve');
const css = require('rollup-plugin-css-only');
const livereload = require('rollup-plugin-livereload');
const svelteExtend = require('svelte-extend/rollup');

// eslint-disable-next-line no-process-env
const mode = process.env.NODE_ENV || 'development';
const prod = mode === 'production';

module.exports = {
  input: 'src/index.js',
  output: {
    sourcemap: true,
    format: 'iife',
    name: 'app',
    file: path.join(__dirname, 'public', 'dist', 'bundle.js'),
  },
  plugins: [
    svelteExtend(),
    svelte(),
    css({
      output: 'bundle.css',
    }),
    resolve({
      browser: true,
      dedupe: ['svelte'],
    }),
    commonjs(),
    ...(prod
      ? [terser()]
      : [
          serve({
            port: 8080,
            contentBase: 'public',
          }),
          livereload({ watch: 'public', port: 8080 }),
        ]),
  ],
  watch: {
    clearScreen: false,
  },
};
