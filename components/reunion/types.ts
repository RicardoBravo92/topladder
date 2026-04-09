export interface Player {
  _id: string;
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
