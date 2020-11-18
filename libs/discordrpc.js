const axios = require('axios');
const RPC = require("discord-rpc");
const client = new RPC.Client({ transport: "ipc" });

const discordrpc = (clientid, scopes) => {
  client.login({ clientid }).catch(err => console.log(err));
}

discordrpc.setActivity = (data) => {
  client.on("ready", () => {
    const startTS = new Date();
    data.startTimestamp = startTS;
    client.setActivity(data);
  })
}

module.exports = discordrpc;
