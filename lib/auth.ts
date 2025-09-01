import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { AdapterUser as NextAuthAdapterUser } from 'next-auth/adapters';

interface User extends NextAuthAdapterUser {
  role: string;
  planningPermission: 'editor' | 'reader';
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub,
    Google,
    Credentials({
      name: 'Credentials',
      credentials: {
        pseudo: {
          label: 'Pseudo',
          type: 'text',
          placeholder: 'john-doe'
        },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials) {
          throw new Error('No credentials provided');
        }

        try {
          const response = await fetch(
            `${process.env.AUTHENDPOINT}/api/auth/login`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              // Server-side login; the external service will set cookies for its own domain.
              body: JSON.stringify({
                pseudo: credentials.pseudo,
                password: credentials.password
              })
            }
          );

          if (!response.ok) {
            if (response.status === 429) {
              throw new Error('Too many requests, please try again later');
            }
            throw new Error('Invalid pseudo or password');
          }

          const data = await response.json();
          console.log('Login response', data);

          if (!data.ok) {
            throw new Error('Login failed');
          }

          // Fetch user profile after successful login
          const profileResponse = await fetch(`${process.env.AUTHENDPOINT}/api/auth/profile`, {

            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Cookie: response.headers.get('set-cookie') || ''
            }
          });

          if (!profileResponse.ok) {
            throw new Error('Failed to fetch user profile');
          }

          const profile = await profileResponse.json();
          console.log('Profile', profile);

          const emargementRole = profile.apps.find((app: any) => app.name === 'emargement')?.role ?? 'user';
          const hubRole = profile.apps.find((app: any) => app.name === 'hub')?.role ?? 'user';
          const planningRole = profile.apps.find((app: any) => app.name === 'planning')?.role ?? 'reader';

          return {
            id: String(profile.id ?? profile.user?.id ?? profile.pseudo),
            name: profile.pseudo ?? profile.name ?? 'User',
            email: profile.email ?? undefined,
            image: profile.image ?? undefined,
            role: profile.role ?? 'user',
            planningPermission: planningRole,
            emargementPermission: emargementRole,
            hubPermission: hubRole
          } as any;
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
          (user as User).planningPermission = data.planningPermission;
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
        token.planningPermission = (user as User).planningPermission;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = token.role as string;
        session.user.planningPermission = token.planningPermission as string;
      }
      return session;
    }
  },
  session: {
    strategy: 'jwt'
  }
});
