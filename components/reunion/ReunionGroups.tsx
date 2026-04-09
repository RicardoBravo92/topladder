'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users } from 'lucide-react';
import type { Player, ReunionData, UserGroup, MatchData } from './types';

interface ReunionGroupsProps {
  groups: ReunionData['groups'];
  queue: ReunionData['queue'];
  activeMatch: MatchData | null;
}

export function ReunionGroups({
  groups,
  queue,
  activeMatch,
}: ReunionGroupsProps) {
  return (
    <section className='md:col-span-3 flex flex-col gap-4'>
      <Card className='flex-1 bg-card/40 backdrop-blur flex flex-col'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Users className='h-5 w-5 text-primary' /> All Groups
          </CardTitle>
        </CardHeader>
        <CardContent className='flex-1 p-0'>
          <ScrollArea className='h-[300px] md:h-full px-4'>
            <div className='space-y-3 py-2'>
              {groups.map((g: UserGroup) => {
                const isInQueue = queue.groups.find((q: UserGroup) => q._id === g._id);
                const isPlaying =
                  activeMatch &&
                  (activeMatch.groupA._id === g._id || activeMatch.groupB._id === g._id);

                return (
                  <div
                    key={g._id}
                    className='p-3 rounded-xl border border-border/50 bg-card hover:bg-card/80 transition-all'
                  >
                    <div className='flex justify-between items-start mb-2'>
                      <h4 className='font-bold'>{g.name}</h4>
                      {isPlaying ? (
                        <Badge className='bg-green-500/20 text-green-500 border-green-500/20'>
                          Playing
                        </Badge>
                      ) : isInQueue ? (
                        <Badge variant='secondary'>Queued</Badge>
                      ) : (
                        <Badge
                          variant='outline'
                          className='text-muted-foreground opacity-50'
                        >
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <div className='flex gap-2'>
                      {g.members.map((m: Player) => (
                        <div
                          key={m._id}
                          className='text-xs bg-muted px-2 py-1 rounded text-muted-foreground'
                        >
                          {m.username}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {groups.length === 0 && (
                <p className='text-center text-muted-foreground text-sm py-4'>
                  No groups created yet
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </section>
  );
}
