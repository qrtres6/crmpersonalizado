import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Search, Plus, Building2, Users, MessageSquare, Plug, MoreVertical, X, Loader2 } from 'lucide-react';

const Tenants = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    adminEmail: '',
    adminPassword: '',
    adminName: ''
  });

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      const response = await api.get('/tenants');
      setTenants(response.data.data.tenants);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/tenants', form);
      toast.success('Plataforma creada');
      setShowModal(false);
      setForm({ name: '', slug: '', adminEmail: '', adminPassword: '', adminName: '' });
      loadTenants();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al crear');
    } finally {
      setSaving(false);
    }
  };

  const filteredTenants = tenants.filter(tenant => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      tenant.name.toLowerCase().includes(searchLower) ||
      tenant.slug.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Plataformas</h1>
          <p className="text-gray-400 mt-1">Gestiona las plataformas de apuestas</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
        >
          <Plus size={20} />
          Nueva Plataforma
        </button>
      </div>

      <div className="relative">
        <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Buscar plataformas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTenants.map((tenant) => (
          <div key={tenant.id} className="bg-dark-800 rounded-xl border border-dark-700 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: tenant.primaryColor + '30' }}
                >
                  <Building2 size={24} style={{ color: tenant.primaryColor }} />
                </div>
                <div>
                  <h3 className="text-white font-medium">{tenant.name}</h3>
                  <p className="text-gray-500 text-sm">/{tenant.slug}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs ${
                tenant.status === 'active' 
                  ? 'bg-green-600/20 text-green-400' 
                  : 'bg-gray-600/20 text-gray-400'
              }`}>
                {tenant.status === 'active' ? 'Activo' : 'Inactivo'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-dark-900 rounded-lg p-3 text-center">
                <Users size={16} className="text-gray-500 mx-auto mb-1" />
                <p className="text-white font-semibold">{tenant.stats?.users || 0}</p>
                <p className="text-gray-600 text-xs">Usuarios</p>
              </div>
              <div className="bg-dark-900 rounded-lg p-3 text-center">
                <MessageSquare size={16} className="text-gray-500 mx-auto mb-1" />
                <p className="text-white font-semibold">{tenant.stats?.tickets || 0}</p>
                <p className="text-gray-600 text-xs">Tickets</p>
              </div>
              <div className="bg-dark-900 rounded-lg p-3 text-center">
                <Plug size={16} className="text-gray-500 mx-auto mb-1" />
                <p className="text-white font-semibold">{tenant.stats?.connections || 0}</p>
                <p className="text-gray-600 text-xs">Conexiones</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-dark-700">
              <span className="text-gray-500 text-sm">Plan: {tenant.plan}</span>
              <button className="p-2 hover:bg-dark-700 rounded-lg text-gray-400">
                <MoreVertical size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-xl border border-dark-700 w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Nueva Plataforma</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Nombre</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: BET"
                  className="w-full px-4 py-2.5 bg-dark-900 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Slug (URL)</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  placeholder="Ej: bet"
                  className="w-full px-4 py-2.5 bg-dark-900 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <hr className="border-dark-700" />
              <p className="text-sm text-gray-400">Administrador de la plataforma</p>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Nombre Admin</label>
                <input
                  type="text"
                  value={form.adminName}
                  onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-dark-900 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Email Admin</label>
                <input
                  type="email"
                  value={form.adminEmail}
                  onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                  className="w-full px-4 py-2.5 bg-dark-900 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Contraseña Admin</label>
                <input
                  type="password"
                  value={form.adminPassword}
                  onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                  className="w-full px-4 py-2.5 bg-dark-900 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 bg-dark-700 hover:bg-dark-600 text-white rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tenants;
