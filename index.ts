// Punto de entrada: expo-router + (solo Android) el manejador de widgets y la tarea de push de
// datos, que deben registrarse en el scope del módulo para correr con la app cerrada.
import 'expo-router/entry';

import { Platform } from 'react-native';

if (Platform.OS === 'android') {
  const { registerWidgetTaskHandler } =
    require('react-native-android-widget') as typeof import('react-native-android-widget');
  const { widgetTaskHandler } =
    require('./src/widgets/taskHandler') as typeof import('./src/widgets/taskHandler');
  registerWidgetTaskHandler(widgetTaskHandler);
  require('./src/widgets/backgroundTask');
}
