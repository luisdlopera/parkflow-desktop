import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/login", "/forgot-password"],
        disallow: [
          "/",
          "/onboarding",
          "/admin/",
          "/configuracion/",
          "/caja",
          "/nuevo-ingreso",
          "/salida-cobro",
          "/vehiculos-activos",
          "/reportes",
          "/perfil",
          "/facturacion",
          "/support",
          "/settings",
          "/search",
          "/change-password",
          "/reset-password",
        ],
      },
    ],
  };
}
