import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Hello } from './hello';

import { config } from './config';

window.addEventListener('load', init);

let app: firebase.app.App;

function init() {
  console.log("Application startup ...");

  ReactDOM.render(
      <Hello compiler="Typescript" framework="React" />,
    document.getElementById('example')
  );

  app = firebase.initializeApp(config);
  console.log(app);
}
