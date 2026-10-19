# Re-Alimenta Backend

Backend de la plataforma **Re-Alimenta**, una aplicación web que conecta a
restaurantes y empresas de alimentos que tienen excedentes con empresas
sociales que pueden aprovecharlos. La empresa donante crea una actividad de
recolección, una empresa receptora la revisa y acepta, y un repartidor
asignado por la empresa donante transporta los productos hasta el destino.

> **Estado actual:** están implementados los endpoints REST sobre Supabase con
> CRUD para organizations, addresses, profiles, organization-members, donations,
> donation-items, deliveries y attachments; delivery-events solo permite crear y
> consultar, y audit-logs solo lectura. También están la capa de Supabase, la
> validación con DTOs, la autenticación por JWT de Supabase, los endpoints de
> `auth` (`register`/`login`/`refresh`/`logout`), la subida y descarga de
> archivos con Supabase Storage, el manejo uniforme de errores, la
> paginación/filtros, Scalar y las migraciones SQL versionadas.
>
> Quedan **fuera de esta fase** (documentados como objetivo, no implementados):
> `GET/PATCH /users/me`, reglas de negocio de transición de estados, rate
> limiting y notificaciones.

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
├── supabase/            # cliente Supabase inyectable (usuario, anónimo y administrador)
├── auth/                # register/login/refresh/logout, guard JWT y @CurrentUser/@Public
├── common/
│   ├── crud.service.ts  # CRUD genérico contra Supabase (create/findOne/list/update/remove)
│   ├── database-errors.ts
│   ├── dto/             # paginación
│   └── filters/         # filtro global de excepciones
├── health/              # GET /api/health
├── organizations/
├── addresses/
├── profiles/
├── organization-members/
├── donations/
├── donation-items/
├── deliveries/
├── delivery_events/     # ruta /api/delivery-events
├── attachments/         # metadata + upload/download con Supabase Storage
├── audit-logs/          # solo lectura
├── app.setup.ts         # prefijo, multipart, ValidationPipe, filtros, CORS y Scalar
├── app.module.ts
└── main.ts
```

Cada módulo mantiene la separación NestJS de `controller`, `service`, DTOs y
tipos. Los controladores solo delegan en el servicio; la lógica de acceso a
datos vive en `CrudService` y en los overrides de cada servicio.

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
CORS_ORIGIN=http://localhost:3001
```

`SUPABASE_SERVICE_ROLE_KEY` solo puede existir en el servidor y nunca debe
enviarse al cliente ni registrarse en logs. En producción, las variables se
configuran en el proveedor de despliegue. La aplicación debe fallar al
arrancar si faltan variables obligatorias, en vez de usar valores falsos.

## Modelo de datos en Supabase

Las tablas usan UUID, `created_at` y, cuando son mutables, `updated_at`
gestionado por trigger. `auth.users` es administrada por Supabase Auth; las
tablas de negocio la referencian sin guardar contraseñas.

> **Decisión sobre `auth_users`:** el diagrama la listaba como tabla propia,
> pero duplicar usuarios de Supabase Auth obligaría a mantener dos fuentes de
> identidad. No se crea: `profiles.id`, `organization_members.user_id`,
> `deliveries.courier_id`, `delivery_events.actor_id`,
> `attachments.uploaded_by` y `audit_logs.actor_id` referencian
> `auth.users(id)`.

Tablas: `profiles`, `organizations`, `organization_members`, `addresses`,
`donations`, `donation_items`, `deliveries`, `delivery_events`, `attachments`
y `audit_logs` (ver
`supabase/migrations/20260101000000_re_alimenta_crud.sql`).

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

## CRUD implementado

Todos los recursos siguen el mismo contrato y requieren `Authorization: Bearer
<token>` (salvo `GET /api/health` y las rutas públicas de `auth`).
`delivery-events`, `attachments` y `audit-logs` no exponen todas las
operaciones (ver notas):

```text
POST   /api/{recurso}        201 Created
GET    /api/{recurso}        200 OK   (?page=&limit=&sort=&order=&filtros)
GET    /api/{recurso}/:id    200 OK
PATCH  /api/{recurso}/:id    200 OK
DELETE /api/{recurso}/:id    204 No Content
```

