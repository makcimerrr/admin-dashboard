import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub,
    Google,
    Credentials({
      name: 'Credentials',
      credentials: {
        email: {
          label: 'Email',
          type: 'email',
          placeholder: 'jsmith@example.com'
        },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials, req) {
        if (!credentials) {
          throw new Error('No credentials provided');
        }

        // Récupérer l'origine de la requête
        const host = req.headers.get('host'); // Récupère l'hôte depuis les headers
        const protocol = process.env.NEXTAUTH_URL?.startsWith('https')
          ? 'https'
          : 'http';
        const baseUrl = host
          ? `${protocol}://${host}`
          : process.env.NEXTAUTH_URL;

        const response = await fetch(`${baseUrl}/api/authenticate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password
          })
        });

        if (response.ok) {
          return await response.json();
        } else {
          throw new Error('Invalid email or password');
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account && (account.provider === 'github' || account.provider === 'google')) {
        const email = user.email;
        const name = user.name;

        const host = process.env.VERCEL_URL;
        const protocol = process.env.NEXTAUTH_URL?.startsWith('https') ? 'https' : 'http';
        const baseUrl = host ? `${protocol}://${host}` : process.env.NEXTAUTH_URL;


        const response = await fetch(`${baseUrl}/api/save-oauth-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: user.email,
            name: user.name
          })
        });

        if (response.ok) {
          return true; // Return true to indicate successful sign-in
        }
        return false; // Return false to indicate failure
      }
      return false; // Return false if account is not github or google
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    }
  },
  session: {
    strategy: 'jwt'
  }
});
