import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Search, Plus, MoreVertical, X, Loader2, Edit, Trash2, Ban } from 'lucide-react';

const Contacts = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showMenu, setShowMenu] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phoneNumber: '', email: '' });

  useEffect(() => { loadContacts(); }, []);

  const loadContacts = async () => {
    try {
      const response = await api.get('/contacts');
      setContacts(response.data.data.contacts || []);
    } catch (error) {
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phoneNumber) { toast.error('Nombre y teléfono requeridos'); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.put('/contacts/' + editing, form);
        toast.success('Contacto actualizado');
      } else {
        await api.post('/contacts', form);
        toast.success('Contacto creado');
      }
      setShowModal(false);
      setForm({ name: '', phoneNumber: '', email: '' });
      setEditing(null);
      loadContacts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (contact) => {
    setForm({ name: contact.name, phoneNumber: contact.phoneNumber, email: contact.email || '' });
    setEditing(contact.id);
    setShowMenu(null);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este contacto?')) return;
    try {
      await api.delete('/contacts/' + id);
      toast.success('Contacto eliminado');
      loadContacts();
    } catch (error) {
      toast.error('Error al eliminar');
    }
    setShowMenu(null);
  };

  const handleBlock = async (id, currentStatus) => {
    try {
      await api.put('/contacts/' + id, { status: currentStatus === 'active' ? 'blocked' : 'active' });
      toast.success(currentStatus === 'active' ? 'Contacto bloqueado' : 'Contacto desbloqueado');
      loadContacts();
    } catch (error) {
      toast.error('Error');
    }
    setShowMenu(null);
  };

  const filteredContacts = contacts.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return c.name?.toLowerCase().includes(s) || c.phoneNumber?.includes(search) || c.email?.toLowerCase().includes(s);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Contactos</h1><p className="text-gray-400 mt-1">Gestiona tus contactos de WhatsApp</p></div>
        <button onClick={() => { setForm({ name: '', phoneNumber: '', email: '' }); setEditing(null); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"><Plus size={20} />Nuevo Contacto</button>
      </div>

      <div className="relative">
        <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input type="text" placeholder="Buscar contactos..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
      </div>

      <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>
        ) : filteredContacts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No hay contactos</div>
        ) : (
          <table className="w-full">
            <thead><tr className="border-b border-dark-700"><th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Contacto</th><th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Teléfono</th><th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Email</th><th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Tickets</th><th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Estado</th><th className="px-6 py-4"></th></tr></thead>
            <tbody className="divide-y divide-dark-700">
              {filteredContacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-dark-700/50">
                  <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium">{contact.name?.charAt(0).toUpperCase()}</div><span className="text-white">{contact.name}</span></div></td>
                  <td className="px-6 py-4 text-gray-400">{contact.phoneNumber}</td>
                  <td className="px-6 py-4 text-gray-400">{contact.email || '-'}</td>
                  <td className="px-6 py-4 text-gray-400">{contact.totalTickets || 0}</td>
                  <td className="px-6 py-4"><span className={'px-2 py-1 rounded-full text-xs ' + (contact.status === 'active' ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400')}>{contact.status === 'active' ? 'Activo' : 'Bloqueado'}</span></td>
                  <td className="px-6 py-4 relative">
                    <button onClick={() => setShowMenu(showMenu === contact.id ? null : contact.id)} className="p-2 hover:bg-dark-600 rounded-lg text-gray-400"><MoreVertical size={16} /></button>
                    {showMenu === contact.id && (
                      <div className="absolute right-6 top-12 bg-dark-900 border border-dark-600 rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
                        <button onClick={() => handleEdit(contact)} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-dark-700"><Edit size={14} />Editar</button>
                        <button onClick={() => handleBlock(contact.id, contact.status)} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-yellow-400 hover:bg-dark-700"><Ban size={14} />{contact.status === 'active' ? 'Bloquear' : 'Desbloquear'}</button>
                        <button onClick={() => handleDelete(contact.id)} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-dark-700"><Trash2 size={14} />Eliminar</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-xl border border-dark-700 w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-bold text-white">{editing ? 'Editar' : 'Nuevo'} Contacto</h2><button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><X size={20} /></button></div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-sm text-gray-400 mb-2">Nombre</label><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 bg-dark-900 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-indigo-500" required /></div>
              <div><label className="block text-sm text-gray-400 mb-2">Teléfono</label><input type="text" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} placeholder="+5491155551234" className="w-full px-4 py-2.5 bg-dark-900 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-indigo-500" required /></div>
              <div><label className="block text-sm text-gray-400 mb-2">Email (opcional)</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-2.5 bg-dark-900 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-indigo-500" /></div>
              <div className="flex gap-3 pt-4"><button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 bg-dark-700 hover:bg-dark-600 text-white rounded-lg">Cancelar</button><button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50">{saving && <Loader2 size={16} className="animate-spin" />}{editing ? 'Guardar' : 'Crear'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contacts;
