import { createApp } from 'vue'
import App from './App.vue'
import router from './router';

// Catch anything that would otherwise leave a silent blank screen (a native app
// has no browser dev console visible by default) and render it on-screen instead.
const renderCrashScreen = (title: string, detail: string) => {
  const el = document.getElementById('app') ?? document.body;
  el.innerHTML = `
    <div style="padding:20px;font-family:sans-serif;background:#fff;color:#b00020;">
      <h2 style="margin-top:0;">${title}</h2>
      <pre style="white-space:pre-wrap;word-break:break-word;font-size:12px;color:#333;">${detail}</pre>
    </div>
  `;
};

window.addEventListener('error', (event) => {
  renderCrashScreen('App crashed', `${event.message}\n${event.error?.stack ?? ''}`);
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason as { message?: string; stack?: string } | undefined;
  renderCrashScreen(
    'App failed to start',
    `${reason?.message ?? String(event.reason)}\n${reason?.stack ?? ''}`
  );
});

import { IonicVue } from '@ionic/vue';

/* Core CSS required for Ionic components to work properly */
import '@ionic/vue/css/core.css';
import { defineCustomElements } from '@ionic/pwa-elements/loader';
defineCustomElements(window);

/* Basic CSS for apps built with Ionic */
import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/vue/css/padding.css';
import '@ionic/vue/css/float-elements.css';
import '@ionic/vue/css/text-alignment.css';
import '@ionic/vue/css/text-transformation.css';
import '@ionic/vue/css/flex-utils.css';
import '@ionic/vue/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* @import '@ionic/vue/css/palettes/dark.always.css'; */
/* @import '@ionic/vue/css/palettes/dark.class.css'; */
import '@ionic/vue/css/palettes/dark.system.css';

/* Theme variables */
import './theme/variables.css';

const app = createApp(App)
  .use(IonicVue)
  .use(router);

app.config.errorHandler = (err) => {
  renderCrashScreen('App crashed', String(err));
};

router.isReady()
  .then(() => {
    app.mount('#app');
  })
  .catch((err) => {
    renderCrashScreen('App failed to start', String(err));
  });
