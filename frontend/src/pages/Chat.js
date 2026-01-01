import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';
import {
  ArrowLeft,
  Send,
  Paperclip,
  MoreVertical,
  Phone,
  User,
  Clock,
  CheckCheck,
  Check,
  Image,
  File,
  Smile
} from 'lucide-react';

const Chat = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadTicket();
    loadMessages();
    
    const socket = getSocket();
    if (socket) {
      socket.emit('ticket:join', id);
      socket.on('message:new', handleNewMessage);
      socket.on('ticket:typing', handleTyping);
    }

    return () => {
      if (socket) {
        socket.emit('ticket:leave', id);
        socket.off('message:new', handleNewMessage);
        socket.off('ticket:typing', handleTyping);
      }
    };
  }, [id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNewMessage = (message) => {
    if (message.ticketId === parseInt(id)) {
      setMessages(prev => [...prev, message]);
    }
  };

  const handleTyping = ({ ticketId, userName, isTyping }) => {
    // TODO: Mostrar indicador de typing
  };

  const loadTicket = async () => {
    try {
      // TODO: Implementar endpoint
      // const response = await api.get(`/tickets/${id}`);
      // setTicket(response.data.data);
      
      // Datos de ejemplo
      setTicket({
        id: parseInt(id),
        ticketNumber: 1001,
        status: 'open',
        contact: {
          name: 'Juan Pérez',
          phoneNumber: '+5491155551234',
          avatar: null
        },
        assignedUser: user
      });
    } catch (error) {
      console.error('Error cargando ticket:', error);
    }
  };

  const loadMessages = async () => {
    try {
      // TODO: Implementar endpoint
      // const response = await api.get(`/tickets/${id}/messages`);
      // setMessages(response.data.data.messages);
      
      // Mensajes de ejemplo
      setMessages([
        { id: 1, body: 'Hola, buenas tardes!', direction: 'incoming', createdAt: new Date(Date.now() - 3600000), status: 'read' },
        { id: 2, body: '¡Hola! ¿En qué podemos ayudarte?', direction: 'outgoing', createdAt: new Date(Date.now() - 3500000), status: 'read', user: { name: 'Agente' } },
        { id: 3, body: 'Tengo un problema con mi cuenta, no puedo acceder', direction: 'incoming', createdAt: new Date(Date.now() - 3400000), status: 'read' },
        { id: 4, body: 'Entiendo. ¿Podrías indicarme tu nombre de usuario?', direction: 'outgoing', createdAt: new Date(Date.now() - 3300000), status: 'read', user: { name: 'Agente' } },
        { id: 5, body: 'Mi usuario es juanperez123', direction: 'incoming', createdAt: new Date(Date.now() - 3200000), status: 'read' },
        { id: 6, body: 'Perfecto, déjame revisar tu cuenta', direction: 'outgoing', createdAt: new Date(Date.now() - 3100000), status: 'delivered', user: { name: 'Agente' } },
      ]);
    } catch (error) {
      console.error('Error cargando mensajes:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      // TODO: Implementar endpoint
      // const response = await api.post(`/tickets/${id}/messages`, { body: newMessage });
      
      // Simular envío
      const message = {
        id: Date.now(),
        body: newMessage,
        direction: 'outgoing',
        createdAt: new Date(),
        status: 'sent',
        user: { name: user.name }
      };
      setMessages(prev => [...prev, message]);
      setNewMessage('');
    } catch (error) {
      console.error('Error enviando mensaje:', error);
    } finally {
      setSending(false);
    }
  };

  const MessageStatus = ({ status }) => {
    if (status === 'read') return <CheckCheck size={16} className="text-blue-400" />;
    if (status === 'delivered') return <CheckCheck size={16} className="text-gray-400" />;
    if (status === 'sent') return <Check size={16} className="text-gray-400" />;
    return <Clock size={16} className="text-gray-500" />;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
      {/* Header */}
      <div className="h-16 px-4 flex items-center gap-4 border-b border-dark-700 bg-dark-800">
        <button
          onClick={() => navigate('/tickets')}
          className="p-2 hover:bg-dark-700 rounded-lg text-gray-400"
        >
          <ArrowLeft size={20} />
        </button>
        
        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium">
          {ticket?.contact.name.charAt(0).toUpperCase()}
        </div>
        
        <div className="flex-1">
          <h2 className="text-white font-medium">{ticket?.contact.name}</h2>
          <p className="text-gray-500 text-sm">{ticket?.contact.phoneNumber}</p>
        </div>

        <span className="px-3 py-1 bg-indigo-600/20 text-indigo-400 text-sm rounded-full">
          #{ticket?.ticketNumber}
        </span>

        <button className="p-2 hover:bg-dark-700 rounded-lg text-gray-400">
          <MoreVertical size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-dark-900">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                message.direction === 'outgoing'
                  ? 'bg-indigo-600 text-white rounded-br-md'
                  : 'bg-dark-700 text-white rounded-bl-md'
              }`}
            >
              <p className="break-words">{message.body}</p>
              <div className={`flex items-center gap-1 mt-1 ${
                message.direction === 'outgoing' ? 'justify-end' : 'justify-start'
              }`}>
                <span className="text-xs opacity-70">
                  {new Date(message.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {message.direction === 'outgoing' && <MessageStatus status={message.status} />}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-4 border-t border-dark-700 bg-dark-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="p-2 hover:bg-dark-700 rounded-lg text-gray-400"
          >
            <Paperclip size={20} />
          </button>
          
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1 px-4 py-2.5 bg-dark-900 border border-dark-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
          
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;
