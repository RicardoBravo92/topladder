'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import {
  getFriends,
  getPendingRequests,
  respondToFriendRequest,
  sendFriendRequest,
  getMyReunionInvites,
  respondToReunionInvite,
} from '@/app/actions/friend';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserPlus, UserCheck, UserX, Users } from 'lucide-react';

interface Player {
  _id: string;
  username: string;
  photo: string;
}

interface FriendRequest {
  _id: string;
  requester: Player;
}

interface ReunionInvite {
  _id: string;
  inviter: Player;
  reunion: {
    _id: string;
    name: string;
  };
}

export function FriendsManager({ currentUser }: { currentUser: Player }) {
  const [friends, setFriends] = useState<Player[]>([]);
  const [pending, setPending] = useState<FriendRequest[]>([]);
  const [reunionInvites, setReunionInvites] = useState<ReunionInvite[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const loadData = useCallback(async () => {
    const [f, p, ri] = await Promise.all([
      getFriends(currentUser._id),
      getPendingRequests(currentUser._id),
      getMyReunionInvites(currentUser._id),
    ]);
    setFriends(f);
    setPending(p);
    setReunionInvites(ri);
  }, [currentUser._id]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleAddFriend = () => {
    if (!email) return;
    setLoading(true);
    startTransition(async () => {
      try {
        await sendFriendRequest(email);
        alert('Request sent!');
        setEmail('');
      } catch (e: unknown) {
        const error = e as Error;
        alert(error.message);
      } finally {
        setLoading(false);
      }
    });
  };

  const handleRespond = async (id: string, status: 'accepted' | 'rejected') => {
    await respondToFriendRequest(id, status);
    loadData();
  };

  const handleReunionInvite = async (
    id: string,
    status: 'accepted' | 'rejected',
  ) => {
    const reunionId = await respondToReunionInvite(id, status);
    if (status === 'accepted' && reunionId) {
      router.push(`/reunion/${reunionId}`);
    } else {
      loadData();
    }
  };

  return (
    <Card className='bg-card/40 backdrop-blur border-primary/10'>
      <CardHeader className='pb-2'>
        <CardTitle className='flex items-center gap-2 text-lg'>
          <Users className='h-5 w-5 text-primary' /> Friends System
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-6'>
        {/* Add Friend */}
        <div className='flex gap-2'>
          <Input
            placeholder="Friend's email..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className='bg-background/50'
          />
          <Button
            onClick={handleAddFriend}
            disabled={loading || !email}
            size='icon'
          >
            <UserPlus className='h-4 w-4' />
          </Button>
        </div>

        {/* Pending Requests */}
        {pending.length > 0 && (
          <div className='space-y-3'>
            <h4 className='text-sm font-semibold text-muted-foreground flex items-center gap-2'>
              Pending Requests{' '}
              <Badge
                variant='destructive'
                className='h-5 w-5 flex items-center justify-center p-0'
              >
                {pending.length}
              </Badge>
            </h4>
            {pending.map((r: FriendRequest) => (
              <div
                key={r._id}
                className='flex items-center justify-between p-2 rounded-lg bg-primary/5 border border-primary/10'
              >
                <div className='flex items-center gap-2'>
                  <Avatar className='h-8 w-8'>
                    <AvatarImage src={r.requester.photo} />
                    <AvatarFallback>{r.requester.username[0]}</AvatarFallback>
                  </Avatar>
                  <span className='text-sm font-medium'>
                    {r.requester.username}
                  </span>
                </div>
                <div className='flex gap-1'>
                  <Button
                    size='icon'
                    variant='ghost'
                    className='h-8 w-8 text-green-500'
                    onClick={() => handleRespond(r._id, 'accepted')}
                  >
                    <UserCheck className='h-4 w-4' />
                  </Button>
                  <Button
                    size='icon'
                    variant='ghost'
                    className='h-8 w-8 text-destructive'
                    onClick={() => handleRespond(r._id, 'rejected')}
                  >
                    <UserX className='h-4 w-4' />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reunion Invites */}
        {reunionInvites.length > 0 && (
          <div className='space-y-3'>
            <h4 className='text-sm font-semibold text-purple-400 flex items-center gap-2'>
              Reunion Invites{' '}
              <Badge className='bg-purple-500 h-5 w-5 flex items-center justify-center p-0'>
                {reunionInvites.length}
              </Badge>
            </h4>
            {reunionInvites.map((ri: ReunionInvite) => (
              <div
                key={ri._id}
                className='p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 space-y-2'
              >
                <p className='text-xs text-muted-foreground'>
                  <span className='font-bold text-foreground'>
                    {ri.inviter.username}
                  </span>{' '}
                  invited you to{' '}
                  <span className='text-purple-400'>
                    &quot;{ri.reunion.name}&quot;
                  </span>
                </p>
                <div className='flex gap-2'>
                  <Button
                    size='sm'
                    className='flex-1 bg-purple-600 hover:bg-purple-700 h-8'
                    onClick={() => handleReunionInvite(ri._id, 'accepted')}
                  >
                    Join
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    className='h-8'
                    onClick={() => handleReunionInvite(ri._id, 'rejected')}
                  >
                    Ignore
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Friends List */}
        <div className='space-y-3'>
          <h4 className='text-sm font-semibold text-muted-foreground'>
            My Friends
          </h4>
          <div className='grid grid-cols-1 gap-2'>
            {friends.map((f: Player) => (
              <div
                key={f._id}
                className='flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/20 transition-colors'
              >
                <Avatar className='h-8 w-8'>
                  <AvatarImage src={f.photo} />
                  <AvatarFallback>{f.username[0]}</AvatarFallback>
                </Avatar>
                <span className='text-sm font-medium'>{f.username}</span>
              </div>
            ))}
            {friends.length === 0 && (
              <p className='text-center text-xs text-muted-foreground py-4'>
                No friends yet. Add some!
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
