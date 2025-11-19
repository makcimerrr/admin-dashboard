'use client';

import { AccountSettings } from '@stackframe/stack';

export default function AccountPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <AccountSettings fullPage={false} />
    </div>
  );
}
