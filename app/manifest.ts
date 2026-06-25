import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mis 15 Mily",
    short_name: "15 Mily",
    description: "Invitación oficial a la fiesta de 15 años de Mily",
    start_url: "/?skipEnvelope=true",
    display: "standalone",
    background_color: "#001016",
    theme_color: "#001016",
    orientation: "portrait",
    icons: [
      {
        src: "/pwa-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/pwa-icon.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
