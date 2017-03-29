import { config } from './config';

window.addEventListener('load', init);

let app: firebase.app.App;

function init() {
  console.log("Application startup ...");

  app = firebase.initializeApp(config);
  console.log(app);
}
