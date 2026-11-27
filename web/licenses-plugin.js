/* global process */
// Genera build/legal/terceros.txt con la licencia de cada librería que va dentro de la web.
// Las licencias MIT, BSD, ISC y Apache piden conservar el aviso de copyright al distribuir el código;
// como el build lo minimiza, aquí se juntan todos los avisos en un solo archivo público.
import fs from 'node:fs';
import path from 'node:path';

const LICENSE_FILES = /^(licen[cs]e|copying|notice)(\..*)?$/i;

const readLicenseTexts = (dir) => {
  try {
    return fs
      .readdirSync(dir)
      .filter((file) => LICENSE_FILES.test(file))
      .sort()
      .map((file) => fs.readFileSync(path.join(dir, file), 'utf8').trim());
  } catch {
    return [];
  }
};

export default function licensesPlugin() {
  return {
    name: 'roadsafe-third-party-licenses',
    apply: 'build',
    generateBundle() {
      const root = process.cwd();
      const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
      const entries = Object.entries(lock.packages || {})
        .filter(([key, info]) => key && !info.dev && !info.devOptional)
        .map(([key, info]) => {
          const dir = path.join(root, key);
          let pkg = {};
          try {
            pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
          } catch {
            // paquete opcional no instalado en esta plataforma
          }
          const name = key.split('node_modules/').pop();
          const license = typeof pkg.license === 'object' ? pkg.license?.type : pkg.license;
          return {
            name,
            version: pkg.version || info.version || '',
            license: license || info.license || 'ver texto',
            texts: readLicenseTexts(dir),
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      const separator = '-'.repeat(78);
      const body = entries
        .map((entry) =>
          [
            `${entry.name} ${entry.version}`,
            `Licencia: ${entry.license}`,
            '',
            entry.texts.join('\n\n') || '(el paquete no incluye archivo de licencia)',
          ].join('\n'),
        )
        .join(`\n\n${separator}\n\n`);

      this.emitFile({
        type: 'asset',
        fileName: 'legal/terceros.txt',
        source:
          'Licencias de terceros incluidas en la web de Roadsafe\n' +
          `(${entries.length} paquetes; generado automáticamente al compilar)\n\n` +
          `${separator}\n\n${body}\n`,
      });
    },
  };
}
