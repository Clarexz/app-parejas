// Textos del recordatorio diario local (español de México, voz de docs/DISENO.md §6).

export type ReminderCopy = { title: string; body: string };

export function reminderCopy(i: { partner: string | null; seed: number }): ReminderCopy {
  const name = i.partner?.replace(/\s+/g, ' ').trim() || null;
  const variants: ReminderCopy[] = [
    {
      title: 'La pregunta de hoy los espera',
      body: name
        ? `Aún no contestas. ${name} se va a quedar con la duda.`
        : 'Aún no contestas. Tómate un ratito, sale rápido.',
    },
    {
      title: 'Te falta pegar tu respuesta',
      body: name
        ? `Cuando puedas, contéstale a ${name}. No tiene que ser largo.`
        : 'Cuando puedas. No tiene que ser largo.',
    },
    {
      title: 'Un ratito para ustedes',
      body: name
        ? `La pregunta de hoy sigue sin tu respuesta. ${name} ya la vio.`
        : 'La pregunta de hoy sigue sin tu respuesta.',
    },
    {
      title: 'Hoy toca contestar',
      body: name
        ? `Una respuesta tuya y ${name} puede leerte. Ándale.`
        : 'Una respuesta tuya y se abre la conversación.',
    },
  ];
  const n = Number.isFinite(i.seed) ? Math.floor(Math.abs(i.seed)) : 0;
  return variants[n % variants.length];
}
