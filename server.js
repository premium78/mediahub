const express = require('express');
const app = express();
const PORT = 3000;

const downloadRoute = require('./routes/download');

app.use(express.json());
app.use(express.static('public'));

app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

app.use('/api/media', downloadRoute);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'পথ খুঁজে পাওয়া যায়নি।' });
});

app.listen(PORT, () => {
  console.log(`MediaHub চালু! http://localhost:${PORT}`);
});