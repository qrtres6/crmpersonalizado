const jwt = require('jsonwebtoken');
const { User, Tenant } = require('../models');

const userSockets = new Map();
const tenantRooms = new Map();

const setupSocketHandlers = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) return next(new Error('Token no proporcionado'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findOne({
        where: { id: decoded.userId, tokenVersion: decoded.tokenVersion },
        include: [{ model: Tenant, as: 'tenant', attributes: ['id', 'uuid', 'name', 'slug'] }]
      });

      if (!user || user.status === 'inactive') return next(new Error('Usuario no válido'));

      socket.user = user;
      socket.tenantId = user.tenantId;
      next();
    } catch (error) {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', async (socket) => {
    const user = socket.user;
    const tenantId = socket.tenantId;

    console.log(`🔌 Conectado: ${user.name} (${user.id})`);

    userSockets.set(user.id, socket.id);

    if (tenantId) {
      socket.join(`tenant:${tenantId}`);
      if (!tenantRooms.has(tenantId)) tenantRooms.set(tenantId, new Set());
      tenantRooms.get(tenantId).add(user.id);
    }

    socket.join(`user:${user.id}`);
    await user.update({ isOnline: true, lastSeen: new Date() });

    if (tenantId) {
      socket.to(`tenant:${tenantId}`).emit('user:online', { userId: user.id, name: user.name, avatar: user.avatar });
    }

    socket.on('ticket:join', (ticketId) => {
      socket.join(`ticket:${ticketId}`);
    });

    socket.on('ticket:leave', (ticketId) => {
      socket.leave(`ticket:${ticketId}`);
    });

    socket.on('ticket:typing', ({ ticketId, isTyping }) => {
      socket.to(`ticket:${ticketId}`).emit('ticket:typing', { ticketId, userId: user.id, userName: user.name, isTyping });
    });

    socket.on('user:status', async (status) => {
      if (['active', 'away', 'busy'].includes(status)) {
        await user.update({ status });
        if (tenantId) io.to(`tenant:${tenantId}`).emit('user:status_changed', { userId: user.id, status });
      }
    });

    socket.on('ping', () => socket.emit('pong'));

    socket.on('disconnect', async () => {
      console.log(`🔌 Desconectado: ${user.name} (${user.id})`);
      userSockets.delete(user.id);
      if (tenantId && tenantRooms.has(tenantId)) tenantRooms.get(tenantId).delete(user.id);
      await user.update({ isOnline: false, lastSeen: new Date() });
      if (tenantId) socket.to(`tenant:${tenantId}`).emit('user:offline', { userId: user.id });
    });
  });

  io.emitToUser = (userId, event, data) => io.to(`user:${userId}`).emit(event, data);
  io.emitToTenant = (tenantId, event, data) => io.to(`tenant:${tenantId}`).emit(event, data);
  io.emitToTicket = (ticketId, event, data) => io.to(`ticket:${ticketId}`).emit(event, data);
  io.getOnlineUsers = (tenantId) => tenantRooms.get(tenantId) || new Set();
  io.isUserOnline = (userId) => userSockets.has(userId);

  return io;
};

module.exports = { setupSocketHandlers };
