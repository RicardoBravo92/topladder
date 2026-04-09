'use client';

import { useTransition, useEffect, useCallback, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Swords, Play } from 'lucide-react';
import { startMatch, finishMatch } from '@/app/actions/game';
import type { Player, ReunionData, MatchData } from './types';

interface ReunionArenaProps {
  reunion: ReunionData['reunion'];
  activeMatch: MatchData | null;
  queue: ReunionData['queue'];
  currentUser: Player;
  refresh: () => void;
}

export function ReunionArena({
  reunion,
  activeMatch,
  queue,
  currentUser,
  refresh,
}: ReunionArenaProps) {
  const [isPending, startTransition] = useTransition();
  const isGroupMode = reunion.gameMode === 'group';
  const minRequired = isGroupMode ? 2 : (reunion.playersAtOnce || 2);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const playNotificationSound = useCallback(() => {
    try {
      const win = window as unknown as Window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
      const AudioContextClass = win.AudioContext || win.webkitAudioContext;
      if (!AudioContextClass) throw new Error("AudioContext not supported");
      const ctx = new AudioContextClass();
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.type = 'sine';
      osc2.type = 'triangle';
      
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc1.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.1); // C6
      
      osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc2.frequency.exponentialRampToValueAtTime(1318.51, ctx.currentTime + 0.1); // E6
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.5);
      osc2.stop(ctx.currentTime + 0.5);
    } catch(e) {
      console.error("Audio API not supported or blocked", e);
    }
  }, []);

  const prevMatchIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeMatch) {
      prevMatchIdRef.current = null;
      return;
    }

    const currentMatchId = activeMatch._id;
    const isNewMatch = currentMatchId !== prevMatchIdRef.current;
    
    if (isNewMatch && prevMatchIdRef.current !== null) {
      // Check if user is in this match
      const amIPlaying = activeMatch.groupA.members.some((m: Player) => m._id === currentUser._id) || 
                         activeMatch.groupB.members.some((m: Player) => m._id === currentUser._id);
      
      if (amIPlaying) {
        playNotificationSound();
        
        if ("Notification" in window && Notification.permission === "granted") {
          const opponentGroup = activeMatch.groupA.members.some((m: Player) => m._id === currentUser._id) 
            ? activeMatch.groupB.name 
            : activeMatch.groupA.name;
            
          new Notification("Your Match is Ready!", {
            body: `You are up against ${opponentGroup}. Let's go!`,
            icon: '/TopLadderLogo.png'
          });
        }
      }
    }
    
    prevMatchIdRef.current = currentMatchId;
  }, [activeMatch, currentUser._id, playNotificationSound]);

  const handleStartMatch = () => {
    startTransition(async () => {
      try {
        await startMatch(reunion._id);
        refresh();
      } catch (error: unknown) {
        const err = error as Error;
        alert('Cannot start match: ' + err.message);
      }
    });
  };

  const handleFinishMatch = (winnerGroupId: string) => {
    if (!activeMatch) return;
    startTransition(async () => {
      try {
        await finishMatch(activeMatch._id, winnerGroupId);
        refresh();
      } catch (error: unknown) {
        const err = error as Error;
        alert(err.message);
      }
    });
  };

  return (
    <section id='queue-section' className='md:col-span-6 flex flex-col gap-6'>
      <Card className='bg-gradient-to-br from-card/80 to-primary/5 border-primary/20 shadow-xl relative overflow-hidden min-h-[300px] flex flex-col justify-center'>
        <div className='absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent' />
        <CardHeader className='text-center pb-2'>
          <CardTitle className='flex items-center justify-center gap-2 uppercase tracking-widest text-primary/80'>
            <Swords className='h-5 w-5' /> Current Match
          </CardTitle>
        </CardHeader>
        <CardContent className='flex flex-col items-center justify-center gap-8 py-8'>
          {activeMatch ? (
            <>
              <div className='flex items-center justify-between w-full px-4 md:px-12'>
                <div className='flex flex-col items-center gap-3'>
                  <div className='h-20 w-20 md:h-24 md:w-24 rounded-full bg-secondary flex items-center justify-center text-3xl font-bold shadow-inner'>
                    {activeMatch.groupA.name[0]}
                  </div>
                  <h3 className='text-xl font-bold text-center'>
                    {activeMatch.groupA.name}
                  </h3>
                </div>
                <div className='text-4xl font-black text-muted-foreground/30'>
                  VS
                </div>
                <div className='flex flex-col items-center gap-3'>
                  <div className='h-20 w-20 md:h-24 md:w-24 rounded-full bg-secondary flex items-center justify-center text-3xl font-bold shadow-inner'>
                    {activeMatch.groupB.name[0]}
                  </div>
                  <h3 className='text-xl font-bold text-center'>
                    {activeMatch.groupB.name}
                  </h3>
                </div>
              </div>

              <div className='flex gap-4 mt-4'>
                <Button
                  variant='default'
                  className='bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/20 cursor-pointer'
                  onClick={() => handleFinishMatch(activeMatch.groupA._id)}
                  disabled={isPending}
                >
                  {activeMatch.groupA.name} Wins
                </Button>
                <Button
                  variant='default'
                  className='bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20 cursor-pointer'
                  onClick={() => handleFinishMatch(activeMatch.groupB._id)}
                  disabled={isPending}
                >
                  {activeMatch.groupB.name} Wins
                </Button>
              </div>
            </>
          ) : (
            <div className='flex flex-col items-center gap-4 py-12'>
              <div className='h-16 w-16 rounded-full bg-muted flex items-center justify-center'>
                <Swords className='h-8 w-8 text-muted-foreground/50' />
              </div>
              <div className='text-center space-y-1'>
                <h3 className='text-xl font-medium'>No match in progress</h3>
                <p className='text-muted-foreground'>
                  {queue.groups.length >= minRequired
                    ? 'Queue is ready. Start the next match!'
                    : `Waiting for ${
                        minRequired - queue.groups.length
                      } more ${isGroupMode ? 'groups' : 'players'} to join queue`}
                </p>
              </div>
              <Button
                size='lg'
                onClick={handleStartMatch}
                disabled={queue.groups.length < minRequired || isPending}
                className='mt-4 w-full md:w-auto bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 cursor-pointer shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95'
              >
                <Play className='mr-2 h-5 w-5 fill-current' /> Start Next Match
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
