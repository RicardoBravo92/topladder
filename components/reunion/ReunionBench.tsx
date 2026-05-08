'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Users, UserMinus, UserPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useConfirm } from '@/hooks/use-confirm';
import { kickPlayer } from '@/app/actions/reunion';
import { createGroup } from '@/app/actions/game';
import type { Player, ReunionData } from './types';

interface ReunionBenchProps {
  reunion: ReunionData['reunion'];
  bench: ReunionData['bench'];
  currentUser: Player;
  isAdmin: boolean;
  refresh: () => void;
  isPendingQueueActivity: boolean;
}

export function ReunionBench({
  reunion,
  bench,
  currentUser,
  isAdmin,
  refresh,
  isPendingQueueActivity,
}: ReunionBenchProps) {
  const [isPending, startTransition] = useTransition();
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const confirm = useConfirm();

  const isGroupMode = reunion.gameMode === 'group';

  const handleKick = async (targetUserId: string, targetName: string) => {
    const ok = await confirm({
      title: 'Kick Player',
      description: `Are you sure you want to kick ${targetName}?`,
      confirmText: 'Kick',
      destructive: true,
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await kickPlayer(reunion._id, targetUserId);
        toast.success(`${targetName} has been kicked`);
        refresh();
      } catch (error: unknown) {
        const err = error as Error;
        toast.error(err.message);
      }
    });
  };

  const handleCreateGroup = () => {
    if (!p1 || !p2 || p1 === p2) return;
    startTransition(async () => {
      try {
        await createGroup(reunion._id, [p1, p2]);
        setCreateGroupOpen(false);
        setP1('');
        setP2('');
        refresh();
      } catch (error: unknown) {
        const err = error as Error;
        toast.error(err.message);
      }
    });
  };

  const handleGoToQueue = () => {
    const queueSection = document.getElementById('queue-section');
    if (queueSection) {
      queueSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    startTransition(async () => {
      try {
        await createGroup(reunion._id, [currentUser._id]);
        toast.success('You are now in the queue!');
        refresh();
      } catch (error: unknown) {
        const err = error as Error;
        toast.error(err.message);
      }
    });
  };

  return (
    <section className='md:col-span-3 flex flex-col gap-4'>
      <Card className='flex-1 bg-card/40 backdrop-blur border-primary/10 overflow-hidden flex flex-col'>
        <CardHeader className='flex flex-row items-center justify-between pb-2'>
          <CardTitle className='flex items-center gap-2 text-lg'>
            <Users className='h-5 w-5 text-primary' /> Bench
          </CardTitle>
          <Badge>{bench.players.length}</Badge>
        </CardHeader>
        <CardContent className='flex-1 p-0'>
          <ScrollArea className='h-[300px] md:h-full px-4'>
            <div className='space-y-3 py-2'>
              {bench.players.map((p: Player) => (
                <div
                  key={p._id}
                  className='flex items-center justify-between p-2 rounded-lg hover:bg-secondary/20 transition-colors group'
                >
                  <div className='flex items-center gap-3'>
                    <Avatar className='h-8 w-8'>
                      <AvatarImage src={p.photo} />
                      <AvatarFallback>{p.username[0]}</AvatarFallback>
                    </Avatar>
                    <span className='text-sm font-medium'>{p.username}</span>
                  </div>
                  {isAdmin && p._id !== currentUser._id && (
                    <Button
                      size='icon'
                      variant='ghost'
                      className='h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer'
                      onClick={() => handleKick(p._id, p.username)}
                      disabled={isPending}
                    >
                      <UserMinus className='h-4 w-4' />
                    </Button>
                  )}
                </div>
              ))}
              {bench.players.length === 0 && (
                <p className='text-center text-muted-foreground text-sm py-4'>
                  Bench is empty
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {isGroupMode ? (
        <Dialog open={createGroupOpen} onOpenChange={setCreateGroupOpen}>
          <DialogTrigger asChild>
            <Button
              className='w-full bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 shadow-lg shadow-primary/20 cursor-pointer'
              disabled={isPending || isPendingQueueActivity}
            >
              <UserPlus className='mr-2 h-4 w-4' /> Form Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Group</DialogTitle>
            </DialogHeader>
            <div className='space-y-4 pt-4'>
              <div className='space-y-2'>
                <label className='text-sm font-medium'>Player 1</label>
                <Select onValueChange={setP1} value={p1}>
                  <SelectTrigger>
                    <SelectValue placeholder='Select player' />
                  </SelectTrigger>
                  <SelectContent>
                    {bench.players.map((p: Player) => (
                      <SelectItem
                        key={p._id}
                        value={p._id}
                        disabled={p._id === p2}
                      >
                        {p.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <label className='text-sm font-medium'>Player 2</label>
                <Select onValueChange={setP2} value={p2}>
                  <SelectTrigger>
                    <SelectValue placeholder='Select player' />
                  </SelectTrigger>
                  <SelectContent>
                    {bench.players.map((p: Player) => (
                      <SelectItem
                        key={p._id}
                        value={p._id}
                        disabled={p._id === p1}
                      >
                        {p.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleCreateGroup}
                disabled={!p1 || !p2 || isPending}
                className='w-full cursor-pointer'
              >
                Create & Queue
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : bench.players.some((p: Player) => p._id === currentUser._id) ? (
        <Button
          onClick={handleGoToQueue}
          disabled={isPending || isPendingQueueActivity}
          className='w-full bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 shadow-lg shadow-primary/20 cursor-pointer'
        >
          Go to Queue
        </Button>
      ) : null}
    </section>
  );
}
