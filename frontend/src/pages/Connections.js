import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Plug, PlugZap, QrCode, RefreshCw, Trash2, Smartphone } from 'lucide-react';

const Connections = () => {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      // TODO: Implementar endpoint
      setConnections([
        { id: 1, name: 'WhatsApp Principal', type: 'baileys', phoneNumber: '+5491155551234', status: 'connected', messagesSent: 1250, messagesReceived: 3420 },
        { id: 2, name: 'WhatsApp Soporte', type: 'meta', phoneNumber: '+5491155559999', status: 'connected', messagesSent: 890, messagesReceived: 2100 },
      ]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
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
        <button className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
          <Plus size={20} />
          Nueva Conexión
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {connections.map((conn) => (
          <div key={conn.id} className="bg-dark-800 rounded-xl border border-dark-700 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${conn.status === 'connected' ? 'bg-green-600/20' : 'bg-gray-600/20'}`}>
                  {conn.type === 'baileys' ? (
                    <QrCode size={24} className={conn.status === 'connected' ? 'text-green-400' : 'text-gray-400'} />
                  ) : (
                    <Smartphone size={24} className={conn.status === 'connected' ? 'text-green-400' : 'text-gray-400'} />
                  )}
                </div>
                <div>
                  <h3 className="text-white font-medium">{conn.name}</h3>
                  <p className="text-gray-500 text-sm">{conn.phoneNumber}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs ${statusColors[conn.status].bg} ${statusColors[conn.status].text}`}>
                {statusColors[conn.status].label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-dark-900 rounded-lg p-3">
                <p className="text-gray-500 text-xs">Enviados</p>
                <p className="text-white font-semibold">{conn.messagesSent.toLocaleString()}</p>
              </div>
              <div className="bg-dark-900 rounded-lg p-3">
                <p className="text-gray-500 text-xs">Recibidos</p>
                <p className="text-white font-semibold">{conn.messagesReceived.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-dark-700">
              <span className={`px-2 py-1 rounded text-xs ${conn.type === 'baileys' ? 'bg-purple-600/20 text-purple-400' : 'bg-blue-600/20 text-blue-400'}`}>
                {conn.type === 'baileys' ? 'QR Code' : 'Meta API'}
              </span>
              <div className="flex-1"></div>
              <button className="p-2 hover:bg-dark-700 rounded-lg text-gray-400" title="Reconectar">
                <RefreshCw size={16} />
              </button>
              <button className="p-2 hover:bg-dark-700 rounded-lg text-red-400" title="Eliminar">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}

        {/* Card para agregar */}
        <div className="bg-dark-800/50 rounded-xl border border-dashed border-dark-600 p-6 flex flex-col items-center justify-center text-center min-h-[200px] cursor-pointer hover:bg-dark-800 hover:border-dark-500 transition-colors">
          <div className="p-3 rounded-lg bg-dark-700 mb-3">
            <Plus size={24} className="text-gray-400" />
          </div>
          <p className="text-gray-400">Agregar nueva conexión</p>
          <p className="text-gray-600 text-sm mt-1">QR Code o Meta API</p>
        </div>
      </div>
    </div>
  );
};

export default Connections;
