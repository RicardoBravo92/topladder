import type { Player, UserGroup, MatchData } from '@/lib/types';

export type { ClerkUserPayload } from '@/lib/types';

export type PlayerDto = Player;

export type UserGroupDto = UserGroup;

export type MatchDto = MatchData;

export type ReunionSettingsDto = {
  gameMode: 'individual' | 'group';
  groupSize?: number;
  playersAtOnce?: number;
  playersContinue?: number;
};

export type ReunionSummaryDto = {
  _id: string;
  name: string;
  code: string;
  isActive: boolean;
  admin: { _id: string };
  createdAt: string;
} & ReunionSettingsDto;

export type ReunionDetailsDto = {
  reunion: ReunionSummaryDto;
  bench: { players: PlayerDto[] };
  groups: UserGroupDto[];
  queue: { groups: UserGroupDto[] };
  activeMatch: MatchDto | null;
};
