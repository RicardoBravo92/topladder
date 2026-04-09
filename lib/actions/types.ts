export type ClerkUserPayload = {
  id: string;
  email_addresses: { email_address: string }[];
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  image_url: string;
};

export type UserDto = {
  _id: string;
  clerkId: string;
  email: string;
  username: string;
  photo: string;
};

export type PlayerDto = UserDto;

export type UserGroupDto = {
  _id: string;
  name: string;
  members: PlayerDto[];
};

export type MatchDto = {
  _id: string;
  groupA: UserGroupDto;
  groupB: UserGroupDto;
  status: string;
  winner?: string;
};

export type ReunionSummaryDto = {
  _id: string;
  name: string;
  code: string;
  isActive: boolean;
  admin: { _id: string };
  createdAt: string;
};

export type ReunionDetailsDto = {
  reunion: ReunionSummaryDto;
  bench: { players: PlayerDto[] };
  groups: UserGroupDto[];
  queue: { groups: UserGroupDto[] };
  activeMatch: MatchDto | null;
};
