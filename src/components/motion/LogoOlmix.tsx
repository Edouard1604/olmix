/**
 * Logo Olmix. Utilise le fichier officiel déposé dans `src/assets/` (tout
 * fichier .svg ou .png dont le nom contient « logo », le SVG étant préféré) ;
 * il n'est jamais redessiné ici. Sans fichier, un emplacement propre avec le
 * mot « OLMIX ».
 */

// Le glob renvoie un objet vide si aucun logo n'a été déposé : le build ne
// casse pas, et le logo apparaît dès qu'il est fourni (après recompilation).
const fichiers = import.meta.glob('../../assets/*[Ll][Oo][Gg][Oo]*.{svg,png}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;
const chemins = Object.keys(fichiers).sort((a, b) => Number(b.endsWith('.svg')) - Number(a.endsWith('.svg')));
const urlLogo = chemins.length > 0 ? fichiers[chemins[0]!]! : null;

export default function LogoOlmix({ hauteur = 34, className }: { hauteur?: number; className?: string }) {
  const classes = `logo-olmix${className ? ` ${className}` : ''}`;
  if (urlLogo) {
    return <img className={classes} src={urlLogo} alt="Olmix" style={{ height: hauteur }} draggable={false} />;
  }
  return (
    <span className={`${classes} logo-olmix--texte`} style={{ fontSize: Math.round(hauteur * 0.6) }}>
      OLMIX
    </span>
  );
}
