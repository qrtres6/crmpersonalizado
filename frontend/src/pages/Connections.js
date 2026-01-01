import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import toast from 'react-hot-toast';
import { Plus, QrCode, Trash2, Smartphone, X, Loader2, Wifi, WifiOff } from 'lucide-react';

const Connections = () => {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [connecting, setConnecting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'baileys' });

  useEffect(() => {
    loadConnections();
    const socket = getSocket();
    if (socket) {
      socket.on('whatsapp:qr', handleQR);
      socket.on('whatsapp:connected', handleConnected);
      socket.on('whatsapp:disconnected', handleDisconnected);
    }
    return () => {
      if (socket) {
        socket.off('whatsapp:qr', handleQR);
        socket.off('whatsapp:connected', handleConnected);
        socket.off('whatsapp:disconnected', handleDisconnected);
      }
    };
  }, []);

  const handleQR = ({ connectionId, qr }) => {
    setQrCode(qr);
    setShowQRModal(true);
  };

  const handleConnected = ({ connectionId, phoneNumber }) => {
    toast.success('WhatsApp conectado: ' + phoneNumber);
    setShowQRModal(false);
    setQrCode(null);
    setConnecting(null);
    loadConnections();
  };

  const handleDisconnected = () => { loadConnections(); };

  const loadConnections = async () => {
    try {
      const response = await api.get('/connections');
      setConnections(response.data.data.connections);
    } catch (error) {
      toast.error('Error cargando conexiones');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name) { toast.error('Ingresá un nombre'); return; }
    setSaving(true);
    try {
      await api.post('/connections', form);
      toast.success('Conexión creada');
      setShowModal(false);
      setForm({ name: '', type: 'baileys' });
      loadConnections();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al crear');
    } finally {
      setSaving(false);
    }
  };

  const handleConnect = async (id) => {
    setConnecting(id);
    try {
      await api.post('/connections/' + id + '/connect');
      toast.success('Iniciando conexión...');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al conectar');
      setConnecting(null);
    }
  };

  const handleDisconnect = async (id) => {
    try {
      await api.post('/connections/' + id + '/disconnect');
      toast.success('Desconectado');
      loadConnections();
    } catch (error) {
      toast.error('Error al desconectar');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta conexión?')) return;
    try {
      await api.delete('/connections/' + id);
      toast.success('Conexión eliminada');
      loadConnections();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const statusColors = {
    connected: { bg: 'bg-green-600/20', text: 'text-green-400', label: 'Conectado' },
    disconnected: { bg: 'bg-gray-600/20', text: 'text-gray-400', label: 'Desconectado' },
    connecting: { bg: 'bg-yellow-600/20', text: 'text-yellow-400', label: 'Conectando...' },
    qr_pending: { bg: 'bg-blue-600/20', text: 'text-blue-400', label: 'Esperando QR' },
    error: { bg: 'bg-red-600/20', text: 'text-red-400', label: 'Error' }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Conexiones WhatsApp</h1>
          <p className="text-gray-400 mt-1">Gestiona tus conexiones de WhatsApp</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
          <Plus size={20} />
          Nueva Conexión
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {connections.map((conn) => (
            <div key={conn.id} className="bg-dark-800 rounded-xl border border-dark-700 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={'p-3 rounded-lg ' + (conn.status === 'connected' ? 'bg-green-600/20' : 'bg-gray-600/20')}>
                    {conn.type === 'baileys' ? <QrCode size={24} className={conn.status === 'connected' ? 'text-green-400' : 'text-gray-400'} /> : <Smartphone size={24} className={conn.status === 'connected' ? 'text-green-400' : 'text-gray-400'} />}
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{conn.name}</h3>
                    <p className="text-gray-500 text-sm">{conn.phoneNumber || 'Sin conectar'}</p>
                  </div>
                </div>
                <span className={'px-2 py-1 rounded-full text-xs ' + (statusColors[conn.status]?.bg || '') + ' ' + (statusColors[conn.status]?.text || '')}>{statusColors[conn.status]?.label || conn.status}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-dark-900 rounded-lg p-3"><p className="text-gray-500 text-xs">Enviados</p><p className="text-white font-semibold">{(conn.messagesSent || 0).toLocaleString()}</p></div>
                <div className="bg-dark-900 rounded-lg p-3"><p className="text-gray-500 text-xs">Recibidos</p><p className="text-white font-semibold">{(conn.messagesReceived || 0).toLocaleString()}</p></div>
              </div>
              <div className="flex items-center gap-2 pt-4 border-t border-dark-700">
                <span className={'px-2 py-1 rounded text-xs ' + (conn.type === 'baileys' ? 'bg-purple-600/20 text-purple-400' : 'bg-blue-600/20 text-blue-400')}>{conn.type === 'baileys' ? 'QR Code' : 'Meta API'}</span>
                <div className="flex-1"></div>
                {conn.status === 'connected' ? (
                  <button onClick={() => handleDisconnect(conn.id)} className="p-2 hover:bg-dark-700 rounded-lg text-yellow-400" title="Desconectar"><WifiOff size={16} /></button>
                ) : (
                  <button onClick={() => handleConnect(conn.id)} disabled={connecting === conn.id} className="p-2 hover:bg-dark-700 rounded-lg text-green-400 disabled:opacity-50" title="Conectar">{connecting === conn.id ? <Loader2 size={16} className="animate-spin" /> : <Wifi size={16} />}</button>
                )}
                <button onClick={() => handleDelete(conn.id)} className="p-2 hover:bg-dark-700 rounded-lg text-red-400" title="Eliminar"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
          {connections.length === 0 && (
            <div onClick={() => setShowModal(true)} className="bg-dark-800/50 rounded-xl border border-dashed border-dark-600 p-6 flex flex-col items-center justify-center text-center min-h-[200px] cursor-pointer hover:bg-dark-800 hover:border-dark-500 transition-colors">
              <div className="p-3 rounded-lg bg-dark-700 mb-3"><Plus size={24} className="text-gray-400" /></div>
              <p className="text-gray-400">Agregar nueva conexión</p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-xl border border-dark-700 w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-bold text-white">Nueva Conexión</h2><button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><X size={20} /></button></div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div><label className="block text-sm text-gray-400 mb-2">Nombre</label><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: WhatsApp Principal" className="w-full px-4 py-2.5 bg-dark-900 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-indigo-500" required /></div>
              <div><label className="block text-sm text-gray-400 mb-2">Tipo</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-4 py-2.5 bg-dark-900 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"><option value="baileys">QR Code (Baileys)</option><option value="meta">Meta API Oficial</option></select></div>
              <div className="flex gap-3 pt-4"><button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 bg-dark-700 hover:bg-dark-600 text-white rounded-lg">Cancelar</button><button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50">{saving && <Loader2 size={16} className="animate-spin" />}Crear</button></div>
            </form>
          </div>
        </div>
      )}

      {showQRModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-xl border border-dark-700 w-full max-w-sm p-6 text-center">
            <h2 className="text-xl font-bold text-white mb-4">Escanear QR</h2>
            <p className="text-gray-400 text-sm mb-4">Abrí WhatsApp → Dispositivos vinculados → Vincular</p>
            {qrCode ? <img src={qrCode} alt="QR" className="mx-auto rounded-lg" /> : <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-indigo-500" size={48} /></div>}
            <button onClick={() => { setShowQRModal(false); setQrCode(null); setConnecting(null); }} className="mt-4 px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Connections;
