# Diario Imparcial

Diario digital argentino que agrupa coberturas de distintos medios, detecta los temas coincidentes y genera síntesis trazables sin opinión editorial.

## Desarrollo local

Requisitos: Node.js 22 y pnpm.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

La aplicación queda disponible en `http://localhost:3000`.

## Variables de entorno

- `NEXT_PUBLIC_SITE_URL`: URL pública canónica.
- `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: clave pública de Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: clave privada usada solo por el servidor.
- `OPENAI_API_KEY`: clave para ranking y generación editorial.
- `OPENAI_MODEL`: modelo utilizado; por defecto `gpt-5-nano`.
- `CRON_SECRET`: secreto largo y aleatorio compartido entre Vercel y GitHub Actions.

Nunca expongas `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY` ni `CRON_SECRET` con el prefijo `NEXT_PUBLIC_`.

## Base de datos

Ejecutá, en orden, los scripts SQL de `scripts/` desde el editor SQL de Supabase. Después verificá `/api/health`; debe responder con los tres servicios en estado `ready`.

## Automatización editorial

Vercel ejecuta una actualización diaria de respaldo. GitHub Actions actualiza artículos y anti-clickbait como tareas independientes cada 30 minutos.

Para habilitarla, cargá exactamente el mismo `CRON_SECRET` en:

1. Vercel → Project Settings → Environment Variables, para Production, Preview y Development.
2. GitHub → Settings → Secrets and variables → Actions → `CRON_SECRET`.

Las rutas que generan contenido, escriben datos o muestran migraciones requieren `Authorization: Bearer <CRON_SECRET>` en producción.

## Comprobaciones antes de publicar

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm build
```

Las cuatro deben finalizar correctamente antes de desplegar.
