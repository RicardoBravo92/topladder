import { currentUser } from '@clerk/nextjs/server';
import { CreateReunionForm } from '@/components/create-reunion-form';
import { JoinReunionForm } from '@/components/join-reunion-form';
import { FriendsManager } from '@/components/friends-manager';
import { syncUser } from '@/lib/actions/user.actions';
import { SignInButton, SignUpButton, SignedOut, SignedIn } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';

export default async function Home() {
  const user = await currentUser();
  let dbUser = null;
  if (user) {
    dbUser = await syncUser({
      id: user.id,
      email_addresses: user.emailAddresses.map((e) => ({
        email_address: e.emailAddress,
      })),
      username: user.username,
      first_name: user.firstName,
      last_name: user.lastName,
      image_url: user.imageUrl,
    });
  }

  return (
    <div className='min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 relative overflow-hidden'>
      {/* Background Gradients */}
      <div className='absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[100px]' />
      <div className='absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/20 rounded-full blur-[100px]' />

      <div className='z-10 flex flex-col items-center w-full max-w-4xl space-y-12'>
        <div className='text-center space-y-4'>
          <h1 className='text-5xl md:text-7xl font-bold bg-gradient-to-br from-primary to-foreground bg-clip-text text-transparent animate-in zoom-in duration-700'>
            TopLadder
          </h1>
          <p className='text-muted-foreground text-xl md:text-2xl max-w-2xl mx-auto'>
            The premium queue management system for your 2v2 matches.
          </p>
        </div>

        <SignedOut>
          <div className='flex gap-4'>
            <SignInButton>
              <Button size='lg' className='text-lg px-8 cursor-pointer'>
                Sign In
              </Button>
            </SignInButton>
            <SignUpButton>
              <Button
                variant='secondary'
                size='lg'
                className='text-lg px-8 cursor-pointer'
              >
                Start Now
              </Button>
            </SignUpButton>
          </div>
        </SignedOut>

        <SignedIn>
          <div className='grid gap-8 lg:grid-cols-3 w-full animate-in slide-in-from-bottom-10 fade-in duration-700'>
            <div className='lg:col-span-2 grid gap-8 md:grid-cols-2'>
              <CreateReunionForm />
              <JoinReunionForm />
            </div>
            <FriendsManager currentUser={dbUser!} />
          </div>
          <p className='text-sm text-muted-foreground'>
            Logged in as {user?.firstName || user?.username}
          </p>
        </SignedIn>
      </div>
    </div>
  );
}
