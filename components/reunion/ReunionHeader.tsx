'use client';

import { useState, useTransition, useEffect } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Users, UserPlus, DoorOpen, UserCheck, QrCode } from 'lucide-react';
import QRCode from 'react-qr-code';
import { useConfirm } from '@/hooks/use-confirm';
import { leaveReunion } from '@/lib/actions/reunion.actions';
import {
  getFriends,
  sendFriendRequestById,
  getFriendshipStatuses,
  sendReunionInvite,
  getPendingRequests,
  respondToFriendRequest,
} from '@/lib/actions/friend.actions';
import type { Player, FriendRequest, ReunionData } from './types';

interface ReunionHeaderProps {
  reunion: ReunionData['reunion'];
  currentUser: Player;
  bench: ReunionData['bench'];
  groups: ReunionData['groups'];
  playerIdsKey: string;
}

export function ReunionHeader({
  reunion,
  currentUser,
  bench,
  groups,
  playerIdsKey,
}: ReunionHeaderProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const confirm = useConfirm();

  const [friends, setFriends] = useState<Player[]>([]);
  const [pendingFriendRequests, setPendingFriendRequests] = useState<FriendRequest[]>([]);
  const [friendshipStatuses, setFriendshipStatuses] = useState<Record<string, string>>({});

  const [inviteOpen, setInviteOpen] = useState(false);
  const [socialOpen, setSocialOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  useEffect(() => {
    const loadSocial = async () => {
      const [f, p] = await Promise.all([
        getFriends(),
        getPendingRequests(),
      ]);
      setFriends(f as Player[]);
      setPendingFriendRequests(p as FriendRequest[]);

      const allPlayerIds = playerIdsKey ? playerIdsKey.split(',') : [];
      if (allPlayerIds.length > 0) {
        const statuses = await getFriendshipStatuses(
          allPlayerIds,
        );
        setFriendshipStatuses(statuses);
      }
    };
    loadSocial();
  }, [currentUser._id, playerIdsKey]);

  const handleInvite = (friend: Player) => {
    startTransition(async () => {
      try {
        await sendReunionInvite(reunion._id, friend._id);
        toast.success(`Invite sent to ${friend.username}!`);
      } catch (error: unknown) {
        const err = error as Error;
        toast.error(err.message);
      }
    });
  };

  const handleAddFriend = (targetId: string, targetName: string) => {
    startTransition(async () => {
      try {
        await sendFriendRequestById(targetId);
        toast.success(`Friend request sent to ${targetName}!`);
        setFriendshipStatuses((prev) => ({ ...prev, [targetId]: 'pending' }));
      } catch (error: unknown) {
        const err = error as Error;
        toast.error(err.message);
      }
    });
  };

  const handleRespondToFriend = (
    id: string,
    status: 'accepted' | 'rejected',
  ) => {
    startTransition(async () => {
      try {
        await respondToFriendRequest(id, status);
        toast.success(
          status === 'accepted'
            ? 'Friend request accepted!'
            : 'Friend request rejected',
        );
        const [f, p] = await Promise.all([
          getFriends(),
          getPendingRequests(),
        ]);
        setFriends(f as Player[]);
        setPendingFriendRequests(p as FriendRequest[]);
      } catch (error: unknown) {
        const err = error as Error;
        toast.error(err.message);
      }
    });
  };

  const handleLeave = async () => {
    const ok = await confirm({
      title: 'Leave Reunion',
      description:
        'Are you sure you want to leave this reunion? You will be removed from the bench and any groups.',
      confirmText: 'Leave',
      destructive: true,
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await leaveReunion(reunion._id);
        toast.success('You have left the reunion');
        router.push('/');
      } catch (error: unknown) {
        const err = error as Error;
        toast.error(err.message);
      }
    });
  };

  return (
    <header className='flex flex-col md:flex-row justify-between items-center md:items-start gap-4 border-b border-border/50 pb-6'>
      <div className="flex flex-col items-center md:items-start w-full md:w-auto">
        <h1 className='text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent text-center md:text-left'>
          {reunion.name}
        </h1>
        <div className='flex flex-wrap items-center justify-center md:justify-start gap-2 mt-2'>
          <Badge variant='outline' className='text-muted-foreground'>
            Code: {reunion.code}
          </Badge>
          <Dialog open={qrOpen} onOpenChange={setQrOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-6 text-xs gap-1 border-primary/20 hover:bg-primary/10 cursor-pointer">
                <QrCode className="h-3 w-3" /> QR
              </Button>
            </DialogTrigger>
            <DialogContent className='max-w-xs flex flex-col items-center justify-center p-6'>
              <DialogHeader>
                <DialogTitle className="text-center mb-4">Scan to Join</DialogTitle>
              </DialogHeader>
              <div className="bg-white p-4 rounded-xl shadow-inner border border-border">
                <QRCode
                  value={typeof window !== 'undefined' ? `${window.location.origin}/?code=${reunion.code}` : ''}
                  size={200}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                />
              </div>
              <p className="text-center text-sm text-muted-foreground mt-4">
                Code: <strong className="text-primary">{reunion.code}</strong>
              </p>
            </DialogContent>
          </Dialog>
          <Badge variant='secondary'>
            {reunion.isActive ? 'Active' : 'Finished'}
          </Badge>

          <Dialog open={socialOpen} onOpenChange={setSocialOpen}>
            <DialogTrigger asChild>
              <Button
                size='sm'
                variant='outline'
                className='h-6 text-xs gap-1 border-primary/20 hover:bg-primary/10 cursor-pointer relative'
              >
                <Users className='h-3 w-3' /> Social
                {pendingFriendRequests.length > 0 && (
                  <span className='absolute -top-1 -right-1 flex h-3 w-3'>
                    <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75'></span>
                    <span className='relative inline-flex rounded-full h-3 w-3 bg-destructive'></span>
                  </span>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className='max-w-md'>
              <DialogHeader>
                <DialogTitle>Social Management</DialogTitle>
              </DialogHeader>
              <div className='space-y-6 pt-4'>
                {pendingFriendRequests.length > 0 && (
                  <div className='space-y-3'>
                    <h4 className='text-xs font-bold text-destructive uppercase tracking-wider'>
                      Friend Requests
                    </h4>
                    <div className='grid gap-2'>
                      {pendingFriendRequests.map((r: FriendRequest) => (
                        <div
                          key={r._id}
                          className='flex items-center justify-between p-3 rounded-xl bg-destructive/5 border border-destructive/10'
                        >
                          <div className='flex items-center gap-3'>
                            <Avatar className='h-8 w-8'>
                              <AvatarImage src={r.requester.photo} />
                              <AvatarFallback>
                                {r.requester.username[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className='text-sm font-medium'>
                              {r.requester.username}
                            </span>
                          </div>
                          <div className='flex gap-1'>
                            <Button
                              size='icon'
                              variant='ghost'
                              className='h-8 w-8 text-green-500 hover:bg-green-500/10'
                              onClick={() => handleRespondToFriend(r._id, 'accepted')}
                            >
                              <UserCheck className='h-4 w-4' />
                            </Button>
                            <Button
                              size='icon'
                              variant='ghost'
                              className='h-8 w-8 text-destructive hover:bg-destructive/10'
                              onClick={() => handleRespondToFriend(r._id, 'rejected')}
                            >
                              <UserPlus className='h-4 w-4 rotate-45' />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className='space-y-3'>
                  <h4 className='text-xs font-bold text-muted-foreground uppercase tracking-wider'>
                    Players in Reunion
                  </h4>
                  <ScrollArea className='h-[200px] rounded-lg border border-border/50 p-2'>
                    <div className='grid gap-2'>
                      {[
                        ...bench.players,
                        ...groups.flatMap((g) => g.members),
                      ]
                        .filter(
                          (p: Player, i: number, self: Player[]) =>
                            p._id !== currentUser._id &&
                            self.findIndex((s) => s._id === p._id) === i,
                        )
                        .map((p: Player) => {
                          const status = friendshipStatuses[p._id];
                          return (
                            <div
                              key={p._id}
                              className='flex items-center justify-between p-2 rounded-lg hover:bg-secondary/10 transition-colors'
                            >
                              <div className='flex items-center gap-2'>
                                <Avatar className='h-8 w-8'>
                                  <AvatarImage src={p.photo} />
                                  <AvatarFallback>
                                    {p.username[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <span className='text-sm font-medium'>
                                  {p.username}
                               </span>
                              </div>
                              {status === 'accepted' ? (
                                <Badge
                                  variant='secondary'
                                  className='gap-1 bg-green-500/10 text-green-500 border-green-500/20'
                                >
                                  <UserCheck className='h-3 w-3' /> Friends
                                </Badge>
                              ) : status === 'pending' ? (
                                <Badge
                                  variant='outline'
                                  className='animate-pulse'
                                >
                                  Pending
                                </Badge>
                              ) : (
                                <Button
                                  size='sm'
                                  variant='ghost'
                                  className='h-8 text-primary hover:bg-primary/10'
                                  onClick={() => handleAddFriend(p._id, p.username)}
                                >
                                  Add Friend
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      {[
                        ...bench.players,
                        ...groups.flatMap((g) => g.members),
                      ].length <= 1 && (
                        <p className='text-center text-xs text-muted-foreground py-8'>
                          No other players here yet.
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button
                size='sm'
                variant='outline'
                className='h-6 text-xs gap-1 border-primary/20 hover:bg-primary/10 cursor-pointer'
              >
                <UserPlus className='h-3 w-3' /> Invite Friends
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Your Friends</DialogTitle>
              </DialogHeader>
              <div className='space-y-4 pt-4'>
                <div className='grid gap-3'>
                  {friends.map((f: Player) => (
                    <div
                      key={f._id}
                      className='flex items-center justify-between p-2 rounded-lg bg-secondary/20'
                    >
                      <div className='flex items-center gap-2'>
                        <Avatar className='h-8 w-8'>
                          <AvatarImage src={f.photo} />
                          <AvatarFallback>{f.username[0]}</AvatarFallback>
                        </Avatar>
                        <span className='text-sm font-medium'>
                          {f.username}
                        </span>
                      </div>
                      <Button size='sm' onClick={() => handleInvite(f)}>
                        Invite to Reunion
                      </Button>
                    </div>
                  ))}
                  {friends.length === 0 && (
                    <p className='text-center text-sm text-muted-foreground py-8'>
                      You don&apos;t have friends yet. Add them from the
                      reunion or the home page!
                    </p>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className='flex items-center justify-center md:justify-end gap-2 w-full md:w-auto'>
        <Button
          variant='ghost'
          size='sm'
          className='text-destructive hover:bg-destructive/10 cursor-pointer gap-2'
          title='Leave Reunion'
          onClick={handleLeave}
        >
          <DoorOpen className='h-4 w-4' />
          <span className="text-xs font-medium">Leave</span>
        </Button>
      </div>
    </header>
  );
}
