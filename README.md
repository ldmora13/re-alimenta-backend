# Re-Alimenta Backend

Backend de la plataforma **Re-Alimenta**, una aplicación web que conecta a
restaurantes y empresas de alimentos que tienen excedentes con empresas
sociales que pueden aprovecharlos. La empresa donante crea una actividad de
recolección, una empresa receptora la revisa y acepta, y un repartidor
asignado por la empresa donante transporta los productos hasta el destino.

> **Estado actual:** el repositorio contiene el esqueleto inicial de NestJS y
> los módulos de dominio. La integración con Supabase, la autenticación y los
> casos de uso de donaciones/recolecciones aún deben implementarse. Las rutas
> descritas en este documento son el contrato técnico objetivo.

## Flujo principal

1. Una empresa donante (restaurante o empresa de alimentos) se registra y
   publica una actividad de recolección con los productos disponibles,
   cantidades, fechas, ubicación y condiciones de entrega.
2. Las empresas sociales consultan las actividades disponibles y revisan la
   información de cada donación.
3. Una empresa social solicita o acepta una actividad. El backend valida que
   no haya sido asignada a otra empresa y cambia su estado.
4. La empresa donante asigna un repartidor a la entrega.
5. El repartidor recoge la donación, actualiza el estado del traslado y la
   entrega en la ubicación de la empresa receptora.
6. El sistema conserva el historial de estados, evidencias y trazabilidad de
   la operación.

## Arquitectura y tecnologías

- **Runtime:** Node.js LTS.
- **Framework:** NestJS 12 con TypeScript.
- **Servidor HTTP:** Fastify mediante `@nestjs/platform-fastify`.
- **Persistencia:** PostgreSQL administrado por Supabase.
- **Autenticación y autorización:** Supabase Auth con JWT; los permisos se
  refuerzan en NestJS y con Row Level Security (RLS) en PostgreSQL.
- **Archivos:** Supabase Storage para fotos de productos, comprobantes de
  entrega y documentos de organizaciones.
- **Observabilidad:** `@nestjs/observe` está incluido como instrumentación,
  pero deben reemplazarse las credenciales de ejemplo antes de producción.
- **Pruebas:** Vitest, Supertest y pruebas end-to-end.

La API no debe conectarse directamente a PostgreSQL desde el cliente web. El
cliente debe autenticarse con Supabase y enviar el encabezado Authorization con el token de acceso al backend. NestJS valida el token y ejecuta las operaciones de negocio.

## Estructura del código

```text
src/
├── auth/          # autenticación, sesiones, roles y guards
├── common/        # utilidades, filtros, pipes y excepciones compartidas
├── restaurants/   # empresas donantes y sus actividades
├── users/         # perfiles, organizaciones y repartidores
├── orders/        # solicitudes/asignaciones de donaciones
├── delivery/      # asignación y operación de entregas
├── tracking/      # historial y ubicación de entregas
├── app.module.ts
└── main.ts
```

Cada módulo debe mantener la separación NestJS de `controller`, `service`,
DTOs, entidades/tipos, validaciones y pruebas. Las reglas que cambian estados
deben vivir en servicios transaccionales, no en los controladores.

## Configuración local

### Requisitos

- Node.js LTS y npm.
- Un proyecto de Supabase.
- Una base de datos Supabase con sus migraciones aplicadas.

### Instalación y ejecución

```bash
npm install
npm run start:dev
```

La API escucha por defecto en `http://localhost:3000` y usa el prefijo global
`/api`. Por ejemplo, el endpoint de salud objetivo será
`GET http://localhost:3000/api/health`.

Comandos disponibles:

```bash
npm run build       # compilación
npm run start       # ejecución normal
npm run start:dev   # ejecución con watch
npm run start:prod  # ejecución de dist/main
npm run lint        # análisis estático
npm run test        # pruebas unitarias
npm run test:e2e    # pruebas end-to-end
npm run test:cov    # cobertura
npm run format      # formateo
```

## Variables de entorno

Crear un archivo `.env` local (no subirlo al repositorio):

```dotenv
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<public-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<server-only-key>
SUPABASE_STORAGE_BUCKET=donation-evidence
CORS_ORIGIN=http://localhost:5173
```

`SUPABASE_SERVICE_ROLE_KEY` solo puede existir en el servidor y nunca debe
enviarse al cliente ni registrarse en logs. En producción, las variables se
configuran en el proveedor de despliegue. La aplicación debe fallar al
arrancar si faltan variables obligatorias, en vez de usar valores falsos.

## Modelo de datos recomendado en Supabase

Las tablas deben usar UUID, `created_at` y `updated_at` con valores generados
por la base de datos. `auth.users` es administrada por Supabase Auth; las
tablas de negocio deben referenciarla sin guardar contraseñas.

- `profiles`: perfil de usuario, nombre, teléfono y estado.
- `organizations`: empresa donante, empresa social o proveedor logístico;
  nombre legal, identificación, contacto y estado de verificación.
- `organization_members`: relación entre usuarios y organizaciones con rol.
- `addresses`: direcciones de recolección y entrega, coordenadas y referencias.
- `donations`: actividad publicada por una organización donante, descripción,
  categoría, cantidad, unidad, fechas límite, estado y organización receptora.
- `donation_items`: productos individuales, cantidades, unidad y condiciones.
- `deliveries`: donación, repartidor, origen, destino, ventana de entrega y
  estado logístico.
- `delivery_events`: historial inmutable de cambios de estado, actor, fecha,
  ubicación y observaciones.
