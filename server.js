const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'drives.json');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, '[]');
}

function readDrives() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}
function writeDrives(drives) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(drives, null, 2));
}

app.get('/api/drives', (req, res) => {
  res.json(readDrives());
});

app.post('/api/drives', (req, res) => {
  const { date, miles, rate, campaign } = req.body;
  if (!date || !miles || !rate || !campaign) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }
  const newDrive = { id: Date.now(), date, miles: parseInt(miles), rate: parseFloat(rate), campaign };
  const drives = readDrives();
  drives.push(newDrive);
  writeDrives(drives);
  res.status(201).json(newDrive);
});

app.delete('/api/drives/:id', (req, res) => {
  const id = parseInt(req.params.id);
  writeDrives(readDrives().filter(d => d.id !== id));
  res.json({ success: true });
});

app.listen(PORT, () => console.log('Running on http://localhost:' + PORT));