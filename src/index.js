const WhatsAppClient = require('./whatsapp');
const AutomationService = require('./automation');
const WebServer = require('./server');

console.log(`
╔═══════════════════════════════════════════════════╗
║         WhatsApp Automation App v1.0              ║
║                                                   ║
║  - Estados automáticos                            ║
║  - Mensajes masivos                               ║
║  - Unirse a grupos                                ║
║  - Reacciones automáticas                         ║
╚═══════════════════════════════════════════════════╝
`);

async function main() {
  // Inicializar cliente WhatsApp
  const whatsapp = new WhatsAppClient();

  // Inicializar servicio de automatización
  const automation = new AutomationService(whatsapp);

  // Inicializar servidor web
  const server = new WebServer(whatsapp, automation);

  // Conectar a WhatsApp automáticamente
  console.log('🔄 Iniciando conexión a WhatsApp...\n');
  await whatsapp.connect();

  // Iniciar servidor web
  const PORT = process.env.PORT || 3000;
  server.start(PORT);

  // Manejar cierre limpio
  process.on('SIGINT', async () => {
    console.log('\n👋 Cerrando aplicación...');
    await whatsapp.disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n👋 Cerrando aplicación...');
    await whatsapp.disconnect();
    process.exit(0);
  });
}

main().catch(console.error);
