import { currentUser } from '@clerk/nextjs/server';
import { CreateReunionForm } from '@/components/create-reunion-form';
import { JoinReunionForm } from '@/components/join-reunion-form';
import { FriendsManager } from '@/components/friends-manager';
import { syncUser } from '@/lib/actions/user.actions';
import { SignInButton, SignUpButton, SignedOut, SignedIn, UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { buildClerkPayload } from '@/lib/auth';
import Image from 'next/image';

export default async function Home() {
  const user = await currentUser();
  let dbUser = null;
  if (user) {
    dbUser = await syncUser(buildClerkPayload(user));
  }

  return (
    <div className='min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 relative overflow-hidden'>
      {/* Background Gradients */}
      <div className='absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[100px]' />
      <div className='absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/20 rounded-full blur-[100px]' />

      <div className='z-10 flex flex-col items-center w-full max-w-4xl space-y-12'>
        {/* Global header for all pages except reunion dashboard */}
        <header className='absolute top-4 right-4 flex items-center gap-2 sm:gap-4 h-16'>
          <SignedOut>
            <SignInButton />
            <SignUpButton>
              <button className='bg-[#6c47ff] text-white rounded-full font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer'>
                Sign Up
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </header>

        <div className='text-center space-y-4'>
          <Image
            src='/TopLadderLogo.png'
            alt='TopLadder Logo'
            width={96}
            height={96}
            className='h-16 md:h-24 mx-auto animate-scale-in-slow'
            priority
          />
          <p className='text-muted-foreground text-xl md:text-2xl max-w-2xl mx-auto'>
            The premium queue management system for your matches.
          </p>
        </div>

        <SignedOut>
          <div className='flex flex-col sm:flex-row gap-4'>
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
          <div className='grid gap-8 lg:grid-cols-3 w-full animate-rise-in'>
            <div className='lg:col-span-2 grid gap-8 md:grid-cols-2'>
              <CreateReunionForm />
              <JoinReunionForm />
            </div>
            {dbUser && <FriendsManager currentUser={dbUser} />}
          </div>
          <p className='text-sm text-muted-foreground'>
            Logged in as {user?.firstName || user?.username}
          </p>
        </SignedIn>
      </div>
    </div>
  );
}