import { Skeleton } from '@/components/ui/skeleton';

export function ReunionDashboardSkeleton() {
  return (
    <div className='min-h-screen bg-background p-4 md:p-8 space-y-6 md:space-y-8'>
      <header className='flex flex-col md:flex-row justify-between items-center md:items-start gap-4 border-b border-border/50 pb-6'>
        <div className='flex flex-col items-center md:items-start w-full md:w-auto gap-2'>
          <Skeleton className='h-9 w-64' />
          <div className='flex gap-2'>
            <Skeleton className='h-6 w-24' />
            <Skeleton className='h-6 w-16' />
          </div>
        </div>
      </header>

      <main className='grid grid-cols-1 md:grid-cols-12 gap-6 h-auto md:h-[calc(100vh-200px)]'>
        <section className='md:col-span-3 flex flex-col gap-4'>
          <Skeleton className='flex-1 rounded-xl min-h-[300px]' />
        </section>

        <div className='md:col-span-6 flex flex-col gap-6'>
          <Skeleton className='flex-1 rounded-xl min-h-[300px]' />
          <Skeleton className='flex-1 rounded-xl min-h-[200px]' />
        </div>

        <section className='md:col-span-3 flex flex-col gap-4'>
          <Skeleton className='flex-1 rounded-xl min-h-[300px]' />
        </section>
      </main>
    </div>
  );
}

export function FriendsListSkeleton() {
  return (
    <div className='space-y-3'>
      <Skeleton className='h-4 w-24' />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className='flex items-center gap-3 p-2'>
          <Skeleton className='h-8 w-8 rounded-full' />
          <Skeleton className='h-4 w-28' />
        </div>
      ))}
    </div>
  );
}
