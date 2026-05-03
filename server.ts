import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Sequelize, DataTypes, Op } from 'sequelize';
import rateLimit from 'express-rate-limit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'cipher-chat-super-secret-key';

// Database Setup
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: false,
});

// Models
const User = sequelize.define('User', {
  id: { type: DataTypes.STRING, primaryKey: true },
  username: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  publicKey: { type: DataTypes.TEXT, allowNull: true },
  avatar: { type: DataTypes.STRING, defaultValue: '' },
  status: { type: DataTypes.STRING, defaultValue: 'Online' },
  lastSeen: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { timestamps: true });

const FriendRequest = sequelize.define('FriendRequest', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  fromUserId: { type: DataTypes.STRING, allowNull: false },
  toUserId: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.ENUM('pending', 'accepted', 'rejected'), defaultValue: 'pending' },
}, { timestamps: true });

const Message = sequelize.define('Message', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  senderId: { type: DataTypes.STRING, allowNull: false },
  receiverId: { type: DataTypes.STRING, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false }, // AES encrypted
  iv: { type: DataTypes.STRING, allowNull: false }, // IV for AES
  encryptedKey: { type: DataTypes.TEXT, allowNull: false }, // RSA encrypted AES key
  type: { type: DataTypes.STRING, defaultValue: 'text' },
  read: { type: DataTypes.BOOLEAN, defaultValue: false },
  expiresAt: { type: DataTypes.DATE, allowNull: true },
}, { timestamps: true });

const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.STRING, allowNull: false },
  fromUserId: { type: DataTypes.STRING },
  type: { type: DataTypes.STRING, allowNull: false }, // 'message', 'invite', 'security', 'request'
  title: { type: DataTypes.STRING },
  body: { type: DataTypes.TEXT },
  read: { type: DataTypes.BOOLEAN, defaultValue: false },
  link: { type: DataTypes.STRING },
}, { timestamps: true });

const SecurityLog = sequelize.define('SecurityLog', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.STRING, allowNull: false },
  action: { type: DataTypes.STRING, allowNull: false }, // 'screenshot', 'tab_switch', 'copy'
  details: { type: DataTypes.TEXT },
}, { timestamps: true });

const Game = sequelize.define('Game', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  type: { type: DataTypes.STRING, allowNull: false }, // 'tictactoe', 'chess', etc.
  player1Id: { type: DataTypes.STRING, allowNull: false },
  player2Id: { type: DataTypes.STRING, allowNull: false },
  state: { type: DataTypes.TEXT, defaultValue: '{}' },
  turn: { type: DataTypes.STRING },
  winnerId: { type: DataTypes.STRING },
  status: { type: DataTypes.STRING, defaultValue: 'pending' }, // 'pending', 'active', 'finished'
}, { timestamps: true });

// Sync DB
await sequelize.sync();

