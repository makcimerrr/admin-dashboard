import "server-only";

// Le SDK Stack Auth ne peut pas être utilisé dans le middleware (edge runtime)
// Nous utilisons directement l'API Stack Auth pour le middleware
// Ce fichier est utilisé uniquement dans les Server Components (Node runtime)

let stackServerAppInstance: any = null;

export const stackServerApp = {
  async getUser(options?: { userId?: string }) {
    // Pour le middleware, on ne peut pas utiliser le SDK
    // On retourne null et on gère l'auth différemment
    if (typeof (globalThis as any).EdgeRuntime !== 'undefined') {
      return null;
    }

    // Pour les Server Components, on utilise le SDK normalement
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

    return options?.userId
      ? await stackServerAppInstance.getUser({ userId: options.userId })
      : await stackServerAppInstance.getUser();
  },

  async signOut() {
    if (!stackServerAppInstance) {
      const { StackServerApp } = await import("@stackframe/stack");
      stackServerAppInstance = new StackServerApp({
        tokenStore: "nextjs-cookie",
        projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
        publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
        secretServerKey: process.env.STACK_SECRET_SERVER_KEY!,
      });
    }

    return await stackServerAppInstance.signOut();
  }
};
