"use server";

import { stackServerApp } from "@/lib/stack-server";
import { cookies } from "next/headers";

/**
 * Unified sign out function that handles both Stack Auth and NextAuth/Authentik sessions
 * Use this server action to ensure complete logout from all authentication systems
 */
export async function unifiedSignOut() {
  try {
    // 1. Sign out from Stack Auth
    try {
      await stackServerApp.signOut();
      console.log("✅ Stack Auth sign out successful");
    } catch (stackError) {
      console.error("Stack Auth sign out error:", stackError);
      // Continue even if Stack Auth sign out fails
    }

    // 2. Clear all authentication cookies
    const cookieStore = await cookies();

    // Stack Auth cookies
    cookieStore.delete("stack-access-token");
    cookieStore.delete("stack-refresh-token");
    cookieStore.delete("stack-role");

    // Stack Auth project-specific cookies
    const stackProjectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID;
    if (stackProjectId) {
      cookieStore.delete(`stack-access-${stackProjectId}--default`);
      cookieStore.delete(`stack-refresh-${stackProjectId}--default`);
    }

    // NextAuth cookies (for Authentik SSO)
    cookieStore.delete("next-auth.session-token");
    cookieStore.delete("__Secure-next-auth.session-token");
    cookieStore.delete("next-auth.callback-url");
    cookieStore.delete("__Secure-next-auth.callback-url");
    cookieStore.delete("next-auth.csrf-token");
    cookieStore.delete("__Secure-next-auth.csrf-token");

    // Role cookie
    cookieStore.delete("role");

    console.log("✅ All auth cookies cleared via unified sign out");

    return { success: true };
  } catch (error) {
    console.error("Unified sign out error:", error);
    throw error;
  }
}
