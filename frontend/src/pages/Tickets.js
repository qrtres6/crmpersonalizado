import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import toast from 'react-hot-toast';
import { Search, MessageSquare, Clock, User, Send, Paperclip, X, Loader2, Check, CheckCheck, Phone, MoreVertical, ArrowLeft } from 'lucide-react';

const Tickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => { loadTickets(); }, [filter]);

  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      socket.on('ticket:new', (data) => {
        setTickets(prev => [data.ticket, ...prev]);
        toast.success('Nuevo ticket #' + data.ticket.ticketNumber);
      });

      socket.on('ticket:updated', (data) => {
        setTickets(prev => prev.map(t => t.id === data.ticketId ? { ...t, ...data } : t));
      });

      socket.on('message:new', (data) => {
        if (selectedTicket?.id === data.message.ticketId) {
          setMessages(prev => [...prev, data.message]);
          scrollToBottom();
        }
        setTickets(prev => prev.map(t => 
          t.id === data.message.ticketId ? { ...t, lastMessage: data.message.body, lastMessageAt: new Date(), unreadMessages: (t.unreadMessages || 0) + (data.message.direction === 'incoming' ? 1 : 0) } : t
        ));
      });

      return () => {
        socket.off('ticket:new');
        socket.off('ticket:updated');
        socket.off('message:new');
      };
    }
  }, [selectedTicket]);

  useEffect(() => {
    if (selectedTicket) {
      const socket = getSocket();
      if (socket) {
        socket.emit('ticket:join', selectedTicket.id);
        return () => socket.emit('ticket:leave', selectedTicket.id);
      }
    }
  }, [selectedTicket]);

  const loadTickets = async () => {
    try {
      const params = {};
      if (filter !== 'all') params.status = filter;
      const response = await api.get('/tickets', { params });
      setTickets(response.data.data.tickets || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (ticketId) => {
    setMessagesLoading(true);
    try {
      const response = await api.get('/tickets/' + ticketId + '/messages');
      setMessages(response.data.data.messages || []);
      setTimeout(scrollToBottom, 100);
      
      // Marcar como leído
      if (selectedTicket?.unreadMessages > 0) {
        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, unreadMessages: 0 } : t));
      }
    } catch (error) {
      toast.error('Error cargando mensajes');
    } finally {
      setMessagesLoading(false);
    }
  };

  const selectTicket = (ticket) => {
    setSelectedTicket(ticket);
    loadMessages(ticket.id);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedTicket) return;
    
    setSending(true);
    try {
      await api.post('/tickets/' + selectedTicket.id + '/messages', { body: newMessage });
      setNewMessage('');
    } catch (error) {
      toast.error('Error enviando mensaje');
    } finally {
      setSending(false);
    }
  };

  const closeTicket = async () => {
    if (!window.confirm('¿Cerrar este ticket?')) return;
    try {
      await api.post('/tickets/' + selectedTicket.id + '/close');
      toast.success('Ticket cerrado');
      loadTickets();
      setSelectedTicket(null);
    } catch (error) {
      toast.error('Error cerrando ticket');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const today = new Date();
    const diff = today - d;
    if (diff < 86400000 && today.getDate() === d.getDate()) return 'Hoy ' + formatTime(date);
    if (diff < 172800000) return 'Ayer ' + formatTime(date);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) + ' ' + formatTime(date);
  };

  const statusColors = {
    pending: { bg: 'bg-yellow-600', text: 'Pendiente' },
    open: { bg: 'bg-green-600', text: 'Abierto' },
    closed: { bg: 'bg-gray-600', text: 'Cerrado' }
  };

  const filteredTickets = tickets.filter(t => {
    if (!search) return true;
    const s = search.toLowerCase();
    return t.contact?.name?.toLowerCase().includes(s) || t.contact?.phoneNumber?.includes(search) || t.ticketNumber?.toString().includes(search);
  });

  return (
    <div className="h-[calc(100vh-120px)] flex bg-dark-900 rounded-xl border border-dark-700 overflow-hidden">
      {/* Lista de tickets */}
      <div className={'w-full md:w-96 flex flex-col border-r border-dark-700 ' + (selectedTicket ? 'hidden md:flex' : '')}>
        <div className="p-4 border-b border-dark-700">
          <div className="relative mb-3">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input type="text" placeholder="Buscar tickets..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm" />
          </div>
          <div className="flex gap-2">
            {[{ key: 'all', label: 'Todos' }, { key: 'pending', label: 'Pendientes' }, { key: 'open', label: 'Abiertos' }, { key: 'closed', label: 'Cerrados' }].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)} className={'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ' + (filter === f.key ? 'bg-indigo-600 text-white' : 'bg-dark-800 text-gray-400 hover:bg-dark-700')}>{f.label}</button>
            ))}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-indigo-500" size={24} /></div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No hay tickets</div>
          ) : (
            filteredTickets.map(ticket => (
              <div key={ticket.id} onClick={() => selectTicket(ticket)} className={'p-4 border-b border-dark-700 cursor-pointer hover:bg-dark-800 transition-colors ' + (selectedTicket?.id === ticket.id ? 'bg-dark-800' : '')}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium shrink-0">
                    {ticket.contact?.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-medium truncate">{ticket.contact?.name || 'Sin nombre'}</span>
                      <span className="text-gray-500 text-xs shrink-0">{formatDate(ticket.lastMessageAt)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-gray-400 text-sm truncate">{ticket.lastMessage || 'Sin mensajes'}</p>
                      {ticket.unreadMessages > 0 && <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full shrink-0">{ticket.unreadMessages}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={'text-xs px-2 py-0.5 rounded ' + statusColors[ticket.status]?.bg}>{statusColors[ticket.status]?.text}</span>
                      <span className="text-gray-500 text-xs">#{ticket.ticketNumber}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat */}
      <div className={'flex-1 flex flex-col ' + (!selectedTicket ? 'hidden md:flex' : '')}>
        {selectedTicket ? (
          <>
            {/* Header del chat */}
            <div className="p-4 border-b border-dark-700 flex items-center gap-4">
              <button onClick={() => setSelectedTicket(null)} className="md:hidden p-2 hover:bg-dark-700 rounded-lg text-gray-400"><ArrowLeft size={20} /></button>
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium">
                {selectedTicket.contact?.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="flex-1">
                <h3 className="text-white font-medium">{selectedTicket.contact?.name}</h3>
                <p className="text-gray-500 text-sm flex items-center gap-2">
                  <Phone size={12} />
                  {selectedTicket.contact?.phoneNumber}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={'text-xs px-2 py-1 rounded ' + statusColors[selectedTicket.status]?.bg}>{statusColors[selectedTicket.status]?.text}</span>
                <div className="relative group">
                  <button className="p-2 hover:bg-dark-700 rounded-lg text-gray-400"><MoreVertical size={18} /></button>
                  <div className="absolute right-0 top-full mt-1 bg-dark-800 border border-dark-600 rounded-lg shadow-lg py-1 hidden group-hover:block z-10 min-w-[120px]">
                    {selectedTicket.status !== 'closed' && <button onClick={closeTicket} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-dark-700">Cerrar ticket</button>}
                  </div>
                </div>
              </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messagesLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-indigo-500" size={24} /></div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No hay mensajes</div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={'flex ' + (msg.direction === 'outgoing' ? 'justify-end' : 'justify-start')}>
                    <div className={'max-w-[70%] rounded-2xl px-4 py-2 ' + (msg.direction === 'outgoing' ? 'bg-indigo-600 text-white rounded-br-md' : 'bg-dark-700 text-white rounded-bl-md')}>
                      <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                      <div className={'flex items-center justify-end gap-1 mt-1 text-xs ' + (msg.direction === 'outgoing' ? 'text-indigo-200' : 'text-gray-500')}>
                        <span>{formatTime(msg.createdAt)}</span>
                        {msg.direction === 'outgoing' && (
                          msg.status === 'read' ? <CheckCheck size={14} className="text-blue-400" /> : msg.status === 'delivered' ? <CheckCheck size={14} /> : <Check size={14} />
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de mensaje */}
            {selectedTicket.status !== 'closed' && (
              <form onSubmit={sendMessage} className="p-4 border-t border-dark-700">
                <div className="flex items-center gap-3">
                  <button type="button" className="p-2 hover:bg-dark-700 rounded-lg text-gray-400"><Paperclip size={20} /></button>
                  <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Escribe un mensaje..." className="flex-1 px-4 py-2.5 bg-dark-800 border border-dark-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" disabled={sending} />
                  <button type="submit" disabled={!newMessage.trim() || sending} className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg text-white transition-colors">
                    {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                  </button>
                </div>
              </form>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
              <p>Selecciona un ticket para ver la conversación</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tickets;
