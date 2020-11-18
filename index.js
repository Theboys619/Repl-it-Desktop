const electron = require('electron');
const discordrpc = require("./libs/discordrpc.js");
const cheerio = require("cheerio");
const path = require("path");
const settings = require("electron-settings");
const RPC = require('discord-rich-presence')("698181751759175720");

let start = 0;

let defaults = {
  details: "On Repl.it",
  state: "Main Page",
  startTimestamp: Date.now(),
  largeImageKey: 'repllogo',
  largeImageText: "On Repl.it",
  smallImageKey: "repllogosmall",
  smallImageText: "On Repl.it",
  instance: false
}

let presence = { ...defaults };

// RPC.updatePresence({
//   details: "Test",
//   state: "Test state",
//   startTimestamp: Date.now(),
//   largeImageKey: 'jslogo',
//   largeImageText: "Editing test.js",
//   smallImageKey: "repllogo",
//   smallImageText: "On Repl.it",
//   instance: false
// });

const { webContents, app, BrowserWindow } = electron;
let win;
let getFile;
let port = 4500;

function changePresence(contents) {
  let title = contents.getTitle();
  let url = contents.getURL();
  let pathname = contents.getURL().substring(contents.getURL().indexOf("repl.it"));
  if (pathname == "repl.it/talk") presence = { details: "Repl.it Talk", state: "Browsing repl talk" };
  if (url.includes('/learn')) presence = { details: "Repl.it Talk Learn", state: "Browsing repl talk learn" };
  if (url.includes('/share')) presence = { details: "Repl.it Talk Share", state: "Browsing repl talk share" };
  if (url.includes('/share/')) presence = { details: title, state: "Reading post on repl.it/talk/share" };
  if (url.includes('/challenge')) presence = { details: "Repl.it Talk Challenges", state: "Browsing challenges" };
  if (url.includes('/all')) presence = { details: "Repl.it Talk", state: "Browsing repl talk" };
  if (url.includes('/announcements')) presence = { details: "Repl.it Announcements", state: "Browsing announcements" };

  if (url.substring(url.lastIndexOf('/')).includes("/@")) {
    contents.executeJavaScript(`
      try {
        let user = { metainfo: "" };
        async function getAll() {
          await getUsername();
          await getCycles();
          await getMetaInfo();
          await getLanguages();
          await getHacker();
          return new Promise((resolve, reject) => {
            resolve(user);
          });
        }
        function getCycles() {
          user.cycles = document.querySelector(\`[title=\"cycles\"]\`).innerText.replace(/(\\()|(\\))|((<!-- -->))\*/g, \"\");
        }
        function getUsername() {
          try {
            user.username = location.pathname.substring(1);
             \/\/ user.username = document.getElementsByClassName("profile-header-content")[0].getElementsByTagName(\"h1\")[0].innerText.split(\/\\s+\/)[0];
          } catch {
            user.username = document.querySelector(\`[title=\"cycles\"]\`).parentElement.innerText.split(\/\\s+\/)[0];
          }
        }
        function getMetaInfo() {
          let info = document.querySelectorAll(\`.profile-meta-info\`);
          for (let item of info) {
            if (item) {
              user.metainfo += item.innerText + \"\\n\\n\";
            }
          }
        }
        function getLanguages() {
          user.langs = [];
          try {
            for (let item of document.querySelectorAll(\`.profile-languages\`)[0].getElementsByTagName(\"span\")) {
              if (item) {
                user.langs.push(item.innerText);
              }
            }
          } catch {
            user.langs = [];
          }
        }
        function getHacker() {
          user.ishacker = (document.querySelectorAll(\`.hacker\`).length >= 1) ? "true" : "false";
        }
        getAll();
      } catch {
        console.log("Already Executed");
      }
    `).then((data) => {
      extractData(data);
    }).catch(err => {
      console.log(err);
    });
  }

}

function getWorkingFile(contents) {
  contents.executeJavaScript(`
    function getWorkingFile() {
      return new Promise((resolve, reject) => {
        if (location.pathname.includes("@")) {
          const text = document.getElementsByClassName('file-header-name')[0];
          const data = {
            editing: text.parentElement.innerHTML,
            pathname: location.pathname
          }
          console.log(data);
          resolve(data);
        }
      });
    }
    getWorkingFile();
  `).then((data) => {
    extractFile(data);
  }).catch(err => {
    if (err) {
      getFile = clearInterval(getFile);
      console.log(err);
    }
  });
}

function extractData(data) {
  let $;
  if (data.hasOwnProperty("html")) $ = cheerio.load(data.html);
  console.log(data);
  if (data.ishacker == "true") data.ishacker = "is Hacker";
  if (data.ishacker == "false") data.ishacker = "is not a Hacker";
  if (!data.ishacker) data.ishacker = "is not a Hacker";

  presence = { details: `Viewing ${data.username} (${data.cycles}) `, state: `Languages: ${data.langs.join(', ')}`, largeImageText: `${data.metainfo}`, smallImageText: `Hacker: ${data.ishacker}` };
}

function extractFile(data) {
  const $ = cheerio.load(data.editing);
  let file = $(".file-header-name").children('div').text();
  let user = data.pathname.substr(1).split("/")[0];
  let repl = data.pathname.substr(1).split("/")[1];
  let ext = file.match(/[.]+(.*)/);
  if (ext) ext = ext[0];
  if (!ext) ext = ".txt";
  ext = ext.replace('.', "");

  if (file.includes("/"))
    file = file.split('/')[file.split('/').length-1];

  presence = { details: `Editing ${file}`, state: `Repl: ${repl}\nby ${user}`, largeImageKey: ext, largeImageText: `Editing ${file}` };
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, "icons/icon.ico"),
    webPreferences: {
      nodeIntegration: true
    },
    autoHideMenuBar: true
  });

  setTimeout(loadUrl, 1000);

  win.on("closed", () => {
    win = null;
    getFile = clearInterval(getFile);
  });

  let contents = win.webContents;

  contents.on("did-navigate-in-page", () => {
    changePresence(contents);
  });

  win.on("page-title-updated", (e, title) => {
    if (contents.getURL().includes("~") && !settings.get("loggedin")) {
      settings.set("loggedin", true);
    }
    let path = contents.getURL().split("/");
    if (getFile) {
      getFile = clearInterval(getFile);
    }
    getFile = setInterval(getWorkingFile, 1000, contents);
    presence = { details: title };

    if (path[path.length-1] == "repls") presence = { details: title, state: "Browsing own repls" };
    changePresence(contents);
  });

  contents.on("dom-ready", () => {
    presence = {
      details: contents.getTitle()
    }

    if (!start) {
      start = Date.now();
      presence = { ...defaults, ...presence };
      RPC.updatePresence(presence);
      setInterval(() => {
        presence = { ...defaults, ...presence };
        RPC.updatePresence(presence);
      }, 1202);
    }

  });
}

function loadUrl() {
  win.loadURL("http://localhost:" + port + "/");
}

app.on("ready", createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

app.on('certificate-error', function(event, webContents, url, error, certificate, callback) {
    event.preventDefault();
    callback(true);
});

require('./app.js')(port);
