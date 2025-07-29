const express = require("express");
const axios = require("axios");
const qs = require("qs");
const app = express();

const PORT = process.env.PORT || 10000;

// معلومات الحسابات
const AVATAR_URL = "https://i.imgur.com/IofzsSP_d.png?maxwidth=960&fidelity=high";
const NAME = "Nameless";
const BIO = "N";

// Headers ثابتة
const headers = {
  "Host": "app.sanime.net",
  "Content-Type": "application/x-www-form-urlencoded",
  "Origin": "https://ios.sanime.net",
  "Accept-Encoding": "gzip, deflate, br",
  "Connection": "keep-alive",
  "Accept": "*/*",
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_8_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 (SevenZero) (55103E8C-8F61-47A3-96C8-7A0852736007)(Iphone6)15.8.3",
  "Referer": "https://ios.sanime.net/",
  "Accept-Language": "ar"
};

// إنشاء حساب جديد
async function registerAccount(email, password) {
  const payload = {
    email,
    password,
    username: NAME,
    bio: BIO,
    image: ""
  };

  const encodedData = qs.stringify({ data: Buffer.from(JSON.stringify(payload)).toString("base64") });

  try {
    const res = await axios.post("https://app.sanime.net/function/h10.php?page=register", encodedData, { headers });
    if (res.data.code === "0") {
      console.log(`✅ حساب مُسجل: ${email}`);
      return true;
    } else {
      console.log(`❌ فشل التسجيل: ${email}`, res.data.message);
      return false;
    }
  } catch (err) {
    console.error(`❌ خطأ أثناء التسجيل: ${email}`, err.message);
    return false;
  }
}

// تسجيل الدخول
async function login(email, password) {
  const body = qs.stringify({ email, password });
  try {
    const res = await axios.post("https://app.sanime.net/function/h10.php?page=login", body, { headers });
    if (res.data.code === "1") {
      console.log(`🔓 تسجيل دخول: ${email}`);
      return res.data.message;
    } else {
      console.log(`❌ فشل تسجيل الدخول: ${email}`, res.data.message);
      return null;
    }
  } catch (err) {
    console.error(`❌ خطأ في تسجيل الدخول: ${email}`, err.message);
    return null;
  }
}

// تحديث الصورة الشخصية بعد تسجيل الدخول
async function updateProfile(user) {
  const payload = {
    email: user.email,
    password: user.password,
    username: NAME,
    bio: BIO,
    image: AVATAR_URL
  };

  const base = Buffer.from(JSON.stringify(payload)).toString("base64");
  const body = qs.stringify({ e: user.email, p: user.password, base });

  try {
    const res = await axios.post("https://app.sanime.net/function/h10.php?page=update", body, { headers });
    if (res.data.code === "1") {
      console.log(`🖼️ تم تحديث الصورة: ${user.email}`);
      return true;
    } else {
      console.log(`❌ فشل التحديث: ${user.email}`, res.data.message);
      return false;
    }
  } catch (err) {
    console.error(`❌ خطأ في التحديث: ${user.email}`, err.message);
    return false;
  }
}

// تنفيذ العملية الكاملة لحساب واحد
async function processAccount(i) {
  const email = `${i}@gmail.com`;
  const password = `${i}`;

  const registered = await registerAccount(email, password);
  if (!registered) return;

  const user = await login(email, password);
  if (!user) return;

  await updateProfile(user);

  // تسجيل الدخول مرة أخيرة لتأكيد التحديث
  await login(email, password);
}

// معالجة جميع الحسابات من 23 إلى 600
async function startProcess() {
  for (let i = 23; i <= 600; i++) {
    await processAccount(i);
    await new Promise((res) => setTimeout(res, 1000)); // مهلة 1 ثانية
  }
}

// Keep-alive ping كل دقيقتين
setInterval(() => {
  axios.get("https://noon-9v11.onrender.com/").then(() => {
    console.log("📶 تم إرسال Keep-Alive ping");
  }).catch(() => {});
}, 2 * 60 * 1000);

// تشغيل المهمة عند بدء السيرفر
startProcess();

// صفحة بسيطة للفحص
app.get("/", (req, res) => {
  res.send("✅ الخدمة تعمل، الحسابات تُنشأ الآن...");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
