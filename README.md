# Re-Alimenta Backend

Backend de la plataforma **Re-Alimenta**, una aplicaciÃ³n web que conecta a
restaurantes y empresas de alimentos que tienen excedentes con empresas
sociales que pueden aprovecharlos. La empresa donante crea una actividad de
recolecciÃ³n, una empresa receptora la revisa y acepta, y un repartidor
asignado por la empresa donante transporta los productos hasta el destino.

> **Estado actual:** el repositorio contiene el esqueleto inicial de NestJS y
> los mÃ³dulos de dominio. La integraciÃ³n con Supabase, la autenticaciÃ³n y los
> casos de uso de donaciones/recolecciones aÃºn deben implementarse. Las rutas
> descritas en este documento son el contrato tÃ©cnico objetivo.

## Flujo principal

1. Una empresa donante (restaurante o empresa de alimentos) se registra y
   publica una actividad de recolecciÃ³n con los productos disponibles,
   cantidades, fechas, ubicaciÃ³n y condiciones de entrega.
2. Las empresas sociales consultan las actividades disponibles y revisan la
   informaciÃ³n de cada donaciÃ³n.
3. Una empresa social solicita o acepta una actividad. El backend valida que
   no haya sido asignada a otra empresa y cambia su estado.
4. La empresa donante asigna un repartidor a la entrega.
5. El repartidor recoge la donaciÃ³n, actualiza el estado del traslado y la
   entrega en la ubicaciÃ³n de la empresa receptora.
6. El sistema conserva el historial de estados, evidencias y trazabilidad de
   la operaciÃ³n.

## Arquitectura y tecnologÃ­as

- **Runtime:** Node.js LTS.
- **Framework:** NestJS 12 con TypeScript.
- **Servidor HTTP:** Fastify mediante `@nestjs/platform-fastify`.
- **Persistencia:** PostgreSQL administrado por Supabase.
- **AutenticaciÃ³n y autorizaciÃ³n:** Supabase Auth con JWT; los permisos se
  refuerzan en NestJS y con Row Level Security (RLS) en PostgreSQL.
- **Archivos:** Supabase Storage para fotos de productos, comprobantes de
  entrega y documentos de organizaciones.
- **Observabilidad:** `@nestjs/observe` estÃ¡ incluido como instrumentaciÃ³n,
  pero deben reemplazarse las credenciales de ejemplo antes de producciÃ³n.
- **Pruebas:** Vitest, Supertest y pruebas end-to-end.

La API no debe conectarse directamente a PostgreSQL desde el cliente web. El
cliente debe autenticarse con Supabase y enviar el encabezado Authorization con el token de acceso al backend. NestJS valida el token y ejecuta las operaciones de negocio.

## Estructura del cÃ³digo

```text
src/
â”œâ”€â”€ auth/          # autenticaciÃ³n, sesiones, roles y guards
â”œâ”€â”€ common/        # utilidades, filtros, pipes y excepciones compartidas
â”œâ”€â”€ restaurants/   # empresas donantes y sus actividades
â”œâ”€â”€ users/         # perfiles, organizaciones y repartidores
â”œâ”€â”€ orders/        # solicitudes/ asignaciones de donaciones
â”œâ”€â”€ delivery/      # asignaciÃ³n y operaciÃ³n de entregas
â”œâ”€â”€ tracking/      # historial y ubicaciÃ³n de entregas
â”œâ”€â”€ app.module.ts
â””â”€â”€ main.ts
```

Cada mÃ³dulo debe mantener la separaciÃ³n NestJS de `controller`, `service`,
DTOs, entidades/tipos, validaciones y pruebas. Las reglas que cambian estados
deben vivir en servicios transaccionales, no en los controladores.

## ConfiguraciÃ³n local

### Requisitos

- Node.js LTS y npm.
- Un proyecto de Supabase.
- Una base de datos Supabase con sus migraciones aplicadas.

### InstalaciÃ³n y ejecuciÃ³n