| Recurso | Ruta base | Filtros de listado |
| --- | --- | --- |
| Organizaciones | `/api/organizations` | `type`, `verification_status`, `tax_id`, `search` |
| Direcciones | `/api/addresses` | `organization_id` |
| Perfiles | `/api/profiles` | `status`, `search` |
| Miembros de organización | `/api/organization-members` | `organization_id`, `user_id`, `role`, `status` |
| Donaciones | `/api/donations` | `status`, `donor_organization_id`, `recipient_organization_id`, `search` |
| Ítems de donación | `/api/donation-items` | `donation_id`, `category`, `condition`, `search` |
| Entregas | `/api/deliveries` | `donation_id`, `courier_id`, `status` |
| Eventos de entrega | `/api/delivery-events` | `delivery_id`, `event_type`, `status`, `actor_id` (solo POST/GET) |
| Adjuntos | `/api/attachments` | `organization_id`, `resource_type`, `resource_id`, `uploaded_by` |
| Auditoría | `/api/audit-logs` | `actor_id`, `action`, `resource_type`, `resource_id` |

Notas de implementación:

- **Auditoría de solo lectura:** `audit-logs` solo expone `GET`. Para el resto de
  recursos, cada `POST`/`PATCH`/`DELETE` escribe un registro en `audit_logs`
  desde el servidor con el cliente privilegiado.
- **Eventos inmutables:** `delivery-events` solo expone `POST` y `GET`. No hay
  `PATCH`/`DELETE` porque la RLS tampoco los permite: el historial no se edita.
- **Adjuntos:** `POST /api/attachments` recibe `multipart/form-data` con
  `organization_id`, `resource_type`, `resource_id` y `file`; sube el objeto y
  registra la fila. `GET /api/attachments/:id/url` devuelve una URL firmada por
  1 hora y `DELETE` borra la fila y el objeto. No hay `PATCH`: el `storage_path`
  lo genera el servidor para que un cliente no pueda apuntar a otro objeto.
- **Verificación de organizaciones:** al crear una organización siempre queda
  `verification_status: "pending"`; el cliente no puede auto-verificarse. Solo
  un admin de la organización puede cambiarlo con `PATCH /api/organizations/:id`.
- **Identidad del servidor:** `profiles.id`, `delivery_events.actor_id` y
  `attachments.uploaded_by` se derivan del JWT; el cuerpo nunca puede
  establecerlos. `occurred_at` de los eventos lo fija el servidor.
- **Listados:** `page` (≥1), `limit` (1–100, por defecto 20), `sort` solo con
  campos permitidos por recurso y `order=asc|desc`. Respuesta:
  `{ "data": [...], "page": 1, "limit": 20, "total": 42 }`.
- **Errores:** formato uniforme
  `{ "statusCode", "message", "code", "timestamp" }`; `400` DTO inválido,
  `401` token ausente/inválido, `403` permisos, `404` inexistente, `409`
  conflicto/unique/FK, `422` restricción de datos, `500` error interno.
- **Documentación:** Scalar en `GET /api/docs`.
- **Salud:** `GET /api/health` (público) comprueba la conectividad con Supabase
  sin exponer detalles.

## Autenticación

| Método | Ruta | Propósito |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Crear usuario, perfil y devolver la sesión (público) |
| `POST` | `/api/auth/login` | Iniciar sesión y devolver la sesión (público) |
| `POST` | `/api/auth/refresh` | Renovar el acceso con `refresh_token` (público) |
| `POST` | `/api/auth/logout` | Revocar la sesión actual (requiere Bearer) |

`register` crea el usuario con el admin client de Supabase, crea su `profile` y
devuelve la sesión. Por ahora el email se auto-confirma (`email_confirm: true`)
para no depender de un proveedor de correo; si se exige verificación, hay que
cambiar a `signUp` y completar el flujo de confirmación.

`login` y `refresh` devuelven la sesión de Supabase (`access_token`,
`refresh_token`, `expires_in`, `user`). Usa `access_token` como
`Authorization: Bearer <access_token>`. El guard lo valida con
`supabase.getUser()` y las consultas se ejecutan con ese JWT, por lo que **las
políticas RLS son la segunda capa de autorización**.

### Obtener un token para probar

```bash
curl -X POST http://127.0.0.1:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@ejemplo.com","password":"<PASSWORD>"}'
```

También se puede obtener directamente desde Supabase Auth con
`POST https://<project-ref>.supabase.co/auth/v1/token?grant_type=password`.

### Prueba manual del flujo completo

`/api` es el prefijo global. `GET /api/` devuelve una respuesta simple de
verificación; para comprobar también la conectividad con Supabase usa
`GET /api/health`. La documentación interactiva está disponible en
`GET /api/docs`.

