import { NextAuthOptions } from "next-auth";
import AuthentikProvider from "next-auth/providers/authentik";
import { saveOauthUser } from "@/lib/db/services/users";

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
    async signIn({ user, account, profile }) {
      try {
        // Only process Authentik SSO logins
        if (account?.provider !== "authentik") {
          return true;
        }

        const email = user.email;
        const name = user.name || email || "Unknown User";

        if (!email) {
          console.error("❌ Authentik SSO - No email provided");
          return false;
        }

        console.log("🔐 Authentik SSO - User signing in:", email);

        // Determine role from Authentik groups
        const p = profile as any;
        const groups = Array.isArray(p?.groups) ? p.groups : [];
        const isAdmin = groups.includes("authentik Admins");
        const role = isAdmin ? "Admin" : "user";

        console.log("👥 Authentik groups:", groups, "→ Role:", role);

        // 1. Check if user exists in Stack Auth
        try {
          const checkStackUser = await fetch(
            `https://api.stack-auth.com/api/v1/users?primary_email=${encodeURIComponent(email)}`,
            {
              headers: {
                "x-stack-project-id": process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
                "x-stack-secret-server-key": process.env.STACK_SECRET_SERVER_KEY!,
              },
            }
          );

          if (checkStackUser.ok) {
            const users = await checkStackUser.json();
            if (!users.items || users.items.length === 0) {
              // User doesn't exist in Stack Auth - create them
              console.log("📝 Creating user in Stack Auth:", email);

              const createStackUser = await fetch(
                "https://api.stack-auth.com/api/v1/users",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "x-stack-project-id": process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
                    "x-stack-secret-server-key": process.env.STACK_SECRET_SERVER_KEY!,
                  },
                  body: JSON.stringify({
                    primary_email: email,
                    primary_email_verified: true,
                    primary_email_auth_enabled: false, // Disable password auth for SSO users
                    display_name: name,
                    server_metadata: {
                      role,
                      authProvider: "authentik",
                    },
                    client_read_only_metadata: {
                      role,
                      planningPermission: "reader",
                    },
                  }),
                }
              );

              if (createStackUser.ok) {
                console.log("✅ User created in Stack Auth:", email);
              } else {
                const error = await createStackUser.text();
                console.error("❌ Failed to create user in Stack Auth:", error);
              }
            } else {
              console.log("✅ User already exists in Stack Auth:", email);
            }
          }
        } catch (stackError) {
          console.error("❌ Stack Auth error:", stackError);
          // Continue even if Stack Auth fails
        }

        // 2. Save user to local database
        try {
          const dbResult = await saveOauthUser(email, name);
          console.log("💾 Local DB result:", dbResult);
        } catch (dbError) {
          console.error("❌ Database error:", dbError);
          // Continue even if DB save fails
        }

        return true;
      } catch (err) {
        console.error("❌ NextAuth signIn callback error:", err);
        return true; // Allow sign-in even if our custom logic fails
      }
    },

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
