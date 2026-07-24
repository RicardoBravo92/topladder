import { currentUser } from '@clerk/nextjs/server';
import { syncUser } from '@/lib/actions/user.actions';
import type { ClerkUserPayload } from '@/lib/types';

export async function getCurrentBackendUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error('Authentication required');
  return syncUser(buildClerkPayload(clerkUser));
}

function buildClerkPayload(
  user: NonNullable<Awaited<ReturnType<typeof currentUser>>>,
): ClerkUserPayload {
  return {
    id: user.id,
    email_addresses: user.emailAddresses.map((e) => ({
      email_address: e.emailAddress,
    })),
    username: user.username,
    first_name: user.firstName,
    last_name: user.lastName,
    image_url: user.imageUrl,
  };
}