El siguiente flujo usa el CRUD actualmente implementado. Guarda el `id` que
devuelve cada respuesta y reemplaza los valores entre `<...>` en la siguiente
petición. Todas las rutas, excepto `/api/health`, requieren:

```text
Authorization: Bearer <SUPABASE_ACCESS_TOKEN>
```

#### 1. Crear organizaciones y ubicaciones

```bash
curl -X POST http://127.0.0.1:3000/api/organizations \
  -H "Authorization: Bearer <TOKEN_DONANTE>" -H "Content-Type: application/json" \
  -d '{"legal_name":"Restaurante Donante","type":"donor","tax_id":"RUC-DONANTE-001"}'

curl -X POST http://127.0.0.1:3000/api/organizations \
  -H "Authorization: Bearer <TOKEN_RECEPTORA>" -H "Content-Type: application/json" \
  -d '{"legal_name":"Fundacion Receptora","type":"recipient","tax_id":"RUC-RECEPTORA-001"}'
```

Usa los identificadores devueltos para crear las direcciones:

```bash
curl -X POST http://127.0.0.1:3000/api/addresses \
  -H "Authorization: Bearer <TOKEN_DONANTE>" -H "Content-Type: application/json" \
  -d '{"organization_id":"<DONOR_ORG_ID>","label":"Cocina principal","address_line":"Av. Siempre Viva 123","latitude":4.711000,"longitude":-74.072000}'

curl -X POST http://127.0.0.1:3000/api/addresses \
  -H "Authorization: Bearer <TOKEN_RECEPTORA>" -H "Content-Type: application/json" \
  -d '{"organization_id":"<RECIPIENT_ORG_ID>","label":"Centro de recepcion","address_line":"Cra. 45-67","latitude":4.681000,"longitude":-74.050000}'
```

#### 2. Crear la donación y el producto

El CRUD aún no tiene `POST /donations/:id/publish`; crea la donación
directamente en `published` para probar el recorrido:

```bash
curl -X POST http://127.0.0.1:3000/api/donations \
  -H "Authorization: Bearer <TOKEN_DONANTE>" -H "Content-Type: application/json" \
  -d '{"donor_organization_id":"<DONOR_ORG_ID>","pickup_address_id":"<PICKUP_ADDRESS_ID>","status":"published","description":"Alimentos preparados del dia","available_from":"2026-10-19","available_until":"2026-10-20"}'

curl -X POST http://127.0.0.1:3000/api/donation-items \
  -H "Authorization: Bearer <TOKEN_DONANTE>" -H "Content-Type: application/json" \
  -d '{"donation_id":"<DONATION_ID>","name":"Arroz con verduras","quantity":25,"category":"prepared_food","condition":"fresh"}'
```

#### 3. Solicitar y asignar la entrega

La solicitud se representa actualmente actualizando la donación:

```bash
curl -X PATCH http://127.0.0.1:3000/api/donations/<DONATION_ID> \
  -H "Authorization: Bearer <TOKEN_RECEPTORA>" -H "Content-Type: application/json" \
  -d '{"recipient_organization_id":"<RECIPIENT_ORG_ID>","delivery_address_id":"<DELIVERY_ADDRESS_ID>","status":"reserved"}'
```

`courier_id` debe ser el UUID de un usuario existente en `auth.users`:

```bash
curl -X POST http://127.0.0.1:3000/api/deliveries \
  -H "Authorization: Bearer <TOKEN_DONANTE>" -H "Content-Type: application/json" \
  -d '{"donation_id":"<DONATION_ID>","courier_id":"<COURIER_USER_ID>","origin_address_id":"<PICKUP_ADDRESS_ID>","destination_address_id":"<DELIVERY_ADDRESS_ID>","status":"assigned","scheduled_at":"2026-10-19T18:00:00.000Z"}'
```

#### 4. Recoger, transportar y entregar

Registra cada hito con el token del repartidor. `actor_id` y `occurred_at`
los fija el servidor:

