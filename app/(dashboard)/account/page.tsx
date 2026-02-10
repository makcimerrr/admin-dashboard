'use client';

import { AccountSettings } from '@stackframe/stack';

export default function AccountPage() {
  return (
    <div className="flex flex-col gap-4 md:gap-6 p-4 md:p-6">
      <AccountSettings fullPage={false} />
    </div>
  );
}
