import { cookies } from 'next/headers';

// Stack Auth configuration
const STACK_API_URL = 'https://api.stack-auth.com/api/v1';
const STACK_PROJECT_ID = process.env.NEXT_PUBLIC_STACK_PROJECT_ID!;
const STACK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!;
const STACK_SECRET_KEY = process.env.STACK_SECRET_SERVER_KEY!;

export interface StackUser {
  id: string;
  primary_email: string | null;
  display_name: string | null;
  profile_image_url: string | null;
  signed_up_at_millis: number;
  client_metadata: Record<string, any>;
  client_read_only_metadata: Record<string, any>;
  server_metadata: Record<string, any>;
}

export interface StackSession {
  user: StackUser;
  access_token: string;
  refresh_token: string;
}

/**
 * Get the current user session from Stack Auth
 */
export async function getStackSession(): Promise<StackSession | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('stack-access-token')?.value;

  if (!accessToken) {
    return null;
  }

  try {
    const response = await fetch(`${STACK_API_URL}/users/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-stack-project-id': STACK_PROJECT_ID,
        'x-stack-publishable-client-key': STACK_PUBLISHABLE_KEY,
      },
    });

    if (!response.ok) {
      return null;
    }

    const user: StackUser = await response.json();

    return {
      user,
      access_token: accessToken,
      refresh_token: cookieStore.get('stack-refresh-token')?.value || '',
    };
  } catch (error) {
    console.error('Error fetching Stack session:', error);
    return null;
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithPassword(email: string, password: string): Promise<StackSession> {
  const response = await fetch(`${STACK_API_URL}/auth/signin/password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-stack-project-id': STACK_PROJECT_ID,
      'x-stack-publishable-client-key': STACK_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Sign in failed');
  }

  return await response.json();
}

/**
 * Sign up with email and password
 */
export async function signUpWithPassword(email: string, password: string, displayName?: string): Promise<StackSession> {
  const response = await fetch(`${STACK_API_URL}/auth/signup/password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-stack-project-id': STACK_PROJECT_ID,
      'x-stack-publishable-client-key': STACK_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({
      email,
      password,
      display_name: displayName,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Sign up failed');
  }

  return await response.json();
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('stack-access-token')?.value;

  if (accessToken) {
    try {
      await fetch(`${STACK_API_URL}/auth/signout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-stack-project-id': STACK_PROJECT_ID,
          'x-stack-publishable-client-key': STACK_PUBLISHABLE_KEY,
        },
      });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  // Clear cookies
  cookieStore.delete('stack-access-token');
  cookieStore.delete('stack-refresh-token');
}

/**
 * Get user by ID (server-side only, requires secret key)
 */
export async function getUserById(userId: string): Promise<StackUser | null> {
  try {
    const response = await fetch(`${STACK_API_URL}/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${STACK_SECRET_KEY}`,
        'x-stack-project-id': STACK_PROJECT_ID,
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

/**
 * Update user metadata (server-side only)
 */
export async function updateUserMetadata(
  userId: string,
  metadata: {
    server_metadata?: Record<string, any>;
    client_metadata?: Record<string, any>;
  }
): Promise<StackUser | null> {
  try {
    const response = await fetch(`${STACK_API_URL}/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${STACK_SECRET_KEY}`,
        'x-stack-project-id': STACK_PROJECT_ID,
      },
      body: JSON.stringify(metadata),
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating user metadata:', error);
    return null;
  }
}
