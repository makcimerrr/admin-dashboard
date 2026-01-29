import { Button } from '@/components/ui/button';
import { stackServerApp } from '@/lib/stack-server';
import { unifiedSignOut } from '@/lib/unified-signout';
import Image from 'next/image';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';

export async function User() {
  const stackUser = await stackServerApp.getUser();
  const user = stackUser ? {
    id: stackUser.id,
    email: stackUser.primaryEmail,
    name: stackUser.displayName,
    image: stackUser.profileImageUrl,
    // Essayer Server Metadata en premier, puis Client Read-Only, puis Client
    role: stackUser.serverMetadata?.role ||
          stackUser.clientReadOnlyMetadata?.role ||
          stackUser.clientMetadata?.role ||
          'user',
    planningPermission: stackUser.serverMetadata?.planningPermission ||
                       stackUser.clientReadOnlyMetadata?.planningPermission ||
                       stackUser.clientMetadata?.planningPermission ||
                       'reader',
  } : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="overflow-hidden rounded-full"
        >
          <Image
            src={user?.image ?? '/placeholder-user.jpg'}
            width={36}
            height={36}
            alt="Avatar"
            className="overflow-hidden rounded-full"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Settings</DropdownMenuItem>
        <DropdownMenuItem>Support</DropdownMenuItem>
        <DropdownMenuSeparator />
        {user ? (
          <>
            <DropdownMenuItem>
              <Link href="/profile">{user?.name}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              {user?.role ?? 'No role assigned'}
            </DropdownMenuItem>
            <DropdownMenuItem>
              {user?.planningPermission ?? 'No role assigned'}
            </DropdownMenuItem>
            <DropdownMenuItem>
              <form
                action={async () => {
                  'use server';
                  await unifiedSignOut();
                }}
              >
                <button type="submit">Sign Out</button>
              </form>
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem>
            <Link href="/login">Sign In</Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
