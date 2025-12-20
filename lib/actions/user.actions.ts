"use server";

import { connectToDatabase } from "@/lib/database";
import User from "@/lib/models/user.model";

export async function createUser(user: { clerkId: string; email: string; username: string; photo: string }) {
  try {
    await connectToDatabase();
    const newUser = await User.create(user);
    return JSON.parse(JSON.stringify(newUser));
  } catch (error) {
    console.log(error);
  }
}

export async function getUserById(clerkId: string) {
  try {
    await connectToDatabase();
    const user = await User.findOne({ clerkId });
    return JSON.parse(JSON.stringify(user));
  } catch (error) {
    console.log(error);
  }
}

export async function syncUser(clerkUser: { 
    id: string; 
    email_addresses: { email_address: string }[]; 
    username?: string | null; 
    first_name?: string | null;
    last_name?: string | null;
    image_url: string 
}) {
  try {
    await connectToDatabase();
    let user = await User.findOne({ clerkId: clerkUser.id });

    const fullName = [clerkUser.first_name, clerkUser.last_name].filter(Boolean).join(" ");
    const displayName = clerkUser.username || fullName || "Anonymous Player";

    if (!user) {
        user = await User.create({
            clerkId: clerkUser.id,
            email: clerkUser.email_addresses[0].email_address,
            username: displayName,
            photo: clerkUser.image_url,
        });
    } else {
        // Update name if changed
        if (user.username !== displayName || user.photo !== clerkUser.image_url) {
            user.username = displayName;
            user.photo = clerkUser.image_url;
            await user.save();
        }
    }
    return JSON.parse(JSON.stringify(user));
  } catch (error) {
    console.error("Error syncing user:", error);
    throw new Error("Failed to sync user");
  }
}
