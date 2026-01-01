import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import api from '../services/api';
import { User, Bell, Moon, Lock, Loader2 } from 'lucide-react';

const Settings = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });
  const [password, setPassword] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const handleProfileSave = async () => {
    setSaving(true);
    try {
      const response = await api.put('/auth/profile', { name: profile.name });
      updateUser(response.data.data);
      toast.success('Perfil actualizado');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (password.new !== password.confirm) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (password.new.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setSaving(true);
    try {
      await api.put('/auth/password', {
        currentPassword: password.current,
        newPassword: password.new
      });
      toast.success('Contraseña actualizada');
      setPassword({ current: '', new: '', confirm: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al cambiar contraseña');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
    { id: 'security', label: 'Seguridad', icon: Lock },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Configuración</h1>
        <p className="text-gray-400 mt-1">Personaliza tu cuenta</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 shrink-0">
          <nav className="bg-dark-800 rounded-xl border border-dark-700 p-2 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:bg-dark-700 hover:text-white'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-dark-800 rounded-xl border border-dark-700 p-6">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-white">Información del perfil</h2>
              
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-medium">{user?.name}</p>
                  <p className="text-gray-400 text-sm">{user?.role}</p>
                </div>
              </div>

              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Nombre</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-dark-900 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Email</label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full px-4 py-2.5 bg-dark-900 border border-dark-600 rounded-lg text-gray-500 cursor-not-allowed"
                  />
                </div>
                <button
                  onClick={handleProfileSave}
                  disabled={saving}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  Guardar cambios
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-white">Notificaciones</h2>
              
              <div className="space-y-4">
                {[
                  { id: 'sound', label: 'Sonido', desc: 'Reproducir sonido en nuevos mensajes' },
                  { id: 'desktop', label: 'Escritorio', desc: 'Mostrar notificaciones de escritorio' },
                  { id: 'newTicket', label: 'Nuevos tickets', desc: 'Notificar cuando llegue un nuevo ticket' },
                  { id: 'newMessage', label: 'Nuevos mensajes', desc: 'Notificar en cada mensaje nuevo' },
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-dark-900 rounded-lg">
                    <div>
                      <p className="text-white">{item.label}</p>
                      <p className="text-gray-500 text-sm">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-dark-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-white">Cambiar contraseña</h2>
              
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Contraseña actual</label>
                  <input
                    type="password"
                    value={password.current}
                    onChange={(e) => setPassword({ ...password, current: e.target.value })}
                    className="w-full px-4 py-2.5 bg-dark-900 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Nueva contraseña</label>
                  <input
                    type="password"
                    value={password.new}
                    onChange={(e) => setPassword({ ...password, new: e.target.value })}
                    className="w-full px-4 py-2.5 bg-dark-900 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Confirmar contraseña</label>
                  <input
                    type="password"
                    value={password.confirm}
                    onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
                    className="w-full px-4 py-2.5 bg-dark-900 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  onClick={handlePasswordChange}
                  disabled={saving || !password.current || !password.new}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  Cambiar contraseña
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
