require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

// Route imports
const authRoutes = require('./routes/auth');
const providerRoutes = require('./routes/providers');
const streamRoutes = require('./routes/streams');
const contentRoutes = require('./routes/content');
const purchaseRoutes = require('./routes/purchases');
const followRoutes = require('./routes/follows');
const notificationRoutes = require('./routes/notifications');

// Models needed for socket events
const Stream = require('./models/Stream');

const app = express();
const server = http.createServer(app);

// ─── Socket.io setup ──────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Track connected viewers per stream: streamId → Set of socketIds
const streamViewers = new Map();

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Viewer joins a stream room
  socket.on('joinStream', async ({ streamId }) => {
    socket.join(`stream_${streamId}`);

    if (!streamViewers.has(streamId)) streamViewers.set(streamId, new Set());
    streamViewers.get(streamId).add(socket.id);

    const count = streamViewers.get(streamId).size;
    io.to(`stream_${streamId}`).emit('viewerCountUpdate', { streamId, count });

    await Stream.findByIdAndUpdate(streamId, {
      'stats.currentViewers': count,
      $max: { 'stats.peakViewers': count },
      $inc: { 'stats.viewCount': 1 }
    }).catch(() => {});
  });

  // Viewer leaves a stream room
  socket.on('leaveStream', async ({ streamId }) => {
    socket.leave(`stream_${streamId}`);
    const viewers = streamViewers.get(streamId);
    if (viewers) {
      viewers.delete(socket.id);
      const count = viewers.size;
      io.to(`stream_${streamId}`).emit('viewerCountUpdate', { streamId, count });
      await Stream.findByIdAndUpdate(streamId, { 'stats.currentViewers': count }).catch(() => {});
    }
  });

  // Provider subscribes to follower-notification channel
  socket.on('joinProviderChannel', ({ providerId }) => {
    socket.join(`provider_${providerId}`);
  });

  // Live chat
  socket.on('chatMessage', ({ streamId, userId, username, message }) => {
    io.to(`stream_${streamId}`).emit('chatMessage', {
      userId,
      username,
      message,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('disconnect', async () => {
    for (const [streamId, viewers] of streamViewers.entries()) {
      if (viewers.has(socket.id)) {
        viewers.delete(socket.id);
        const count = viewers.size;
        io.to(`stream_${streamId}`).emit('viewerCountUpdate', { streamId, count });
        await Stream.findByIdAndUpdate(streamId, { 'stats.currentViewers': count }).catch(() => {});
      }
    }
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));

// Stripe webhook requires raw body — register before express.json()
app.use('/api/purchases/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Attach io to every request so route handlers can emit events
app.use((req, _res, next) => {
  req.io = io;
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/streams', streamRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

app.use((_req, res) => res.status(404).json({ message: 'Route not found' }));

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

// ─── Database & server start ──────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pov-streaming', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    server.listen(PORT, () => {
      console.log(`POV Streaming server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

module.exports = { app, io };
