window.addEventListener('load', init);

let app: firebase.app.App;

function init() {
  console.log("Application startup ...");

  app = firebase.app();
  console.log(app);
}
