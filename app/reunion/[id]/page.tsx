import { getReunionDetails, ensureUserInReunion } from "@/lib/actions/reunion.actions";
import { syncUser } from "@/lib/actions/user.actions";
import { ReunionDashboard } from "@/components/reunion-dashboard";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function ReunionPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const user = await currentUser();
    if (!user) redirect("/");
    
    // Sync user to ensure name/photo are correct
    const syncedUser = await syncUser({
        id: user.id,
        email_addresses: user.emailAddresses.map(e => ({ email_address: e.emailAddress })),
        username: user.username,
        first_name: user.firstName,
        last_name: user.lastName,
        image_url: user.imageUrl
    });

    // Ensure the user is added to the bench if they are entering via direct link
    await ensureUserInReunion(id, syncedUser._id);

    const initialData = await getReunionDetails(id);
    
    if (!initialData) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <h1 className="text-2xl font-bold text-destructive">Reunion Not Found</h1>
            </div>
        );
    }

    return <ReunionDashboard initialData={initialData} currentUser={syncedUser} />;
}
