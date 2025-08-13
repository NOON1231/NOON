// index.js
const fs = require('fs');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const express = require('express');
const app = express();


const GITHUB_USER = 'noon1231';
const GITHUB_REPO = 'NOON';
const FILE_PATH = 'p.txt';
const GITHUB_TOKEN = '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';
const RAW_URL = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/${FILE_PATH}`;
const KEEP_ALIVE_URL = 'https://noon-9v11.onrender.com/';
const BATCH_SIZE = 200; 
const TIMEOUT = 4000; 


let proxyList = [];
let goodProxies = [];
let checking = false;
let lastUpdate = new Date();


async function loadProxies() {
  const res = await axios.get(RAW_URL);
  proxyList = res.data.split(/\r?\n/).filter(line => line.trim());
}


async function testProxy(proxy) {
  let agent;
  if (proxy.startsWith('socks')) {
    agent = new SocksProxyAgent(proxy);
  } else {
    agent = new HttpsProxyAgent(proxy);
  }
  try {
    await axios.get('https://www.google.com', { httpsAgent: agent, timeout: TIMEOUT });
    return true;
  } catch (err) {
    return false;
  }
}


async function saveGoodProxies() {
  const content = goodProxies.join('\n');
  const url = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${FILE_PATH}`;
  
  const shaRes = await axios.get(url, { headers: { Authorization: `token ${GITHUB_TOKEN}` } });
  const sha = shaRes.data.sha;
  
  await axios.put(url, {
    message: 'Update working proxies',
    content: Buffer.from(content).toString('base64'),
    sha
  }, { headers: { Authorization: `token ${GITHUB_TOKEN}` } });
}


async function checkAllProxies() {
  if (checking) return;
  checking = true;
  goodProxies = [];
  let index = 0;
  while (index < proxyList.length) {
    const batch = proxyList.slice(index, index + BATCH_SIZE);
    const results = await Promise.all(batch.map(p => testProxy(p)));
    results.forEach((res, i) => {
      if (res) goodProxies.push(batch[i]);
    });
    index += BATCH_SIZE;
    lastUpdate = new Date();
    console.log(`Checked ${Math.min(index, proxyList.length)} / ${proxyList.length} proxies, good: ${goodProxies.length}`);
  }
  await saveGoodProxies();
  checking = false;
}

// Keep-alive 
setInterval(async () => {
  try { await axios.get(KEEP_ALIVE_URL); } catch {}
}, 5 * 60 * 1000);


app.get('/', (req, res) => {
  res.send(`
    <h2>Proxy Checker NOON</h2>
    <p>Last update: ${lastUpdate}</p>
    <p>Total proxies: ${proxyList.length}</p>
    <p>Good proxies: ${goodProxies.length}</p>
    <p>Status: ${checking ? 'Checking...' : 'Idle'}</p>
  `);
});

app.listen(10000, async () => {
  console.log('Server running on port 10000');
  await loadProxies();
  checkAllProxies(); 
});
