'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getReunionDetails } from '@/app/actions/reunion';
import type { Player, ReunionData } from './reunion/types';
import { ReunionHeader } from './reunion/ReunionHeader';
import { ReunionBench } from './reunion/ReunionBench';
import { ReunionArena } from './reunion/ReunionArena';
import { ReunionQueue } from './reunion/ReunionQueue';
import { ReunionGroups } from './reunion/ReunionGroups';

export function ReunionDashboard({
  initialData,
  currentUser,
}: {
  initialData: ReunionData;
  currentUser: Player;
}) {
  const [data, setData] = useState<ReunionData>(initialData);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  const playerIdsKey = useMemo(() => {
    const benchIds = data.bench.players.map((player: Player) => player._id);
    const groupIds = data.groups.flatMap((group) =>
      group.members.map((member: Player) => member._id),
    );
    return [...benchIds, ...groupIds].join(',');
  }, [data.bench.players, data.groups]);

  const refresh = useCallback(async () => {
    try {
      const fresh = await getReunionDetails(data.reunion._id);
      if (fresh) setData(fresh);
    } catch (error) {
      console.error(error);
    }
  }, [data.reunion._id]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const fresh = await getReunionDetails(data.reunion._id);
        if (active && fresh) setData(fresh);
      } catch (error) {
        console.error(error);
      }
    };

    void load();

    refreshIntervalRef.current = setInterval(() => {
      void load();
    }, 3000);

    return () => {
      active = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [data.reunion._id]);

  const { reunion, bench, groups, queue, activeMatch } = data;
  const isGroupMode = reunion.gameMode === 'group';
  const isAdmin = reunion.admin._id === currentUser._id;

  return (
    <div className='min-h-screen bg-background p-4 md:p-8 space-y-8'>
      <ReunionHeader
        reunion={reunion}
        currentUser={currentUser}
        bench={bench}
        groups={groups}
        playerIdsKey={playerIdsKey}
      />

      <main className='grid grid-cols-1 md:grid-cols-12 gap-6 h-[calc(100vh-200px)]'>
        <ReunionBench
          reunion={reunion}
          bench={bench}
          currentUser={currentUser}
          isAdmin={isAdmin}
          refresh={refresh}
          isPendingQueueActivity={false}
        />

        <div id='queue-section' className='md:col-span-6 flex flex-col gap-6'>
          <ReunionArena
            reunion={reunion}
            activeMatch={activeMatch}
            queue={queue}
            currentUser={currentUser}
            refresh={refresh}
          />
          <ReunionQueue 
            reunion={reunion}
            queue={queue}
            currentUser={currentUser}
            isAdmin={isAdmin}
            refresh={refresh}
          />
        </div>

        {isGroupMode && (
          <ReunionGroups
            groups={groups}
            queue={queue}
            activeMatch={activeMatch}
          />
        )}
      </main>
    </div>
  );
}
