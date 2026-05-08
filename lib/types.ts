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
  reunion: {
    _id: string;
    name: string;
    code: string;
    isActive: boolean;
    admin: { _id: string };
    gameMode: 'individual' | 'group';
    groupSize?: number;
    playersAtOnce?: number;
    playersContinue?: number;
  };
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
