'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useTransition } from 'react';
import { createReunion } from '@/app/actions/reunion';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';

export function CreateReunionForm() {
  const { user } = useUser();
  const router = useRouter();
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);
  const [gameMode, setGameMode] = useState<'individual' | 'group'>(
    'individual',
  );
  const [groupSize, setGroupSize] = useState(2);
  const [playersAtOnce, setPlayersAtOnce] = useState(1);
  const [playersContinue, setPlayersContinue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  const handleCreate = () => {
    if (!user || !name) return;
    setOpen(true);
  };

  const handleConfirmCreate = () => {
    if (!user || !name) return;
    setLoading(true);
    startTransition(async () => {
      try {
        const res = await createReunion(name, {
          gameMode,
          groupSize: gameMode === 'group' ? groupSize : undefined,
          playersAtOnce: gameMode === 'individual' ? playersAtOnce : undefined,
          playersContinue:
            gameMode === 'individual' ? playersContinue : undefined,
        });
        router.push(`/reunion/${res._id}`);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
        setOpen(false);
      }
    });
  };

  return (
    <Card className='hover:border-primary/50 transition-all duration-300 shadow-lg bg-card/50 backdrop-blur'>
      <CardHeader>
        <CardTitle>Create a Reunion</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='space-y-2'>
          <Label>Reunion Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='Friday Night Hoops'
            className='bg-background/50'
          />
        </div>
        <Button
          onClick={handleCreate}
          disabled={loading || !name}
          className='w-full cursor-pointer'
        >
          {loading ? 'Creating...' : 'Create Reunion'}
        </Button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className='max-w-xl'>
            <DialogHeader>
              <DialogTitle>Configure Match</DialogTitle>
              <DialogDescription>
                Select whether the reunion will be individual or group and set the
                appropriate game settings.
              </DialogDescription>
            </DialogHeader>
            <div className='space-y-4 mt-4'>
              <div className='space-y-2'>
                <Label>Match type</Label>
                <div className='flex gap-2'>
                  <Button
                    variant={
                      gameMode === 'individual' ? 'secondary' : 'outline'
                    }
                    onClick={() => setGameMode('individual')}
                  >
                    Individual
                  </Button>
                  <Button
                    variant={gameMode === 'group' ? 'secondary' : 'outline'}
                    onClick={() => setGameMode('group')}
                  >
                    Group
                  </Button>
                </div>
              </div>

              {gameMode === 'group' ? (
                <div className='space-y-4'>
                  <div className='space-y-2'>
                    <Label>Players per group</Label>
                    <Input
                      type='number'
                      min={2}
                      value={groupSize}
                      onChange={(e) => setGroupSize(Number(e.target.value))}
                      className='bg-background/50'
                    />
                  </div>
                </div>
              ) : (
                <div className='space-y-4'>
                  <div className='space-y-2'>
                    <Label>Players at once</Label>
                    <Input
                      type='number'
                      min={1}
                      value={playersAtOnce}
                      onChange={(e) => setPlayersAtOnce(Number(e.target.value))}
                      className='bg-background/50'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label>Players continuing after</Label>
                    <Input
                      type='number'
                      min={0}
                      value={playersContinue}
                      onChange={(e) =>
                        setPlayersContinue(Number(e.target.value))
                      }
                      className='bg-background/50'
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className='mt-4'>
              <DialogClose asChild>
                <Button variant='outline'>Cancel</Button>
              </DialogClose>
              <Button onClick={handleConfirmCreate} disabled={loading}>
                {loading ? 'Creating...' : 'Confirm'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
