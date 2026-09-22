/** Mises en forme francaises utilisees dans toute l'interface. */

const DATE_LONGUE = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const HEURE = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const DATE_COURTE = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export function dateLongue(instant: Date = new Date()): string {
  return DATE_LONGUE.format(instant);
}

export function heure(instant: Date = new Date()): string {
  return HEURE.format(instant);
}

export function dateCourte(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return Number.isNaN(d.getTime()) ? '—' : DATE_COURTE.format(d);
}

export function dateHeure(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return Number.isNaN(d.getTime()) ? '—' : `${DATE_COURTE.format(d)} à ${HEURE.format(d)}`;
}

/** Valeur du jour au format attendu par `<input type="date">`. */
export function aujourdhuiInput(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function heureInput(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function octets(taille: number): string {
  if (taille < 1024) return `${taille} o`;
  if (taille < 1024 * 1024) return `${(taille / 1024).toFixed(0)} Ko`;
  return `${(taille / (1024 * 1024)).toFixed(1)} Mo`;
}
