import { redirect } from 'next/navigation';
import { ShieldX } from 'lucide-react';
import { unifiedSignOut } from '@/lib/unified-signout';

export const dynamic = 'force-dynamic';

async function signOutAndLogin() {
  'use server';
  await unifiedSignOut();
  redirect('/login');
}

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full rounded-xl border bg-card p-6 text-center space-y-4 shadow-sm">
        <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldX className="h-6 w-6 text-destructive" />
        </div>
        <h1 className="text-xl font-bold">Accès non autorisé</h1>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            Les connexions <strong className="text-foreground">Google</strong>,{' '}
            <strong className="text-foreground">GitHub</strong> et{' '}
            <strong className="text-foreground">e-mail / mot de passe</strong> sont réservées aux
            administrateurs.
          </p>
          <p>
            Les étudiants doivent se connecter via{' '}
            <strong className="text-foreground">Authentik</strong>.
          </p>
        </div>
        <form action={signOutAndLogin}>
          <button
            type="submit"
            className="inline-flex items-center justify-center w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Se déconnecter et se reconnecter
          </button>
        </form>
      </div>
    </div>
  );
}
