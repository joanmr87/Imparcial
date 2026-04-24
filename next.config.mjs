import { fileURLToPath } from "node:url"

const projectRoot = fileURLToPath(new URL(".", import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "fotos.perfil.com" },
      { protocol: "https", hostname: "www.infobae.com" },
      { protocol: "https", hostname: "grupooctubre-pagina12-prod.web.arc-cdn.net" },
      { protocol: "https", hostname: "www.clarin.com" },
      { protocol: "https", hostname: "media.ambito.com" },
      { protocol: "https", hostname: "tn.com.ar" },
      { protocol: "https", hostname: "tn.com.ar" },
      { protocol: "https", hostname: "imagenes.perfil.com" },
      { protocol: "https", hostname: "resizer.glanacion.com" },
      { protocol: "https", hostname: "arc-anglerfish-arc2-prod-artear.s3.amazonaws.com" },
      { protocol: "https", hostname: "media.tycsports.com" },
      { protocol: "https", hostname: "www.minutouno.com" },
      { protocol: "https", hostname: "www.c5n.com" },
      { protocol: "https", hostname: "img.iprofesional.com" },
      { protocol: "https", hostname: "www.cronista.com" },
    ],
  },
  turbopack: {
    root: projectRoot,
  },
}

export default nextConfig
