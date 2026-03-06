const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;
const DRIVES_FILE = path.join(__dirname, 'drives.json');
const USERS_FILE  = path.join(__dirname, 'users.json');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// init files
if (!fs.existsSync(DRIVES_FILE)) fs.writeFileSync(DRIVES_FILE, '{}');
if (!fs.existsSync(USERS_FILE))  fs.writeFileSync(USERS_FILE,  '[]');

function readDrives() { return JSON.parse(fs.readFileSync(DRIVES_FILE, 'utf8')); }
function writeDrives(d) { fs.writeFileSync(DRIVES_FILE, JSON.stringify(d, null, 2)); }
function readUsers()  { return JSON.parse(fs.readFileSync(USERS_FILE,  'utf8')); }
function writeUsers(u) { fs.writeFileSync(USERS_FILE,  JSON.stringify(u, null, 2)); }

//authentification for the users AI helped here
app.post('/api/signup', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields.' });
  const users = readUsers();
  if (users.find(u => u.username === username)) return res.status(400).json({ error: 'Username taken.' });
  users.push({ username, password });
  writeUsers(users);
  res.status(201).json({ username });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = readUsers().find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: 'Wrong username or password.' });
  res.json({ username });
});

//data for the users AI helped here
app.get('/api/drives', (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Missing username.' });
  const all = readDrives();
  res.json(all[username] || []);
});

app.post('/api/drives', (req, res) => {
  const { username, date, miles, rate, campaign } = req.body;
  if (!username || !date || !miles || !rate || !campaign)
    return res.status(400).json({ error: 'Missing fields.' });
  const all = readDrives();
  if (!all[username]) all[username] = [];
  const newDrive = { id: Date.now(), date, miles: parseInt(miles), rate: parseFloat(rate), campaign };
  all[username].push(newDrive);
  writeDrives(all);
  res.status(201).json(newDrive);
});

app.delete('/api/drives/:id', (req, res) => {
  const { username } = req.body;
  const id = parseInt(req.params.id);
  if (!username) return res.status(400).json({ error: 'Missing username.' });
  const all = readDrives();
  if (all[username]) all[username] = all[username].filter(d => d.id !== id);
  writeDrives(all);
  res.json({ success: true });
});

//websockets
app.listen(PORT, () => console.log('Running on http://localhost:' + PORT));

const server = app.listen(PORT, () => console.log('Running on port ' + PORT)); //AI helped with a render bug here
const wss = new WebSocketServer({ server });
const messages = [];

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'history', messages }));

  ws.on('message', (data) => {
    const msg = JSON.parse(data);
    const stamped = { ...msg, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    messages.push(stamped);
    if (messages.length > 50) messages.shift();
    wss.clients.forEach(client => {
      if (client.readyState === 1) client.send(JSON.stringify({ type: 'message', message: stamped }));
    });
  });
});