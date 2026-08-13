'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, LogOut } from 'lucide-react';
import { useConfirm } from '@/hooks/use-confirm';
import { leaveQueue } from '@/lib/actions/game.actions';
import type { Player, ReunionData, UserGroup } from './types';

interface ReunionQueueProps {
  reunion: ReunionData['reunion'];
  queue: ReunionData['queue'];
  currentUser: Player;
  isAdmin: boolean;
  refresh: () => void;
}

export function ReunionQueue({
  reunion,
  queue,
  currentUser,
  isAdmin,
  refresh,
}: ReunionQueueProps) {
  const [isPending, startTransition] = useTransition();
  const confirm = useConfirm();

  const handleLeaveQueue = async (groupId: string) => {
    const ok = await confirm({
      title: 'Leave Queue',
      description:
        'Are you sure you want to leave the queue? You will be returned to the bench.',
      confirmText: 'Leave',
      destructive: true,
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await leaveQueue(reunion._id, groupId);
        toast.success('Left the queue');
        refresh();
      } catch (error: unknown) {
        const err = error as Error;
        toast.error(err.message);
      }
    });
  };

  return (
    <Card className='flex-1 bg-card/40 backdrop-blur flex flex-col'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Clock className='h-5 w-5 text-primary' /> Queue (
          {queue.groups.length})
        </CardTitle>
      </CardHeader>
      <CardContent className='flex-1 p-0'>
        <ScrollArea className='h-[200px] md:h-full px-4'>
          <div className='space-y-2 py-2'>
            {queue.groups.map((g: UserGroup, i: number) => {
              const isMyGroup = g.members.some(
                (m) => m._id === currentUser._id,
              );
              return (
                <div
                  key={g._id}
                  className='flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50 group/queue'
                >
                  <div className='flex items-center gap-3'>
                    <Badge
                      variant='outline'
                      className='h-6 w-6 flex items-center justify-center rounded-full bg-primary/10 border-none text-primary'
                    >
                      {i + 1}
                    </Badge>
                    <span className='font-semibold'>{g.name}</span>
                  </div>
                  <div className='flex items-center gap-4'>
                    <div className='flex -space-x-2'>
                      {g.members.map((m: Player) => (
                        <Avatar
                          key={m._id}
                          className='h-6 w-6 border border-background'
                        >
                          <AvatarImage src={m.photo} />
                          <AvatarFallback>{m.username[0]}</AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    {(isAdmin || isMyGroup) && (
                      <Button
                        size='icon'
                        variant='ghost'
                        className='h-6 w-6 text-destructive opacity-0 group-hover/queue:opacity-100 transition-opacity'
                        onClick={() => handleLeaveQueue(g._id)}
                        title='Leave Queue'
                        disabled={isPending}
                      >
                        <LogOut className='h-3 w-3' />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {queue.groups.length === 0 && (
              <p className='text-center text-muted-foreground py-4'>
                Queue is empty
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
