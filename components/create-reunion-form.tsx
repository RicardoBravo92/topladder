"use client";

import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import { createReunion } from "@/lib/actions/reunion.actions";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function CreateReunionForm() {
    const { user } = useUser();
    const router = useRouter();
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!user || !name) return;
        setLoading(true);
        try {
            // Need to pass a plain object representing the user, or better: 
            // The action expects the clerk user object, but we can't pass the full complex object easily if it has methods.
            // But createReunion takes `clerkUser: any`. 
            // We should pass the necessary fields.
            const userPayload = {
                id: user.id,
                email_addresses: user.emailAddresses.map(e => ({ email_address: e.emailAddress })),
                username: user.username,
                first_name: user.firstName,
                last_name: user.lastName,
                image_url: user.imageUrl
            };
            
            const res = await createReunion(userPayload, name);
            router.push(`/reunion/${res._id}`);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="hover:border-primary/50 transition-all duration-300 shadow-lg bg-card/50 backdrop-blur">
            <CardHeader>
                <CardTitle>Create a Reunion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>Reunion Name</Label>
                    <Input 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        placeholder="Friday Night Hoops" 
                        className="bg-background/50"
                    />
                </div>
                <Button onClick={handleCreate} disabled={loading} className="w-full cursor-pointer">
                    {loading ? "Creating..." : "Create Reunion"}
                </Button>
            </CardContent>
        </Card>
    );
}
