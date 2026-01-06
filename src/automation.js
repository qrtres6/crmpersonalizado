const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

class AutomationService {
  constructor(whatsappClient) {
    this.wa = whatsappClient;
    this.jobs = new Map();
    this.config = this.loadConfig();
    this.autoReactEnabled = false;
    this.autoReactEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
  }

  loadConfig() {
    const configPath = path.join(__dirname, '..', 'config.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
    return {
      scheduledStatuses: [],
      scheduledMessages: [],
      autoReact: { enabled: false, emojis: ['👍'] },
      groupsToJoin: []
    };
  }

  saveConfig() {
    const configPath = path.join(__dirname, '..', 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
  }

  // ==================== ESTADOS PROGRAMADOS ====================

  scheduleStatus(options) {
    const { id, type, content, mediaPath, caption, cronExpression } = options;

    if (this.jobs.has(id)) {
      this.jobs.get(id).stop();
    }

    const job = cron.schedule(cronExpression, async () => {
      try {
        console.log(`⏰ Ejecutando estado programado: ${id}`);

        if (type === 'text') {
          await this.wa.postTextStatus(content);
        } else if (type === 'image') {
          await this.wa.postImageStatus(mediaPath, caption || '');
        } else if (type === 'video') {
          await this.wa.postVideoStatus(mediaPath, caption || '');
        }
      } catch (error) {
        console.error(`Error en estado programado ${id}:`, error.message);
      }
    });

    this.jobs.set(id, job);
    this.config.scheduledStatuses.push(options);
    this.saveConfig();

    console.log(`📅 Estado programado: ${id} - ${cronExpression}`);
    return { success: true, id };
  }

  async postStatusNow(options) {
    const { type, content, mediaPath, caption } = options;

    if (type === 'text') {
      return await this.wa.postTextStatus(content);
    } else if (type === 'image') {
      return await this.wa.postImageStatus(mediaPath, caption || '');
    } else if (type === 'video') {
      return await this.wa.postVideoStatus(mediaPath, caption || '');
    }
  }

  // ==================== MENSAJES MASIVOS ====================

  async sendBulkMessages(phoneNumbers, message, delaySeconds = 5) {
    console.log(`📤 Enviando mensaje a ${phoneNumbers.length} números...`);

    const results = [];
    for (let i = 0; i < phoneNumbers.length; i++) {
      const phone = phoneNumbers[i];
      try {
        await this.wa.sendMessage(phone, message);
        results.push({ phone, success: true });
        console.log(`✅ ${i + 1}/${phoneNumbers.length} - ${phone}`);
      } catch (error) {
        results.push({ phone, success: false, error: error.message });
        console.log(`❌ ${i + 1}/${phoneNumbers.length} - ${phone}: ${error.message}`);
      }

      // Delay entre mensajes
      if (i < phoneNumbers.length - 1) {
        await this.delay(delaySeconds * 1000);
      }
    }

    const successful = results.filter(r => r.success).length;
    console.log(`\n📊 Resultado: ${successful}/${phoneNumbers.length} enviados`);

    return results;
  }

  async sendBulkImages(phoneNumbers, imagePath, caption, delaySeconds = 5) {
    console.log(`🖼️ Enviando imagen a ${phoneNumbers.length} números...`);

    const results = [];
    for (let i = 0; i < phoneNumbers.length; i++) {
      const phone = phoneNumbers[i];
      try {
        await this.wa.sendImage(phone, imagePath, caption);
        results.push({ phone, success: true });
        console.log(`✅ ${i + 1}/${phoneNumbers.length} - ${phone}`);
      } catch (error) {
        results.push({ phone, success: false, error: error.message });
        console.log(`❌ ${i + 1}/${phoneNumbers.length} - ${phone}: ${error.message}`);
      }

      if (i < phoneNumbers.length - 1) {
        await this.delay(delaySeconds * 1000);
      }
    }

    return results;
  }

  scheduleMessage(options) {
    const { id, phoneNumbers, message, cronExpression, delaySeconds } = options;

    if (this.jobs.has(id)) {
      this.jobs.get(id).stop();
    }

    const job = cron.schedule(cronExpression, async () => {
      console.log(`⏰ Ejecutando mensaje programado: ${id}`);
      await this.sendBulkMessages(phoneNumbers, message, delaySeconds || 5);
    });

    this.jobs.set(id, job);
    this.config.scheduledMessages.push(options);
    this.saveConfig();

    console.log(`📅 Mensaje programado: ${id} - ${cronExpression}`);
    return { success: true, id };
  }

  // ==================== GRUPOS ====================

  async joinGroups(inviteLinks) {
    console.log(`👥 Uniéndose a ${inviteLinks.length} grupos...`);

    const results = [];
    for (const link of inviteLinks) {
      try {
        const result = await this.wa.joinGroup(link);
        results.push({ link, success: true, groupId: result });
        console.log(`✅ Unido: ${link}`);
      } catch (error) {
        results.push({ link, success: false, error: error.message });
        console.log(`❌ Error: ${link} - ${error.message}`);
      }
      await this.delay(3000);
    }

    return results;
  }

  async sendToAllGroups(message) {
    const groups = await this.wa.getGroups();
    console.log(`📤 Enviando a ${groups.length} grupos...`);

    const results = [];
    for (const group of groups) {
      try {
        await this.wa.sendGroupMessage(group.id, message);
        results.push({ groupId: group.id, name: group.subject, success: true });
        console.log(`✅ ${group.subject}`);
      } catch (error) {
        results.push({ groupId: group.id, name: group.subject, success: false, error: error.message });
        console.log(`❌ ${group.subject}: ${error.message}`);
      }
      await this.delay(3000);
    }

    return results;
  }

  // ==================== REACCIONES AUTOMÁTICAS ====================

  enableAutoReact(emojis = ['👍']) {
    this.autoReactEnabled = true;
    this.autoReactEmojis = emojis;
    console.log(`🎯 Auto-reacción activada con: ${emojis.join(', ')}`);

    this.wa.on('message', async (message) => {
      if (this.autoReactEnabled && message.key) {
        try {
          const randomEmoji = this.autoReactEmojis[
            Math.floor(Math.random() * this.autoReactEmojis.length)
          ];
          await this.wa.reactToMessage(message.key, randomEmoji);
        } catch (error) {
          console.error('Error en auto-reacción:', error.message);
        }
      }
    });

    return { enabled: true, emojis };
  }

  disableAutoReact() {
    this.autoReactEnabled = false;
    console.log('🔇 Auto-reacción desactivada');
    return { enabled: false };
  }

  async reactToLastMessages(jid, count = 5, emoji = '👍') {
    // Esta función requiere acceso al historial de mensajes
    console.log(`Reaccionando a últimos ${count} mensajes de ${jid}`);
    // Implementación depende del historial disponible
  }

  // ==================== GESTIÓN DE JOBS ====================

  stopJob(id) {
    if (this.jobs.has(id)) {
      this.jobs.get(id).stop();
      this.jobs.delete(id);
      console.log(`⏹️ Job detenido: ${id}`);
      return { success: true };
    }
    return { success: false, error: 'Job no encontrado' };
  }

  stopAllJobs() {
    for (const [id, job] of this.jobs) {
      job.stop();
      console.log(`⏹️ Job detenido: ${id}`);
    }
    this.jobs.clear();
    return { success: true, count: this.jobs.size };
  }

  listJobs() {
    return Array.from(this.jobs.keys());
  }

  // ==================== UTILIDADES ====================

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStats() {
    return {
      activeJobs: this.jobs.size,
      autoReactEnabled: this.autoReactEnabled,
      autoReactEmojis: this.autoReactEmojis,
      scheduledStatuses: this.config.scheduledStatuses.length,
      scheduledMessages: this.config.scheduledMessages.length
    };
  }
}

module.exports = AutomationService;
