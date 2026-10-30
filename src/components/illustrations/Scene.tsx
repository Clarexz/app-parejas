import { StyleSheet } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type SceneKind = 'hill' | 'sea' | 'city' | 'tacos';

// EXCEPCIÓN a "colores solo del tema": estas escenas representan el contenido de una foto, no UI.
// Una foto se ve igual de día y de noche, así que los colores son literales y no cambian con el
// tema. Paletas tomadas de la escena "Bitácora" de docs/design/conceptos.html.
const PALETTES: Record<SceneKind, Record<string, string>> = {
  hill: { sky: '#f6d6a8', sun: '#e8932a', far: '#7d9a6a', near: '#4f7a4a' },
  sea: { sky: '#bfe0e6', sun: '#f2b25a', far: '#3f8aa8', near: '#e8f4f6' },
  city: { sky: '#26355e', sun: '#ffd27a', far: '#1a2547', near: '#101833' },
  tacos: { sky: '#c23b6b', sun: '#f8efe0', far: '#f2c26b', near: '#4f7a4a', accent: '#c23b6b' },
};

/**
 * Escena ilustrada que hace de "foto" (cielo, sol, cerros…). Llena a su contenedor (que debe
 * ser `position: relative`, como el área de foto de `Polaroid`) recortando con `slice`.
 */
export function Scene({ kind }: { kind: SceneKind }) {
  const c = PALETTES[kind];
  return (
    <Svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      style={StyleSheet.absoluteFill}
      width="100%"
      height="100%"
      accessibilityElementsHidden
    >
      <Rect width={100} height={100} fill={c.sky} />
      {kind === 'hill' ? (
        <>
          <Circle cx={70} cy={34} r={12} fill={c.sun} />
          <Path d="M0 100V62l16-14 9 8 14-26 18 24 10-8 33 22v32z" fill={c.far} />
          <Path d="M0 100V80l30-8 34 6 36-6v28z" fill={c.near} />
        </>
      ) : null}
      {kind === 'sea' ? (
        <>
          <Circle cx={50} cy={58} r={17} fill={c.sun} />
          <Rect y={58} width={100} height={42} fill={c.far} />
          <Path
            d="M8 70h22M44 70h14M70 70h20M18 80h30M62 80h26M4 90h16M36 90h40"
            stroke={c.near}
            strokeWidth={2.4}
            strokeLinecap="round"
          />
        </>
      ) : null}
      {kind === 'city' ? (
        <>
          <Circle cx={24} cy={26} r={7} fill={c.sun} />
          <Path d="M0 100V60h14V44h12v22h10V36h16v30h8V50h14v16h10V56h16v44z" fill={c.far} />
          <Path d="M0 100V84h100v16z" fill={c.near} />
          <Path
            d="M44 42h4M44 50h4M44 58h4M18 50h4M18 58h4M80 62h4"
            stroke={c.sun}
            strokeWidth={2.4}
          />
        </>
      ) : null}
      {kind === 'tacos' ? (
        <>
          <Circle cx={50} cy={54} r={34} fill={c.sun} />
          <Path d="M22 62a15 13 0 0 1 30 0z" fill={c.far} />
          <Path d="M48 62a15 13 0 0 1 30 0z" fill={c.far} />
          <Path d="M35 50a15 13 0 0 1 30 0z" fill={c.far} />
          <Circle cx={32} cy={55} r={2.6} fill={c.near} />
          <Circle cx={60} cy={55} r={2.6} fill={c.near} />
          <Circle cx={48} cy={43} r={2.6} fill={c.near} />
          <Circle cx={40} cy={57} r={2} fill={c.accent} />
          <Circle cx={67} cy={57} r={2} fill={c.accent} />
          <Circle cx={54} cy={45} r={2} fill={c.accent} />
        </>
      ) : null}
    </Svg>
  );
}
