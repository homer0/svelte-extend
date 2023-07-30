import './global.css';
import App from './app.svelte';

export const createApp = (props) =>
  new App({
    target: document.body,
    props,
  });