// Cleanup task for expired messages
setInterval(async () => {
  try {
    await Message.destroy({
      where: {
        expiresAt: {
          [Op.lt]: new Date()
        }
      }
    });
  } catch (err) {
    console.error('Error cleaning up expired messages:', err);
  }
}, 10000); // Check every 10 seconds

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  app.use(express.json());

  // Rate Limiting
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  });

  // Auth Routes
  app.post('/api/auth/signup', authLimiter, async (req, res) => {
    try {
      const { id, username, password, publicKey } = req.body;
      if (!id || !username || !password) return res.status(400).json({ error: 'Missing fields' });
      
      const existing = await User.findOne({ where: { [Op.or]: [{ id }, { username }] } });
      if (existing) return res.status(400).json({ error: 'User already exists' });

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await User.create({ id, username, password: hashedPassword, publicKey });
      
      const token = jwt.sign({ userId: user.get('id') }, JWT_SECRET);
      res.json({ token, user: { id: user.get('id'), username: user.get('username'), avatar: user.get('avatar'), publicKey: user.get('publicKey') } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
      const { id, password } = req.body;
      const user: any = await User.findByPk(id);
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: 'Invalid ID or password' });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET);
      res.json({ token, user: { id: user.id, username: user.username, avatar: user.avatar, publicKey: user.publicKey } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Auth Middleware for protected routes
  const authenticate = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.userId = decoded.userId;
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // Notifications API
  app.get("/api/notifications", authenticate, async (req: any, res) => {
    const notifications = await Notification.findAll({
      where: { userId: req.userId },
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    res.json(notifications);
  });

  app.post("/api/notifications/read", authenticate, async (req: any, res) => {
    await Notification.update({ read: true }, { where: { userId: req.userId } });
    res.json({ success: true });
  });

  // Security Log API
  app.post("/api/security/log", authenticate, async (req: any, res) => {
    const { action, details } = req.body;
    const log = await SecurityLog.create({ userId: req.userId, action, details });
    res.json(log);
  });

  // User Routes
  app.get('/api/users/search/:query', authenticate, async (req: any, res) => {
    const { query } = req.params;
    const users = await User.findAll({
      where: {
        [Op.or]: [
          { id: { [Op.like]: `%${query}%` } },
          { username: { [Op.like]: `%${query}%` } }
        ]
      },
      attributes: ['id', 'username', 'avatar', 'publicKey'],
      limit: 10
    });
    res.json(users);
  });

  // Socket.io Logic
  const onlineUsers = new Map<string, string>(); // userId -> socketId

  io.on('connection', (socket) => {
    socket.on('authenticate', async (token) => {
      try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        const userId = decoded.userId;
        onlineUsers.set(userId, socket.id);
        socket.join(`user:${userId}`);
        
        await User.update({ status: 'Online' }, { where: { id: userId } });
        io.emit('user:status', { userId, status: 'Online' });

        socket.on('disconnect', async () => {
          onlineUsers.delete(userId);
          await User.update({ status: 'Offline', lastSeen: new Date() }, { where: { id: userId } });
          io.emit('user:status', { userId, status: 'Offline' });
        });

        // Chat Handlers
        socket.on('chat:message', async (data) => {
          const { receiverId, content, iv, encryptedKey, type, ttl } = data;
          let expiresAt = null;
          if (ttl) {
            expiresAt = new Date(Date.now() + ttl * 1000);
          }
          const msg = await Message.create({ senderId: userId, receiverId, content, iv, encryptedKey, type, expiresAt });
          
          socket.to(`user:${receiverId}`).emit('chat:message', msg);
          socket.emit('chat:message:sent', msg);

          // Create notification for receiver
          const fromUser: any = await User.findByPk(userId);
          const notification = await Notification.create({
            userId: receiverId,
            fromUserId: userId,
            type: 'message',
            title: `New Message from ${fromUser?.username || 'Unknown'}`,
            body: 'You received a secure encrypted packet.',
            link: '/chats'
          });
          io.to(`user:${receiverId}`).emit('notification:new', notification);
        });

        socket.on('chat:typing', (data) => {
          const { receiverId, isTyping } = data;
          socket.to(`user:${receiverId}`).emit('chat:typing', { senderId: userId, isTyping });
        });

        // Security Handlers
        socket.on('security:alert', async (data) => {
          const { action, details, targetUserId } = data;
          await SecurityLog.create({ userId, action, details });
          
          if (targetUserId) {
            const fromUser: any = await User.findByPk(userId);
            let alertBody = `${fromUser?.username || 'Unknown User'} performed a suspicious action: ${action}`;
            let alertTitle = 'Security Alert';

            if (action === 'screenshot_detected') {
              alertTitle = '🚨 Screenshot Detected';
              alertBody = `${fromUser?.username || 'Target'} took a screenshot of your secure transmission!`;
            } else if (action === 'screen_recording_detected') {
              alertTitle = '📹 Recording Detected';
              alertBody = `${fromUser?.username || 'Target'} is currently recording your secure channel!`;
            } else if (action === 'keyboard_shortcut_blocked') {
              alertTitle = '⚠️ Restricted Action';
              alertBody = `${fromUser?.username || 'Target'} attempted to use a restricted shortcut (Capture/Print).`;
            }

            const alert = {
              userId: targetUserId,
              fromUserId: userId,
              type: 'security',
              title: alertTitle,
              body: alertBody,
              link: null
            };
            io.to(`user:${targetUserId}`).emit('notification:new', alert);
          }
        });

        // Game Handlers
        socket.on('game:invite', async (data) => {
          const { receiverId, gameType } = data;
          const game = await Game.create({
            type: gameType,
            player1Id: userId,
            player2Id: receiverId,
            status: 'pending'
          });
          socket.to(`user:${receiverId}`).emit('game:invite', game);
        });

        socket.on('game:accept', async (gameId) => {
          const game: any = await Game.findByPk(gameId);
          if (game && game.player2Id === userId) {
            await game.update({ status: 'active' });
            socket.to(`user:${game.player1Id}`).emit('game:start', game);
            socket.emit('game:start', game);
          }
        });

        socket.on('game:move', async (data) => {
          const { gameId, state, turn } = data;
          const game: any = await Game.findByPk(gameId);
          if (game) {
            await game.update({ state: JSON.stringify(state), turn });
            const opponentId = game.player1Id === userId ? game.player2Id : game.player1Id;
            socket.to(`user:${opponentId}`).emit('game:move', { gameId, state, turn });
          }
        });

      } catch (err) {
        socket.disconnect();
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
