# CRM Multi-tenant para Plataformas de Apuestas

Sistema de CRM con chat en tiempo real vía WhatsApp para múltiples plataformas.

## 🚀 Instalación Rápida

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/crm-apuestas.git
cd crm-apuestas

# Levantar con Docker
docker-compose up -d

# Ver logs
docker-compose logs -f backend
```

## 🔑 Acceso

- **API:** http://tu-ip:3001/api
- **Usuario:** admin@crm.com
- **Contraseña:** admin123

## 📡 Endpoints

### Auth
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Usuario actual
- `POST /api/auth/logout` - Cerrar sesión

### Tenants (Super Admin)
- `GET /api/tenants` - Listar
- `POST /api/tenants` - Crear
- `PUT /api/tenants/:id` - Actualizar
- `DELETE /api/tenants/:id` - Eliminar

### Usuarios
- `GET /api/users` - Listar
- `POST /api/users` - Crear
- `PUT /api/users/:id` - Actualizar
- `DELETE /api/users/:id` - Eliminar

## 🛠️ Stack

- Node.js + Express
- MySQL 8
- Redis
- Socket.io
- Docker