```bash
npm install
npm run start:dev
```

La API escucha por defecto en `http://localhost:3000` y usa el prefijo global
`/api`. Por ejemplo, el endpoint de salud objetivo serÃ¡
`GET http://localhost:3000/api/health`.

Comandos disponibles:

```bash
npm run build       # compilaciÃ³n
npm run start       # ejecuciÃ³n normal
npm run start:dev   # ejecuciÃ³n con watch
npm run start:prod  # ejecuciÃ³n de dist/main
npm run lint        # anÃ¡lisis estÃ¡tico
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
enviarse al cliente ni registrarse en logs. En producciÃ³n, las variables se
configuran en el proveedor de despliegue. La aplicaciÃ³n debe fallar al
arrancar si faltan variables obligatorias, en vez de usar valores falsos.

## Modelo de datos recomendado en Supabase

Las tablas deben usar UUID, `created_at` y `updated_at` con valores generados
por la base de datos. `auth.users` es administrada por Supabase Auth; las
tablas de negocio deben referenciarla sin guardar contraseÃ±as.

- `profiles`: perfil de usuario, nombre, telÃ©fono y estado.
- `organizations`: empresa donante, empresa social o proveedor logÃ­stico;
  nombre legal, identificaciÃ³n, contacto y estado de verificaciÃ³n.
- `organization_members`: relaciÃ³n entre usuarios y organizaciones con rol.
- `addresses`: direcciones de recolecciÃ³n y entrega, coordenadas y referencias.
- `donations`: actividad publicada por una organizaciÃ³n donante, descripciÃ³n,
  categorÃ­a, cantidad, unidad, fechas lÃ­mite, estado y organizaciÃ³n receptora.
- `donation_items`: productos individuales, cantidades, unidad y condiciones.
- `deliveries`: donaciÃ³n, repartidor, origen, destino, ventana de entrega y
  estado logÃ­stico.
- `delivery_events`: historial inmutable de cambios de estado, actor, fecha,
  ubicaciÃ³n y observaciones.
- `attachments`: metadatos de archivos almacenados en Supabase Storage.
- `audit_logs`: actor, acciÃ³n, recurso, identificador y metadatos no sensibles.

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

Todas las rutas se sirven bajo `/api`, devuelven JSON y requieren autenticaciÃ³n
salvo que se indique lo contrario. Las respuestas de listado deben incluir
paginaciÃ³n (`page`, `limit`, `total`) y filtros validados.

### AutenticaciÃ³n y usuarios

| MÃ©todo | Ruta | PropÃ³sito |
| --- | --- | --- |
| `POST` | `/auth/register` | Crear usuario y perfil mediante Supabase Auth |
| `POST` | `/auth/login` | Iniciar sesiÃ³n y devolver sesiÃ³n/token |
| `POST` | `/auth/refresh` | Renovar sesiÃ³n |
| `POST` | `/auth/logout` | Cerrar sesiÃ³n |
| `GET` | `/users/me` | Consultar perfil y organizaciones |
| `PATCH` | `/users/me` | Actualizar datos permitidos |

### Organizaciones y donaciones

| MÃ©todo | Ruta | PropÃ³sito |
| --- | --- | --- |
| `POST` | `/organizations` | Registrar una organizaciÃ³n |
| `GET` | `/organizations/:id` | Consultar una organizaciÃ³n autorizada |
| `POST` | `/donations` | Crear una actividad en estado `draft` |
| `PATCH` | `/donations/:id` | Editar una actividad propia |
| `POST` | `/donations/:id/publish` | Publicar una actividad |
| `GET` | `/donations` | Listar actividades disponibles o propias |
| `GET` | `/donations/:id` | Ver detalle y evidencias |
| `POST` | `/donations/:id/accept` | Aceptar/reservar una donaciÃ³n |
| `POST` | `/donations/:id/cancel` | Cancelar con motivo |

### Reparto y seguimiento

| MÃ©todo | Ruta | PropÃ³sito |
| --- | --- | --- |
| `POST` | `/donations/:id/delivery` | Crear entrega y asignar repartidor |
| `PATCH` | `/deliveries/:id/status` | Avanzar el estado logÃ­stico |
| `GET` | `/deliveries` | Listar entregas segÃºn rol |
| `GET` | `/deliveries/:id` | Consultar entrega e historial |
| `POST` | `/deliveries/:id/events` | Registrar recolecciÃ³n, ubicaciÃ³n o entrega |
| `GET` | `/deliveries/:id/tracking` | Consultar trazabilidad |
| `POST` | `/deliveries/:id/evidence` | Subir foto o comprobante |

Los DTOs deben usar `class-validator`, limitar tamaÃ±os y tipos de archivo,
normalizar datos y rechazar propiedades desconocidas. Las respuestas de error
deben usar cÃ³digos HTTP consistentes (`400`, `401`, `403`, `404`, `409`, `422`,
`500`) y un formato comÃºn con `statusCode`, `message`, `code` y `timestamp`.

## Roles y autorizaciÃ³n

Roles mÃ­nimos:

- `admin`: administra usuarios, organizaciones y catÃ¡logos.
- `donor`: publica donaciones y asigna repartidores.
- `recipient`: consulta y acepta donaciones.
- `courier`: solo ve entregas asignadas y registra su avance.

Se deben implementar guards para validar autenticaciÃ³n, rol y pertenencia al
recurso. La autorizaciÃ³n debe comprobarse tanto en NestJS como en las
polÃ­ticas RLS de Supabase. Un usuario nunca debe poder leer o modificar
donaciones, direcciones, evidencias o entregas de otra organizaciÃ³n sin una
relaciÃ³n explÃ­cita.

## Supabase Storage

Usar buckets privados, rutas con el formato
`{organization_id}/{resource_type}/{resource_id}/{filename}` y URLs firmadas
con expiraciÃ³n para servir archivos. Validar MIME, extensiÃ³n, tamaÃ±o y nombre
antes de subir. Guardar Ãºnicamente el path y metadatos en `attachments`.
Eliminar o marcar archivos huÃ©rfanos cuando se cancele un recurso y auditar
las descargas de evidencias sensibles.

## Seguridad y confiabilidad

- Validar y transformar toda entrada con DTOs; no confiar en datos del cliente.
- Aplicar rate limiting en autenticaciÃ³n, cargas de archivos y endpoints
  pÃºblicos.
- Usar CORS con una lista explÃ­cita de orÃ­genes y HTTPS en producciÃ³n.
- No registrar tokens, claves, contraseÃ±as ni datos personales innecesarios.
- Usar transacciones o funciones PostgreSQL para aceptar donaciones y asignar
  repartidores evitando carreras (`409 Conflict` si ya fue reservada).
- AÃ±adir idempotency keys a aceptaciÃ³n, asignaciÃ³n y confirmaciÃ³n de entrega.
- Implementar paginaciÃ³n, Ã­ndices por `status`, fechas, organizaciÃ³n y
  ubicaciÃ³n; usar PostGIS si se requieren bÃºsquedas geogrÃ¡ficas.
- AÃ±adir health checks de aplicaciÃ³n, base de datos y Storage.
- Configurar backups, migraciones versionadas y polÃ­ticas de retenciÃ³n.

## Despliegue

1. Aplicar las migraciones de Supabase en un entorno de staging.
2. Configurar las variables de entorno sin exponer la service role key.
3. Ejecutar `npm run build` y `npm run test:e2e` en CI.
4. Publicar `dist` y ejecutar `npm run start:prod`.
5. Configurar un dominio HTTPS, CORS, logs centralizados y alertas.
6. Promover a producciÃ³n solo despuÃ©s de verificar RLS y flujos de estados.

## Referencias

- [NestJS](https://docs.nestjs.com/)
- [Supabase](https://supabase.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
