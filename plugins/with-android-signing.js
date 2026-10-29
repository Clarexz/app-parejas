// Config plugin: firma release de Android vía variables de entorno / propiedades de Gradle.
// `android/` se regenera con `expo prebuild` y no se commitea, así que la firma se inyecta aquí.
// Es idempotente: marca lo que agrega y no lo duplica si el prebuild corre varias veces.
const { withAppBuildGradle } = require('@expo/config-plugins');

const MARCA_INICIO = '// [with-android-signing] inicio';
const MARCA_FIN = '// [with-android-signing] fin';
const MARCA_BUILDTYPE = '// [with-android-signing] buildType';

// Bloque que se agrega dentro de `signingConfigs { ... }`.
// Lee de variables de entorno o, si no existen, de propiedades de Gradle (-P / gradle.properties).
const BLOQUE_FIRMA = `
        ${MARCA_INICIO}
        release {
            def ksPath = System.getenv('ANDROID_KEYSTORE_PATH') ?: findProperty('ANDROID_KEYSTORE_PATH')
            if (ksPath) {
                storeFile file(ksPath)
                storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD') ?: findProperty('ANDROID_KEYSTORE_PASSWORD')
                keyAlias System.getenv('ANDROID_KEY_ALIAS') ?: findProperty('ANDROID_KEY_ALIAS')
                keyPassword System.getenv('ANDROID_KEY_PASSWORD') ?: findProperty('ANDROID_KEY_PASSWORD')
            }
        }
        ${MARCA_FIN}`;

// Reemplazo de la línea de firma dentro de `buildTypes.release`.
const LINEA_BUILDTYPE = `signingConfig((System.getenv('ANDROID_KEYSTORE_PATH') ?: findProperty('ANDROID_KEYSTORE_PATH')) ? signingConfigs.release : signingConfigs.debug) ${MARCA_BUILDTYPE}`;

/** Aplica los cambios al texto de build.gradle. Exportada aparte para poder probarla. */
function aplicarFirma(contents) {
  let out = contents;

  // 1) signingConfigs.release (solo si aún no está).
  if (!out.includes(MARCA_INICIO)) {
    const m = /signingConfigs\s*\{[\s\S]*?\n(\s*)debug\s*\{[\s\S]*?\n\1\}/.exec(out);
    if (!m) {
      throw new Error('with-android-signing: no se encontró signingConfigs.debug en build.gradle');
    }
    const fin = m.index + m[0].length;
    out = out.slice(0, fin) + BLOQUE_FIRMA + out.slice(fin);
  }

  // 2) buildTypes.release usa la firma release cuando hay keystore (si no, sigue con debug).
  if (!out.includes(MARCA_BUILDTYPE)) {
    const m =
      /(buildTypes\s*\{[\s\S]*?\n\s*release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/.exec(
        out,
      );
    if (!m) {
      throw new Error('with-android-signing: no se encontró signingConfig en buildTypes.release');
    }
    out = out.slice(0, m.index) + m[1] + LINEA_BUILDTYPE + out.slice(m.index + m[0].length);
  }

  return out;
}

module.exports = (config) =>
  withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = aplicarFirma(cfg.modResults.contents);
    return cfg;
  });
module.exports.aplicarFirma = aplicarFirma;
