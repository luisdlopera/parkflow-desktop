import { Service } from 'node-windows';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Creacion del objeto de servicio
const svc = new Service({
  name: 'ParkFlow Print Agent',
  description: 'Servicio en segundo plano para manejar la impresion local de tickets de ParkFlow.',
  script: path.join(__dirname, '..', 'dist', 'server.js'),
  env: [
    {
      name: "NODE_ENV",
      value: "production"
    }
  ],
  // Wait 2 seconds before restarting if it crashes
  wait: 2,
  // Automatically restart up to 100 times
  grow: 0.5,
  maxRetries: 100
});

// Escuchar el evento de instalacion exitosa
svc.on('install', () => {
  console.log('✅ Servicio "ParkFlow Print Agent" instalado correctamente en Windows.');
  console.log('🔄 Iniciando el servicio...');
  svc.start();
});

// Escuchar si ya existe
svc.on('alreadyinstalled', () => {
  console.log('⚠️ El servicio ya se encuentra instalado.');
});

// Escuchar inicio
svc.on('start', () => {
  console.log('🚀 Servicio iniciado. La impresion local esta lista en segundo plano.');
});

console.log('Instalando el servicio de Windows...');
svc.install();
