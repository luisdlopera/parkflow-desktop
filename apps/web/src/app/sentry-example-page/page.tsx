"use client";

import * as Sentry from "@sentry/nextjs";

import { Button } from "@/components/bridge/Button";

export default function SentryExamplePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-background text-foreground">
      <h1 className="text-4xl font-bold mb-8">Página de Prueba de Sentry</h1>
      <p className="mb-8 text-center max-w-md">
        Esta página está diseñada específicamente para generar un error no controlado 
        y verificar que Sentry lo capture correctamente en el panel de control.
      </p>
      
      <div className="flex gap-4">
        <Button 
          color="danger" 
          size="lg"
          onPress={() => {
            // Genera un error intencional
            throw new Error("Sentry Example Frontend Error");
          }}
        >
          Generar Error
        </Button>
        <Button
          color="primary"
          size="lg"
          onPress={() => {
            console.log("Este es un console.log que será atrapado por Sentry");
            Sentry.captureMessage('Log manual generado por el usuario', 'info');
          }}
        >
          Generar Log
        </Button>
      </div>
    </div>
  );
}
