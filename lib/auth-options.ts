import { NextAuthOptions } from "next-auth";
import AuthentikProvider from "next-auth/providers/authentik";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      groups?: string[];
      isActive?: boolean;
      isSuperuser?: boolean;
      username?: string;
    };
  }

  interface JWT {
    id?: string;
    isActive?: boolean;
    isSuperuser?: boolean;
    username?: string;
    groups?: string[];
  }
}

const AUTHENTIK_CLIENT_ID = process.env.AUTHENTIK_CLIENT_ID;
const AUTHENTIK_CLIENT_SECRET = process.env.AUTHENTIK_CLIENT_SECRET;
const AUTHENTIK_ISSUER = process.env.AUTHENTIK_ISSUER;
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;

if (!AUTHENTIK_CLIENT_ID || !AUTHENTIK_CLIENT_SECRET) {
  console.warn(
    "Missing AUTHENTIK_CLIENT_ID or AUTHENTIK_CLIENT_SECRET environment variables. Authentik SSO will not work."
  );
}

if (!NEXTAUTH_SECRET && process.env.NODE_ENV === "production") {
  console.error("NEXTAUTH_SECRET is required in production.");
}

export const authOptions: NextAuthOptions = {
  providers: [
    ...(AUTHENTIK_CLIENT_ID && AUTHENTIK_CLIENT_SECRET
      ? [
          AuthentikProvider({
            clientId: AUTHENTIK_CLIENT_ID,
            clientSecret: AUTHENTIK_CLIENT_SECRET,
            issuer: AUTHENTIK_ISSUER,
            authorization: {
              params: { scope: "openid profile email" },
            },
          }),
        ]
      : []),
  ],

  session: {
    strategy: "jwt",
  },

  secret: NEXTAUTH_SECRET,

  callbacks: {
    async jwt({ token, profile, account }) {
      try {
        if (profile && account) {
          const p = profile as any;
          token.id = p?.sub || account.providerAccountId;
          token.isActive = Boolean(p?.is_active);
          token.isSuperuser = Boolean(p?.is_superuser);
          token.username = typeof p?.preferred_username === "string" ? p.preferred_username : undefined;
          token.groups = Array.isArray(p?.groups) ? p.groups : [];
        }
      } catch (err) {
        console.error("NextAuth jwt callback error:", err);
      }
      return token;
    },

    async session({ session, token }) {
      try {
        session.user = session.user ?? ({} as any);
        session.user.id = token.id as string | undefined;
        session.user.isActive = token.isActive as boolean | undefined;
        session.user.isSuperuser = token.isSuperuser as boolean | undefined;
        session.user.username = token.username as string | undefined;
        session.user.groups = Array.isArray(token.groups) ? (token.groups as string[]) : [];
      } catch (err) {
        console.error("NextAuth session callback error:", err);
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },

  debug: process.env.NODE_ENV === "development",
};
