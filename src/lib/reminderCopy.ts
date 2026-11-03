// Textos del recordatorio diario local (español de México, voz de docs/DISENO.md §6).

export type ReminderCopy = { title: string; body: string };

export function reminderCopy(i: { partner: string | null; seed: number }): ReminderCopy {
  const name = i.partner?.replace(/\s+/g, ' ').trim() || null;
  const variants: ReminderCopy[] = [
    {
      title: 'La pregunta de hoy',
      body: name
        ? `Aún no contestas. ${name} se está quedando con la duda.`
        : 'Aún no contestas. Sale rápido.',
    },
    {
      title: 'Falta tu respuesta',
      body: name
        ? `Cuando puedas, contéstale a ${name}. No tiene que ser larga.`
        : 'Cuando puedas. No tiene que ser larga.',
    },
    {
      title: 'Un ratito para ustedes',
      body: name
        ? `La pregunta de hoy sigue sin tu respuesta. ${name} ya contestó.`
        : 'La pregunta de hoy sigue sin tu respuesta.',
    },
    {
      title: 'Hoy toca contestar',
      body: name
        ? `Una respuesta tuya y ${name} puede leerte.`
        : 'Una respuesta tuya y se abre la conversación.',
    },
  ];
  const n = Number.isFinite(i.seed) ? Math.floor(Math.abs(i.seed)) : 0;
  return variants[n % variants.length];
}
