"use client"

import {
  LogOutIcon,
  UserCircleIcon,
  BellIcon,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { stackClientApp } from "@/lib/stack-client"
import { signOut as nextAuthSignOut } from "next-auth/react"

let User: {
  id?: string
  name?: string
  email?: string
  image?: string
  role?: string
} | undefined

export function NavUser({
  user,
  compact = false,
}: {
  user?: typeof User | null
  compact?: boolean
}) {
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      await Promise.all([
        stackClientApp.signOut().catch(() => {}),
        nextAuthSignOut({ redirect: false }).catch(() => {}),
      ])
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Sign out error:', error)
      router.push('/login')
      router.refresh()
    }
  }

  const initials = (user?.name ?? 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {compact ? (
          <button type="button" className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-muted transition-colors mx-auto">
            <Avatar className="h-7 w-7 rounded-lg grayscale">
              <AvatarImage src={user?.image} alt={user?.name} />
              <AvatarFallback className="rounded-lg text-[10px]">{initials}</AvatarFallback>
            </Avatar>
          </button>
        ) : (
          <button type="button" className="flex items-center gap-2 w-full rounded-lg px-2 py-2 hover:bg-muted transition-colors text-left">
            <Avatar className="h-8 w-8 rounded-lg grayscale">
              <AvatarImage src={user?.image} alt={user?.name} />
              <AvatarFallback className="rounded-lg text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
              <span className="truncate font-medium text-xs">{user?.name}</span>
              <span className="truncate text-[10px] text-muted-foreground">{user?.email}</span>
            </div>
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="min-w-56 rounded-lg"
        side="right"
        align="end"
        sideOffset={8}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage src={user?.image} alt={user?.name} />
              <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user?.name}</span>
              <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push('/settings')}>
            <UserCircleIcon className="mr-2 h-4 w-4" />
            Account
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/settings?tab=notifications')}>
            <BellIcon className="mr-2 h-4 w-4" />
            Notifications
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOutIcon className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
