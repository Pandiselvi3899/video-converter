const { ipcRenderer } = require("electron");

const proj = document.getElementById("proj");

const convert = document.getElementById("convert");

proj?.addEventListener("click", (e) => {
  ipcRenderer.send("create-project");
});

ipcRenderer.on("create", (event) => {
  ipcRenderer.send("create-project");
});

ipcRenderer.on("read-error", (event, message) => {
  alert(message);
});

ipcRenderer.on("updated", (event, ...args) => {
  const a = document.getElementById("output");
  a.value = args[0];
  const b = document.getElementById("video");
  b.value = args[1];
});

ipcRenderer.on("progress", (event, message) => {
  const b = document.getElementById("progress");
  b.innerHTML = "Converting..please wait!";
  const btn = document.getElementById("convert");
  btn.innerText = "Converting";
  btn.disabled = true;
});

ipcRenderer.on("done", (event) => {
  const b = document.getElementById("progress");
  b.innerHTML = "Conversion Successfull";
  const btn = document.getElementById("convert");
  btn.innerText = "Convert";
  btn.disabled = false;
});

ipcRenderer.on("error", (event, message) => {
  const b = document.getElementById("progress");
  b.innerHTML = message;
  const btn = document.getElementById("convert");
  btn.innerText = "Convert";
  btn.disabled = false;
});

convert?.addEventListener("click", (e) => {
  e.target.innerText = "Converting";
  e.target.disabled = true;
  const b = document.getElementById("output").value;
  const a = document.getElementById("video").value;
  const c = document.getElementById("progress");
  c.innerHTML = "";
  ipcRenderer.send("convert-video", b, a);
});
