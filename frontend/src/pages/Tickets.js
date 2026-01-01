import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  Search,
  Filter,
  Clock,
  MessageSquare,
  CheckCircle,
  User,
  MoreVertical
} from 'lucide-react';

const statusColors = {
  pending: { bg: 'bg-yellow-600/20', text: 'text-yellow-400', label: 'Pendiente' },
  open: { bg: 'bg-indigo-600/20', text: 'text-indigo-400', label: 'Abierto' },
  closed: { bg: 'bg-gray-600/20', text: 'text-gray-400', label: 'Cerrado' },
  resolved: { bg: 'bg-green-600/20', text: 'text-green-400', label: 'Resuelto' }
};

const Tickets = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadTickets();
  }, [filter]);

  const loadTickets = async () => {
    try {
      // TODO: Implementar endpoint de tickets
      // const response = await api.get('/tickets', { params: { status: filter !== 'all' ? filter : undefined } });
      // setTickets(response.data.data.tickets);
      
      // Datos de ejemplo
      setTickets([
        { id: 1, ticketNumber: 1001, contact: { name: 'Juan Pérez', phoneNumber: '+5491155551234' }, status: 'pending', lastMessage: 'Hola, necesito ayuda con mi cuenta', lastMessageAt: new Date(), unreadMessages: 3 },
        { id: 2, ticketNumber: 1002, contact: { name: 'María García', phoneNumber: '+5491155555678' }, status: 'open', lastMessage: 'Gracias por la respuesta', lastMessageAt: new Date(), unreadMessages: 0, assignedUser: { name: 'Agente 1' } },
        { id: 3, ticketNumber: 1003, contact: { name: 'Carlos López', phoneNumber: '+5491155559012' }, status: 'open', lastMessage: 'Tengo un problema con el depósito', lastMessageAt: new Date(), unreadMessages: 1, assignedUser: { name: 'Agente 2' } },
        { id: 4, ticketNumber: 1004, contact: { name: 'Ana Martínez', phoneNumber: '+5491155553456' }, status: 'closed', lastMessage: 'Perfecto, quedó resuelto', lastMessageAt: new Date(), unreadMessages: 0 },
        { id: 5, ticketNumber: 1005, contact: { name: 'Pedro Sánchez', phoneNumber: '+5491155557890' }, status: 'pending', lastMessage: 'Buenos días', lastMessageAt: new Date(), unreadMessages: 1 },
      ]);
    } catch (error) {
      console.error('Error cargando tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    if (filter !== 'all' && ticket.status !== filter) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        ticket.contact.name.toLowerCase().includes(searchLower) ||
        ticket.contact.phoneNumber.includes(search) ||
        ticket.ticketNumber.toString().includes(search)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tickets</h1>
          <p className="text-gray-400 mt-1">Gestiona las conversaciones con clientes</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o #ticket..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Status Filter */}
        <div className="flex gap-2">
          {['all', 'pending', 'open', 'closed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-indigo-600 text-white'
                  : 'bg-dark-800 text-gray-400 hover:bg-dark-700'
              }`}
            >
              {status === 'all' ? 'Todos' : statusColors[status]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No hay tickets para mostrar
          </div>
        ) : (
          <div className="divide-y divide-dark-700">
            {filteredTickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => navigate(`/tickets/${ticket.id}`)}
                className="flex items-center gap-4 p-4 hover:bg-dark-700/50 cursor-pointer transition-colors"
              >
                {/* Avatar */}
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium">
                    {ticket.contact.name.charAt(0).toUpperCase()}
                  </div>
                  {ticket.unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {ticket.unreadMessages}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{ticket.contact.name}</span>
                    <span className="text-gray-500 text-sm">#{ticket.ticketNumber}</span>
                  </div>
                  <p className="text-gray-400 text-sm truncate">{ticket.lastMessage}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-gray-500 text-xs">{ticket.contact.phoneNumber}</span>
                    {ticket.assignedUser && (
                      <>
                        <span className="text-gray-600">•</span>
                        <span className="text-gray-500 text-xs flex items-center gap-1">
                          <User size={12} />
                          {ticket.assignedUser.name}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Status & Time */}
                <div className="text-right">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs ${statusColors[ticket.status].bg} ${statusColors[ticket.status].text}`}>
                    {statusColors[ticket.status].label}
                  </span>
                  <p className="text-gray-500 text-xs mt-2">
                    {new Date(ticket.lastMessageAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Tickets;
