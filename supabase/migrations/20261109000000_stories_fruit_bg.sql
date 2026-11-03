-- Fondos de stories con frutas (DISENO v2 §2.2, D69/D100).
-- Las stories nuevas guardan la llave de fruta (o 'bone' = Hueso). Se conservan las claves viejas
-- por compatibilidad con las stories que aún no caducan (24 h); no se reescribe ninguna fila.
-- create_story() no valida `bg` por su cuenta: se apoya en este check (23514 -> invalid_story).

alter table public.stories drop constraint stories_bg;
alter table public.stories add constraint stories_bg check (
  bg is null or bg in (
    'paper', 'postit', 'jamaica', 'cempasuchil', 'nopal', 'ink',
    'sandia', 'mango', 'mandarina', 'limon', 'uva', 'arandano', 'pitaya', 'bone'
  )
);
