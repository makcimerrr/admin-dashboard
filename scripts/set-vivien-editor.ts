/**
 * Script one-shot pour donner le rôle "editor" planning à Vivien Frebourg.
 *
 * Usage: npx tsx scripts/set-vivien-editor.ts
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_STACK_PROJECT_ID
 *   STACK_SECRET_SERVER_KEY
 */
import 'dotenv/config';

const PROJECT_ID = process.env.NEXT_PUBLIC_STACK_PROJECT_ID!;
const SECRET_KEY = process.env.STACK_SECRET_SERVER_KEY!;
const TARGET_NAME = 'Vivien';

const headers = {
  'Content-Type': 'application/json',
  'x-stack-project-id': PROJECT_ID,
  'x-stack-secret-server-key': SECRET_KEY,
};

async function main() {
  if (!PROJECT_ID || !SECRET_KEY) {
    console.error('Missing NEXT_PUBLIC_STACK_PROJECT_ID or STACK_SECRET_SERVER_KEY');
    process.exit(1);
  }

  // List users
  const res = await fetch('https://api.stack-auth.com/api/v1/users?limit=100', { headers });
  if (!res.ok) {
    console.error('Failed to list users:', await res.text());
    process.exit(1);
  }

  const { items: users } = await res.json();
  const vivien = users.find((u: any) =>
    u.display_name?.toLowerCase().includes(TARGET_NAME.toLowerCase()) ||
    u.primary_email?.toLowerCase().includes(TARGET_NAME.toLowerCase())
  );

  if (!vivien) {
    console.error(`User matching "${TARGET_NAME}" not found. Available users:`);
    users.forEach((u: any) => console.log(`  - ${u.display_name} (${u.primary_email}) [${u.id}]`));
    process.exit(1);
  }

  console.log(`Found user: ${vivien.display_name} (${vivien.primary_email}) [${vivien.id}]`);
  console.log('Current metadata:', JSON.stringify(vivien.client_read_only_metadata, null, 2));

  // Update metadata
  const updateRes = await fetch(`https://api.stack-auth.com/api/v1/users/${vivien.id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      client_read_only_metadata: {
        ...vivien.client_read_only_metadata,
        planningPermission: 'editor',
      },
    }),
  });

  if (!updateRes.ok) {
    console.error('Failed to update user:', await updateRes.text());
    process.exit(1);
  }

  const updated = await updateRes.json();
  console.log('Updated metadata:', JSON.stringify(updated.client_read_only_metadata, null, 2));
  console.log('Done! Vivien now has planning editor permission.');
}

main().catch(console.error);
