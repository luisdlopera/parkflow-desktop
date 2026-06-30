import { Service } from 'node-windows';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Creacion del objeto de servicio
const svc = new Service({
  name: 'ParkFlow Print Agent',
  script: path.join(__dirname, '..', 'dist', 'server.js')
});

// Escuchar el evento de desinstalacion
svc.on('uninstall', () => {
  console.log('✅ Servicio "ParkFlow Print Agent" desinstalado correctamente.');
  console.log('El servicio ya no existe en Windows.');
});

console.log('Desinstalando el servicio de Windows...');
svc.uninstall();
