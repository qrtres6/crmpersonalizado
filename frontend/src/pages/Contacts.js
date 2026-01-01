import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Search, Plus, MoreVertical, Phone, Mail, Tag } from 'lucide-react';

const Contacts = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      // TODO: Implementar endpoint
      // const response = await api.get('/contacts');
      // setContacts(response.data.data.contacts);
      
      setContacts([
        { id: 1, name: 'Juan Pérez', phoneNumber: '+5491155551234', email: 'juan@email.com', totalTickets: 5, status: 'active' },
        { id: 2, name: 'María García', phoneNumber: '+5491155555678', email: 'maria@email.com', totalTickets: 3, status: 'active' },
        { id: 3, name: 'Carlos López', phoneNumber: '+5491155559012', email: null, totalTickets: 8, status: 'active' },
        { id: 4, name: 'Ana Martínez', phoneNumber: '+5491155553456', email: 'ana@email.com', totalTickets: 2, status: 'blocked' },
      ]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter(contact => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      contact.name.toLowerCase().includes(searchLower) ||
      contact.phoneNumber.includes(search) ||
      contact.email?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Contactos</h1>
          <p className="text-gray-400 mt-1">Gestiona tus contactos de WhatsApp</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
          <Plus size={20} />
          Nuevo Contacto
        </button>
      </div>

      <div className="relative">
        <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Buscar contactos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-700">
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Contacto</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Teléfono</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Email</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Tickets</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Estado</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-700">
            {filteredContacts.map((contact) => (
              <tr key={contact.id} className="hover:bg-dark-700/50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-white">{contact.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-400">{contact.phoneNumber}</td>
                <td className="px-6 py-4 text-gray-400">{contact.email || '-'}</td>
                <td className="px-6 py-4 text-gray-400">{contact.totalTickets}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    contact.status === 'active' 
                      ? 'bg-green-600/20 text-green-400' 
                      : 'bg-red-600/20 text-red-400'
                  }`}>
                    {contact.status === 'active' ? 'Activo' : 'Bloqueado'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button className="p-2 hover:bg-dark-600 rounded-lg text-gray-400">
                    <MoreVertical size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Contacts;
