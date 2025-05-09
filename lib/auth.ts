import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { AdapterUser as NextAuthAdapterUser } from 'next-auth/adapters';

interface User extends NextAuthAdapterUser {
  role: string;
}

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

        try {
          const response = await fetch(
            `${process.env.NEXTAUTH_URL}/api/authenticate`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                email: credentials.email,
                password: credentials.password
              })
            }
          );

          const data = await response.json();

          if (response.ok) {
            return data; // Renvoie la réponse de l'API
          } else if (response.status === 429) {
            throw new Error('Too many requests, please try again later');
          } else {
            throw new Error('Invalid email or password');
          }
        } catch (error: any) {
          throw new Error(`Authentication failed: ${error.message}`);
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }: any) {
      if (
        account &&
        (account.provider === 'github' || account.provider === 'google')
      ) {
        /*console.log('account', account);
                        console.log('profile', profile);
                        console.log('user', user);*/

        const response = await fetch(
          `${process.env.NEXTAUTH_URL}/api/save-oauth-user`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email: user.email,
              name: user.name
            })
          }
        );

        const data = await response.json();

        if (response.ok) {
          (user as User).role = data.role;
          return true; // Return true to indicate successful sign-in
        }
        return false; // Return false to indicate failure
      } else if (account && account.provider === 'credentials') {
        return true; // Return true if the credentials are valid
      }
      return false; // Return false if account is not github or google
    },
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = (user as User).role;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = token.role as string;
      }
      return session;
    }
  },
  session: {
    strategy: 'jwt'
  }
});
