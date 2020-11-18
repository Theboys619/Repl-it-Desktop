function init(port) {

  const axios = require("axios");
  const express = require("express");
  const settings = require("electron-settings");
  const app = express();

  //fileheadername

  app.get("/", (req, res) => {
    if (settings.get("loggedin")) {
      return res.redirect("https://repl.it/~");
    }
    res.redirect('https://repl.it/login');
  });

  app.listen(port, () => {
    console.log(`Hosted on port ${port}`);
  });



}

module.exports = init;
