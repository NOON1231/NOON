const express = require("express");
const dns = require("dns");
const net = require("net");
const https = require("https");

const app = express();
const PORT = process.env.PORT || 10000;

// الروابط التي نريد فحص IP الخاص بها
const TARGET_HOST = "app.sanime.net";

// البورتات التي سنفحصها
const PORTS = [
  // خدمات مشهورة
  21,   // FTP
  22,   // SSH
  23,   // Telnet
  25,   // SMTP
  53,   // DNS
  80,   // HTTP
  110,  // POP3
  111,  // RPCbind
  135,  // MS RPC
  139,  // NetBIOS
  143,  // IMAP
  161,  // SNMP
  389,  // LDAP
  443,  // HTTPS
  445,  // Microsoft-DS (SMB)
  465,  // SMTPS
  514,  // Syslog
  587,  // SMTP (TLS)
  631,  // IPP (Internet Printing Protocol)
  873,  // rsync
  993,  // IMAPS
  995,  // POP3S

  // خدمات قواعد بيانات
  1433, // MS SQL Server
  1521, // Oracle DB
  2049, // NFS
  2375, // Docker API (غير محمي أحيانًا)
  27017, // MongoDB
  3306, // MySQL
  3389, // RDP (Remote Desktop)
  5432, // PostgreSQL
  6379, // Redis

  // أدوات وشبكات داخلية
  8000, // HTTP Dev Port
  8080, // HTTP بديل
  8443, // HTTPS بديل
  8888, // خدمات أخرى (مثل Jupyter)
  9000, // خدمات داخلية أو إدارة
  9200, // Elasticsearch
  10000, // Webmin أو خدمات إدارة

  // بورتات شائعة لاختبارات الأمن
  6666,
  6667,  // IRC
  7777,
  8008,
  8081,
  8880,
  8881,
  9090,
  9091,
  10001,
  12345, // NetBus أو خلفيات
  31337  // خلفيات (Back Orifice)
];

let scanResults = [];
let targetIP = "";

function resolveIP(hostname) {
  return new Promise((resolve, reject) => {
    dns.lookup(hostname, (err, address) => {
      if (err) reject(err);
      else resolve(address);
    });
  });
}

function checkPort(ip, port, timeout = 2000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let status = "Timed-Out";

    socket.setTimeout(timeout);
    socket.on("connect", () => {
      status = "Open";
      socket.destroy();
    });
    socket.on("timeout", () => {
      status = "Timed-Out";
      socket.destroy();
    });
    socket.on("error", () => {
      status = "Closed";
    });
    socket.on("close", () => {
      resolve({ port, status });
    });

    socket.connect(port, ip);
  });
}

async function scanAllPorts() {
  try {
    targetIP = await resolveIP(TARGET_HOST);
    const checks = PORTS.map((port) => checkPort(targetIP, port));
    scanResults = await Promise.all(checks);
  } catch (err) {
    console.error("Error resolving IP or scanning ports:", err);
  }
}

// تشغيل الفحص مرة عند البداية ثم كل 10 دقائق
scanAllPorts();
setInterval(scanAllPorts, 10 * 60 * 1000); // كل 10 دقائق

// Keep Alive: يزور الموقع كل 5 دقائق
setInterval(() => {
  https.get("https://noon-9v11.onrender.com/");
}, 5 * 60 * 1000);

// صفحة الويب لعرض النتائج
app.get("/", (req, res) => {
  res.send(`
    <h1>نتائج الفحص - ${TARGET_HOST}</h1>
    <p><strong>IP:</strong> ${targetIP}</p>
    <table border="1" cellpadding="5" style="border-collapse: collapse;">
      <tr><th>Port</th><th>Status</th></tr>
      ${scanResults.map(r => `<tr><td>${r.port}</td><td>${r.status}</td></tr>`).join("")}
    </table>
    <p>تحديث كل 10 دقائق تلقائيًا.</p>
  `);
});

app.listen(PORT, () => {
  console.log(`Running on port ${PORT}`);
});
