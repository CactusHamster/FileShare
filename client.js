let path = require('path');






let Client = class Client {
  Ip = "null";
  Name = "null";
  Id = 0;
  LastPing = Date.now();

  FilePermissions = [];

  constructor(ip,name,currentId) {
    this.Id = currentId;
    this.Name = name;
    currentId++;
    console.info(`[INFO] Client connected!`);
    console.info(`[INFO] IP=${ip},ID=${this.Id},NAME=${this.Name}`);
    this.Ip = ip;



  }




}


module.exports = Client;
