export type ClerkUserPayload = {
  id: string;
  email_addresses: { email_address: string }[];
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  image_url: string;
};

export interface Player {
  _id: string;
  clerkId?: string;
  email?: string;
  username: string;
  photo: string;
}

export interface UserGroup {
  _id: string;
  name: string;
  members: Player[];
}

export interface FriendRequest {
  _id: string;
  requester: Player;
}

export interface MatchData {
  _id: string;
  groupA: UserGroup;
  groupB: UserGroup;
  status: string;
  winner?: string;
}

export interface ReunionData {
  reunion: ReunionSummaryDto;
  bench: { players: Player[] };
  groups: UserGroup[];
  queue: { groups: UserGroup[] };
  activeMatch: MatchData | null;
}

export interface ReunionInvite {
  _id: string;
  inviter: Player;
  reunion: {
    _id: string;
    name: string;
  };
}

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
  bench: { players: Player[] };
  groups: UserGroup[];
  queue: { groups: UserGroup[] };
  activeMatch: MatchData | null;
};

export type PlayerDto = Player;
export type UserGroupDto = UserGroup;
export type MatchDto = MatchData;

export function toPlayerDto(doc: {
  _id: { toString(): string };
  clerkId?: string;
  email?: string;
  username: string;
  photo: string;
}): Player {
  return {
    _id: doc._id.toString(),
    clerkId: doc.clerkId,
    email: doc.email,
    username: doc.username,
    photo: doc.photo,
  };
}

export function toUserGroupDto(doc: {
  _id: { toString(): string };
  name: string;
  members: Array<{
    _id: { toString(): string };
    clerkId?: string;
    email?: string;
    username: string;
    photo: string;
  }>;
}): UserGroup {
  return {
    _id: doc._id.toString(),
    name: doc.name,
    members: doc.members.map(toPlayerDto),
  };
}

export function toMatchDto(doc: {
  _id: { toString(): string };
  groupA: {
    _id: { toString(): string };
    name: string;
    members: Array<{
      _id: { toString(): string };
      clerkId?: string;
      email?: string;
      username: string;
      photo: string;
    }>;
  };
  groupB: {
    _id: { toString(): string };
    name: string;
    members: Array<{
      _id: { toString(): string };
      clerkId?: string;
      email?: string;
      username: string;
      photo: string;
    }>;
  };
  status: string;
  winner?: { toString(): string };
}): MatchData {
  return {
    _id: doc._id.toString(),
    groupA: toUserGroupDto(doc.groupA),
    groupB: toUserGroupDto(doc.groupB),
    status: doc.status,
    winner: doc.winner?.toString(),
  };
}

export function toReunionSummaryDto(doc: {
  _id: { toString(): string };
  name: string;
  code: string;
  isActive: boolean;
  admin: { _id: { toString(): string } } | { toString(): string };
  createdAt: { toISOString(): string } | string;
  gameMode: 'individual' | 'group';
  groupSize?: number;
  playersAtOnce?: number;
  playersContinue?: number;
}): ReunionSummaryDto {
  const adminId =
    typeof doc.admin === 'object' && '_id' in doc.admin
      ? doc.admin._id.toString()
      : (doc.admin as { toString(): string }).toString();
  const createdAt =
    typeof doc.createdAt === 'string'
      ? doc.createdAt
      : doc.createdAt.toISOString();
  return {
    _id: doc._id.toString(),
    name: doc.name,
    code: doc.code,
    isActive: doc.isActive,
    admin: { _id: adminId },
    createdAt,
    gameMode: doc.gameMode,
    groupSize: doc.groupSize,
    playersAtOnce: doc.playersAtOnce,
    playersContinue: doc.playersContinue,
  };
}