```bash
curl -X POST http://127.0.0.1:3000/api/delivery-events \
  -H "Authorization: Bearer <TOKEN_REPARTIDOR>" -H "Content-Type: application/json" \
  -d '{"delivery_id":"<DELIVERY_ID>","event_type":"picked_up","status":"picked_up","latitude":4.711000,"longitude":-74.072000}'

curl -X PATCH http://127.0.0.1:3000/api/deliveries/<DELIVERY_ID> \
  -H "Authorization: Bearer <TOKEN_REPARTIDOR>" -H "Content-Type: application/json" \
  -d '{"status":"in_transit"}'

curl -X POST http://127.0.0.1:3000/api/delivery-events \
  -H "Authorization: Bearer <TOKEN_REPARTIDOR>" -H "Content-Type: application/json" \
  -d '{"delivery_id":"<DELIVERY_ID>","event_type":"delivered","status":"delivered","latitude":4.681000,"longitude":-74.050000}'

curl -X PATCH http://127.0.0.1:3000/api/deliveries/<DELIVERY_ID> \
  -H "Authorization: Bearer <TOKEN_REPARTIDOR>" -H "Content-Type: application/json" \
  -d '{"status":"delivered"}'

curl -X PATCH http://127.0.0.1:3000/api/donations/<DONATION_ID> \
  -H "Authorization: Bearer <TOKEN_DONANTE>" -H "Content-Type: application/json" \
  -d '{"status":"delivered"}'
```

Comprueba el resultado con `GET /api/donations/<DONATION_ID>`,
`GET /api/donation-items?donation_id=<DONATION_ID>`,
`GET /api/deliveries/<DELIVERY_ID>` y
`GET /api/delivery-events?delivery_id=<DELIVERY_ID>`.

Este recorrido comprueba el CRUD y la trazabilidad, pero todavía no aplica
transiciones de estado, aceptación atómica, permisos por rol ni acciones
dedicadas de negocio. Esas reglas están documentadas como fases posteriores.

## API REST objetivo (fases posteriores)

Todas las rutas se sirven bajo `/api`, devuelven JSON y requieren autenticación
salvo que se indique lo contrario. Las respuestas de listado deben incluir
paginación (`page`, `limit`, `total`) y filtros validados.

> Las rutas de `auth` ya están implementadas (ver **Autenticación**). Las
> acciones de negocio (`publish`, `accept`, `cancel`, `status`, `tracking`,
> `evidence`) y `/users/me` **no** están implementadas todavía.

### Usuarios

| Método | Ruta | Propósito |
| --- | --- | --- |
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

Implementado con un bucket privado (`SUPABASE_STORAGE_BUCKET`, por defecto
`donation-evidence`) y rutas
`{organization_id}/{resource_type}/{resource_id}/{uuid}.{ext}`. El backend:

- valida `multipart/form-data`, MIME permitido (`image/jpeg`, `image/png`,
  `image/webp`, `application/pdf`) y tamaño máximo (10 MB);
- genera el nombre del objeto (no usa el nombre enviado por el cliente);
- sube y firma con el JWT del usuario, por lo que las políticas de
  `storage.objects` refuerzan la pertenencia a la organización;
- guarda únicamente el path y metadatos en `attachments`;
- devuelve URLs firmadas de 1 hora y borra el objeto junto con la fila.

La migración `supabase/migrations/20261019000000_storage_attachments.sql` crea
el bucket y las políticas RLS. Queda pendiente limpiar por job los objetos
huérfanos si falla un borrado y auditar las descargas de evidencias sensibles.

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

## Migraciones y RLS

El esquema completo está en
`supabase/migrations/20260101000000_re_alimenta_crud.sql`: tablas, claves
primarias/foráneas, `CHECK` e índices, triggers de `updated_at`, funciones
`SECURITY DEFINER` para pertenencia (`is_org_member`, `is_org_admin`,
`can_access_donation`, `can_access_delivery`) y políticas RLS por tabla.

`supabase/migrations/20261019000000_storage_attachments.sql` añade el bucket
privado de evidencias y sus políticas RLS. Toda modificación de base de datos
debe entrar por una migración nueva, no por cambios manuales en el dashboard.

Aplicar las migraciones (elige una):

```bash
# Con la CLI de Supabase
npx supabase link --project-ref <project-ref>
npx supabase db push

# O pega el contenido del .sql en el SQL Editor del dashboard
```

`audit_logs` no tiene políticas de escritura: los registros los crea el servidor
con la service role key (que omite RLS). `delivery_events` tampoco permite
`UPDATE`/`DELETE` desde el cliente, para preservar el historial.

## Pruebas

```bash
npm run test     # unitarias (CrudService, auth y attachments)
npm run test:e2e # end-to-end (AppModule con Supabase simulado)
npm run lint
npm run build
```

Las pruebas no usan credenciales reales: `test/fake-supabase.ts` implementa un
cliente en memoria. La persistencia real solo se ejerce contra Supabase.

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
