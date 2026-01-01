require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { connectDB } = require('./config/database');
const { redis } = require('./config/redis');
const { syncDatabase, User, Tenant, Department } = require('./models');
const routes = require('./routes');
const { setupSocketHandlers } = require('./socket');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, message: 'Demasiadas solicitudes' }
});
app.use('/api/', limiter);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/api', routes);

setupSocketHandlers(io);
app.set('io', io);

// Inicializar servicio WhatsApp
const WhatsAppService = require('./services/WhatsAppService');
WhatsAppService.setIO(io);

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, message: 'Error interno del servidor' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});

const initSuperAdmin = async () => {
  try {
    const superAdmin = await User.findOne({ where: { role: 'super_admin' } });
    if (!superAdmin) {
      await User.create({
        name: 'Super Administrador',
        email: process.env.SUPER_ADMIN_EMAIL || 'admin@crm.com',
        password: process.env.SUPER_ADMIN_PASS || 'admin123',
        role: 'super_admin',
        tenantId: null,
        permissions: {},
        status: 'active'
      });
      console.log('✅ Super admin creado');
    }
  } catch (error) {
    console.error('Error creando super admin:', error);
  }
};

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    await connectDB();
    await syncDatabase({ alter: process.env.NODE_ENV === 'development' });
    await initSuperAdmin();
    await redis.connect();

    server.listen(PORT, () => {
      console.log(`
🚀 =========================================
   CRM Multi-tenant iniciado
   Puerto: ${PORT}
   Entorno: ${process.env.NODE_ENV || 'development'}
=========================================
      `);
      
      // Restaurar conexiones WhatsApp
      WhatsAppService.restoreAllConnections().catch(err => {
        console.error('Error restaurando conexiones:', err);
      });
    });
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
};

startServer();

module.exports = { app, io };
