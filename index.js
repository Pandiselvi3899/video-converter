const ffmpeg = require("fluent-ffmpeg");
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
const fs = require("fs");
const path = require("path");
const random = require("randomstring");
var isValid = require("is-valid-path");

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  Menu,
  dialog,
  Shell,
  Notification,
} = require("electron");
const { randomBytes } = require("crypto");

let mainWindow, outputDir, videoName;

const template = [
  {
    label: "New Project",
    click() {
      mainWindow.webContents.send("create");
    },
  },
  {
    label: "Dev Tools",
    click() {
      mainWindow.webContents.openDevTools();
    },
  },
];

app.on("ready", async () => {
  mainWindow = new BrowserWindow({
    height: 800,
    width: 1000,
    resizable: true,
    title: "Video Converter App",
    webPreferences: { nodeIntegration: true, contextIsolation: false },
    backgroundColor: "#0a0a94",
  });
  mainWindow.loadFile("main.html");

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
});

app.on("window-all-closed", () => {
  app.quit();
});

ipcMain.on("create-project", async (event) => {
  const rd = await dialog.showOpenDialog(null, {
    title: "Select output directory",
    defaultPath: app.getPath("home"),
    properties: [
      "openDirectory",
      "createDirectory",
      "promptToCreate",
      "showHiddenFiles",
    ],
  });
  let dir = rd.filePaths[0];
  if (!dir) return;
  let isEmpty;
  try {
    isEmpty = fs.readdirSync(dir).length === 0;
  } catch (err) {
    console.log(err);
  }
  if (!isEmpty) {
    event.sender.send("read-error", "Please select an empty folder for output");
  } else {
    outputDir = dir;
    const vf = await dialog.showOpenDialog(null, {
      title: "Select MP4 video",
      defaultPath: app.getPath("home"),
      properties: ["openFile", "showHiddenFiles"],
      filters: [{ name: "MP4", extensions: ["mp4"] }],
    });
    let video = vf.filePaths[0];
    if (!video) return;
    if (video.split(".")[1] !== "mp4") {
      event.sender.send("read-error", "This app only works with mp4 files");
    } else {
      videoName = video;
      convertWindow = new BrowserWindow({
        height: 600,
        width: 800,
        resizable: true,
        title: "Convert Video",
        webPreferences: { nodeIntegration: true, contextIsolation: false },
        
        parent: mainWindow,
      });
      await convertWindow.setMenu(null);
      await convertWindow.loadFile("convert.html");

      convertWindow.webContents.send("updated", outputDir, videoName);
    }
  }
});

ipcMain.on("convert-video", async (event, ...args) => {
  outputDir = args[0];
  videoName = args[1];

  if (!isValid(outputDir)) {
    convertWindow.webContents.send(
      "error",
      "Error occured. Please enter a valid output directory name"
    );
    return;
  }

  try {
    fs.mkdirSync(outputDir);
  } catch (err) {
    console.log(err);
  }
  if (!fs.existsSync(outputDir)) {
    convertWindow.webContents.send(
      "error",
      "Error occured. Provide/Create correct output directory"
    );
    return;
  }
  if (!fs.existsSync(videoName)) {
    convertWindow.webContents.send(
      "error",
      "Error occured. Provide correct path to video"
    );
    return;
  }

  const isEmpty = fs.readdirSync(outputDir).length === 0;
  if (!isEmpty) {
    convertWindow.webContents.send(
      "error",
      "Error occured. Provide path to an empty output directory"
    );
    return;
  }
  if (videoName.split(".")[1] !== "mp4") {
    convertWindow.webContents.send(
      "error",
      "Error occured. This app works only with mp4 files"
    );
    return;
  }
  const video = path.normalize(videoName);
  const output = path.normalize(outputDir + "/" + random.generate(7) + ".m3u8");
  // console.log(video, output);
  ffmpeg(video)
    .on("error", (err) => {
      console.log(err);
      convertWindow.webContents.send(
        "error",
        "Error converting video.Try again"
      );
    })
    .on("progress", (progress) => {
      convertWindow.webContents.send("progress");
    })
    .output(output)
    .on("end", () => {
      convertWindow.webContents.send("done");
      const notification = {
        title: "Video Conversion",
        body: "Video has been successfully converted",
      };
      new Notification(notification).show();
      shell.openPath(outputDir);
    })
    .run();
});