- `attachments`: metadatos de archivos almacenados en Supabase Storage.
- `audit_logs`: actor, acción, recurso, identificador y metadatos no sensibles.

Estados sugeridos:

```text
donations: draft -> published -> reserved -> picked_up -> delivered
           published/reserved -> cancelled
deliveries: pending -> assigned -> accepted -> in_transit -> delivered
            pending/assigned/accepted -> cancelled
```

Las transiciones deben validarse en el backend y registrarse en
`delivery_events`; no se deben permitir actualizaciones arbitrarias de
`status` desde el cliente.

## API REST objetivo

Todas las rutas se sirven bajo `/api`, devuelven JSON y requieren autenticación
salvo que se indique lo contrario. Las respuestas de listado deben incluir
paginación (`page`, `limit`, `total`) y filtros validados.

### Autenticación y usuarios

| Método | Ruta | Propósito |
| --- | --- | --- |
| `POST` | `/auth/register` | Crear usuario y perfil mediante Supabase Auth |
| `POST` | `/auth/login` | Iniciar sesión y devolver sesión/token |
| `POST` | `/auth/refresh` | Renovar sesión |
| `POST` | `/auth/logout` | Cerrar sesión |
| `GET` | `/users/me` | Consultar perfil y organizaciones |
| `PATCH` | `/users/me` | Actualizar datos permitidos |

### Organizaciones y donaciones

| Método | Ruta | Propósito |
| --- | --- | --- |
| `POST` | `/organizations` | Registrar una organización |
| `GET` | `/organizations/:id` | Consultar una organización autorizada |
| `POST` | `/donations` | Crear una actividad en estado `draft` |
| `PATCH` | `/donations/:id` | Editar una actividad propia |
| `POST` | `/donations/:id/publish` | Publicar una actividad |
| `GET` | `/donations` | Listar actividades disponibles o propias |
| `GET` | `/donations/:id` | Ver detalle y evidencias |
| `POST` | `/donations/:id/accept` | Aceptar/reservar una donación |
| `POST` | `/donations/:id/cancel` | Cancelar con motivo |

### Reparto y seguimiento

| Método | Ruta | Propósito |
| --- | --- | --- |
| `POST` | `/donations/:id/delivery` | Crear entrega y asignar repartidor |
| `PATCH` | `/deliveries/:id/status` | Avanzar el estado logístico |
| `GET` | `/deliveries` | Listar entregas según rol |
| `GET` | `/deliveries/:id` | Consultar entrega e historial |
| `POST` | `/deliveries/:id/events` | Registrar recolección, ubicación o entrega |
| `GET` | `/deliveries/:id/tracking` | Consultar trazabilidad |
| `POST` | `/deliveries/:id/evidence` | Subir foto o comprobante |

Los DTOs deben usar `class-validator`, limitar tamaños y tipos de archivo,
normalizar datos y rechazar propiedades desconocidas. Las respuestas de error
deben usar códigos HTTP consistentes (`400`, `401`, `403`, `404`, `409`, `422`,
`500`) y un formato común con `statusCode`, `message`, `code` y `timestamp`.

## Roles y autorización

Roles mínimos:

- `admin`: administra usuarios, organizaciones y catálogos.
- `donor`: publica donaciones y asigna repartidores.
- `recipient`: consulta y acepta donaciones.
- `courier`: solo ve entregas asignadas y registra su avance.

Se deben implementar guards para validar autenticación, rol y pertenencia al
recurso. La autorización debe comprobarse tanto en NestJS como en las
políticas RLS de Supabase. Un usuario nunca debe poder leer o modificar
donaciones, direcciones, evidencias o entregas de otra organización sin una
relación explícita.

## Supabase Storage

Usar buckets privados, rutas con el formato
`{organization_id}/{resource_type}/{resource_id}/{filename}` y URLs firmadas
con expiración para servir archivos. Validar MIME, extensión, tamaño y nombre
antes de subir. Guardar únicamente el path y metadatos en `attachments`.
Eliminar o marcar archivos huérfanos cuando se cancele un recurso y auditar
las descargas de evidencias sensibles.

## Seguridad y confiabilidad

- Validar y transformar toda entrada con DTOs; no confiar en datos del cliente.
- Aplicar rate limiting en autenticación, cargas de archivos y endpoints
  públicos.
- Usar CORS con una lista explícita de orígenes y HTTPS en producción.
- No registrar tokens, claves, contraseñas ni datos personales innecesarios.
- Usar transacciones o funciones PostgreSQL para aceptar donaciones y asignar
  repartidores evitando carreras (`409 Conflict` si ya fue reservada).
- Añadir idempotency keys a aceptación, asignación y confirmación de entrega.
- Implementar paginación, índices por `status`, fechas, organización y
  ubicación; usar PostGIS si se requieren búsquedas geográficas.
- Añadir health checks de aplicación, base de datos y Storage.
- Configurar backups, migraciones versionadas y políticas de retención.

## Despliegue

1. Aplicar las migraciones de Supabase en un entorno de staging.
2. Configurar las variables de entorno sin exponer la service role key.
3. Ejecutar `npm run build` y `npm run test:e2e` en CI.
4. Publicar `dist` y ejecutar `npm run start:prod`.
5. Configurar un dominio HTTPS, CORS, logs centralizados y alertas.
6. Promover a producción solo después de verificar RLS y flujos de estados.

## Referencias

- [NestJS](https://docs.nestjs.com/)
- [Supabase](https://supabase.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
