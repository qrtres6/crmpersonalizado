import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  MessageSquare,
  Users,
  Contact,
  Plug,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp
} from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, color, subtext }) => (
  <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-gray-400 text-sm">{label}</p>
        <p className="text-3xl font-bold text-white mt-2">{value}</p>
        {subtext && <p className="text-gray-500 text-sm mt-1">{subtext}</p>}
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    ticketsPending: 0,
    ticketsOpen: 0,
    ticketsClosed: 0,
    contacts: 0,
    users: 0,
    connections: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Por ahora datos de ejemplo
      // TODO: Crear endpoint de stats
      setStats({
        ticketsPending: 12,
        ticketsOpen: 8,
        ticketsClosed: 156,
        contacts: 342,
        users: 5,
        connections: 2
      });
    } catch (error) {
      console.error('Error cargando stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">
          Bienvenido, {user?.name}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Clock}
          label="Tickets Pendientes"
          value={stats.ticketsPending}
          color="bg-yellow-600"
          subtext="Sin asignar"
        />
        <StatCard
          icon={MessageSquare}
          label="Tickets Abiertos"
          value={stats.ticketsOpen}
          color="bg-indigo-600"
          subtext="En atención"
        />
        <StatCard
          icon={CheckCircle}
          label="Tickets Cerrados"
          value={stats.ticketsClosed}
          color="bg-green-600"
          subtext="Este mes"
        />
        <StatCard
          icon={Contact}
          label="Contactos"
          value={stats.contacts}
          color="bg-blue-600"
        />
      </div>

      {/* Second Row */}
      {(user?.role === 'super_admin' || user?.role === 'admin') && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard
            icon={Users}
            label="Usuarios Activos"
            value={stats.users}
            color="bg-purple-600"
          />
          <StatCard
            icon={Plug}
            label="Conexiones WhatsApp"
            value={stats.connections}
            color="bg-emerald-600"
          />
          <StatCard
            icon={TrendingUp}
            label="Tasa de Respuesta"
            value="94%"
            color="bg-cyan-600"
            subtext="Promedio 2.5 min"
          />
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tickets recientes */}
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Tickets Recientes</h2>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 p-3 bg-dark-900 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium">
                  U
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">Usuario #{i}</p>
                  <p className="text-gray-500 text-xs truncate">Último mensaje del ticket...</p>
                </div>
                <span className="px-2 py-1 bg-yellow-600/20 text-yellow-400 text-xs rounded-full">
                  Pendiente
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Agentes online */}
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Agentes Online</h2>
          <div className="space-y-3">
            {[
              { name: 'Juan Pérez', tickets: 3, status: 'active' },
              { name: 'María García', tickets: 5, status: 'active' },
              { name: 'Carlos López', tickets: 2, status: 'away' },
            ].map((agent, i) => (
              <div key={i} className="flex items-center gap-4 p-3 bg-dark-900 rounded-lg">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-medium">
                    {agent.name.charAt(0)}
                  </div>
                  <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-dark-900 ${
                    agent.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'
                  }`}></span>
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{agent.name}</p>
                  <p className="text-gray-500 text-xs">{agent.tickets} tickets activos</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
