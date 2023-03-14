const port         = 3000;
const express      = require('express');
const app          = express();
const http         = require('http');
const server       = http.createServer(app);
const {Server}     = require("socket.io");
const io           = new Server(server);
const mongoose     = require('mongoose');

// Membuat koneksi ke database Chat
mongoose.connect('mongodb://localhost/Chat', {useNewUrlParser: true, useUnifiedTopology: true})
  .then(() => console.log('> Berhasil terhubung ke database'))
  .catch(err => console.error(err));

// Membuat schema untuk collection chat
const chatSchema = new mongoose.Schema({
  nama: String,
  pesan: String,
  waktu: String
});

// Membuat model untuk collection chat
const Chat = mongoose.model('chat', chatSchema);

  const escapeHtml = (text) =>
  {
      return text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
  }
  
  const nl2br = (str, is_xhtml) => 
  {
      if (typeof str === 'undefined' || str === null)
          return '';
  
      const breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br />' : '<br>';
      return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + breakTag + '$2');
  }

// Membuat schema untuk collection badwords
const badwordSchema = new mongoose.Schema({
  word: String
});

// Membuat model untuk collection badwords
const Badword = mongoose.model('badwords', badwordSchema);

io.on('connection', async (socket) => 
{
    // Membaca pesan dari database dan mengirimkannya ke client yang baru terhubung
    const messages = await Chat.find();
    messages.forEach((msg) => {
        io.to(socket.id).emit('chat message', {nama: escapeHtml(msg.nama), pesan: nl2br(escapeHtml(msg.pesan)), waktu: msg.waktu});
    });

    socket.on('chat message', async (msg) => 
    {
        // Mengecek apakah pesan terdapat badwords, jika ada maka badwords tersebut diubah dengan karakter *
        const badwords = await Badword.find();
        let message = msg.pesan;
        badwords.forEach(badword => {
          const regex = new RegExp(badword.word, 'gi');
          message = message.replace(regex, '*'.repeat(badword.word && badword.word.length));
        });

        io.emit('chat message', {nama: escapeHtml(msg.nama), pesan: nl2br(escapeHtml(message)), waktu: msg.waktu});

        // Menyimpan pesan ke database
        const chat = new Chat({
          nama: escapeHtml(msg.nama),
          pesan: escapeHtml(message),
          waktu: msg.waktu
        });
        await chat.save();
    });
});


server.listen(3000, () => {console.log('> Server dijalankan di port %d', port)});
app.use(express.static(__dirname + '/public'));