'use server';

import { connectToDatabase } from '@/lib/database';
import User from '@/lib/models/user.model';
import type { ClerkUserPayload } from '@/lib/actions/types';
import type { Player } from '@/lib/types';

export async function createUser(user: {
  clerkId: string;
  email: string;
  username: string;
  photo: string;
}): Promise<Player> {
  try {
    await connectToDatabase();
    const newUser = await User.create(user);
    return {
      _id: newUser._id.toString(),
      clerkId: newUser.clerkId,
      email: newUser.email,
      username: newUser.username,
      photo: newUser.photo,
    };
  } catch (error) {
    console.log(error);
    throw new Error('Failed to create user');
  }
}

export async function getUserById(clerkId: string): Promise<Player | null> {
  try {
    await connectToDatabase();
    const user = await User.findOne({ clerkId }).lean();
    if (!user) return null;
    return {
      _id: user._id.toString(),
      clerkId: user.clerkId,
      email: user.email,
      username: user.username,
      photo: user.photo,
    };
  } catch (error) {
    console.log(error);
    throw new Error('Failed to get user');
  }
}

export async function syncUser(clerkUser: ClerkUserPayload): Promise<Player> {
  try {
    await connectToDatabase();
    let user = await User.findOne({ clerkId: clerkUser.id });

    const fullName = [clerkUser.first_name, clerkUser.last_name]
      .filter(Boolean)
      .join(' ');
    const displayName = clerkUser.username || fullName || 'Anonymous Player';

    if (!user) {
      user = await User.create({
        clerkId: clerkUser.id,
        email: clerkUser.email_addresses[0].email_address,
        username: displayName,
        photo: clerkUser.image_url,
      });
    } else {
      if (user.username !== displayName || user.photo !== clerkUser.image_url) {
        user.username = displayName;
        user.photo = clerkUser.image_url;
        await user.save();
      }
    }

    return {
      _id: user._id.toString(),
      clerkId: user.clerkId,
      email: user.email,
      username: user.username,
      photo: user.photo,
    };
  } catch (error) {
    console.error('Error syncing user:', error);
    throw new Error('Failed to sync user');
  }
}
