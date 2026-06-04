import { NextResponse } from 'next/server';

const DENO_API = 'https://api-zone01-rouen.deno.dev/api/v1';

/**
 * Proxy server-side vers l'API Zone01 (gitea-info + user-info).
 *
 * SÉCURITÉ : l'ACCESS_TOKEN est un token admin Gitea. Il doit rester côté
 * serveur et ne JAMAIS être exposé au navigateur. Auparavant la page étudiant
 * appelait directement l'API Deno depuis le client avec
 * `NEXT_PUBLIC_ACCESS_TOKEN`, ce qui inlinait le token dans le bundle client.
 * Ce proxy déplace l'appel (et le token) côté serveur.
 */
export async function GET(_request: Request, context: any) {
  const params = await context.params;
  const login = encodeURIComponent(String(params.login));

  const token = process.env.ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: 'ACCESS_TOKEN non configuré côté serveur' },
      { status: 500 },
    );
  }

  const headers = { Authorization: `Bearer ${token}` };
  try {
    const [giteaRes, userRes] = await Promise.all([
      fetch(`${DENO_API}/gitea-info/${login}`, { headers }),
      fetch(`${DENO_API}/user-info/${login}`, { headers }),
    ]);

    if (!giteaRes.ok || !userRes.ok) {
      return NextResponse.json(
        { error: 'Données externes indisponibles' },
        { status: 502 },
      );
    }

    const [gitea, user] = await Promise.all([giteaRes.json(), userRes.json()]);
    return NextResponse.json({ gitea, user });
  } catch {
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des données externes' },
      { status: 502 },
    );
  }
}
