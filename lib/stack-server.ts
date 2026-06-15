import "server-only";

// Le SDK Stack Auth ne peut pas être utilisé dans le middleware (edge runtime)
// Nous utilisons directement l'API Stack Auth pour le middleware
// Ce fichier est utilisé uniquement dans les Server Components (Node runtime)

let stackServerAppInstance: any = null;

/**
 * Retourne l'instance complète de `StackServerApp` (SDK @stackframe/stack).
 *
 * À utiliser dans les Server Components / Route Handlers (runtime Node uniquement,
 * jamais en edge runtime). Donne accès à toutes les méthodes serveur :
 * `listUsers`, `createUser`, `getUser`, `sendSignInInvitationEmail`, etc.
 */
export async function getStackServerApp() {
  if (typeof (globalThis as any).EdgeRuntime !== 'undefined') {
    throw new Error('getStackServerApp() ne peut pas être utilisé en edge runtime');
  }

  if (!stackServerAppInstance) {
    const { StackServerApp } = await import("@stackframe/stack");
    stackServerAppInstance = new StackServerApp({
      tokenStore: "nextjs-cookie",
      projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
      publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
      secretServerKey: process.env.STACK_SECRET_SERVER_KEY!,
      urls: {
        home: "/",
        signIn: "/login",
        signUp: "/register",
        afterSignIn: "/",
        afterSignUp: "/",
        afterSignOut: "/login",
      },
    });
  }

  return stackServerAppInstance;
}

const STACK_API_BASE = 'https://api.stack-auth.com/api/v1';

/**
 * Envoie un email de connexion (magic-link / OTP) côté serveur via l'API REST
 * Stack.
 *
 * ⚠️ `sendSignInInvitationEmail` N'EXISTE PAS sur `StackServerApp` (c'est une
 * méthode du StackAdminApp). L'endpoint OTP `auth/otp/send-sign-in-code`
 * fonctionne avec la simple clé serveur et déclenche le mail de connexion /
 * inscription. Prérequis : l'email du compte doit être VÉRIFIÉ et l'auth OTP
 * activée (sinon 409 `USER_EMAIL_ALREADY_EXISTS … not verified`).
 *
 * @returns ok + status + message d'erreur éventuel (non bloquant côté appelant).
 */
export async function sendSignInCode(
  email: string,
  callbackUrl: string,
): Promise<{ ok: boolean; status: number; error?: string }> {
  try {
    const res = await fetch(`${STACK_API_BASE}/auth/otp/send-sign-in-code`, {
      method: 'POST',
      headers: {
        'X-Stack-Access-Type': 'server',
        'X-Stack-Project-Id': process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
        'X-Stack-Secret-Server-Key': process.env.STACK_SECRET_SERVER_KEY!,
        'X-Stack-Publishable-Client-Key': process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, callback_url: callbackUrl }),
    });
    if (res.ok) return { ok: true, status: res.status };
    let error = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      error = j?.error ?? j?.code ?? error;
    } catch {
      /* corps non-JSON */
    }
    return { ok: false, status: res.status, error };
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : 'fetch error' };
  }
}

export const stackServerApp = {
  async getUser(options?: { userId?: string }) {
    // Pour le middleware, on ne peut pas utiliser le SDK
    // On retourne null et on gère l'auth différemment
    if (typeof (globalThis as any).EdgeRuntime !== 'undefined') {
      return null;
    }

    // Pour les Server Components, on utilise le SDK normalement
    const app = await getStackServerApp();

    return options?.userId
      ? await app.getUser({ userId: options.userId })
      : await app.getUser();
  },

  async signOut() {
    const app = await getStackServerApp();
    return await app.signOut();
  }
};
