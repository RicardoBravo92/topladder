"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Play, Swords, UserPlus, Clock, LogOut, UserMinus, UserCheck } from "lucide-react";
import { getReunionDetails, leaveReunion, kickPlayer } from "@/lib/actions/reunion.actions";
import { getFriends, sendFriendRequestById, getFriendshipStatuses, sendReunionInvite, getPendingRequests, respondToFriendRequest } from "@/lib/actions/friend.actions";
import { useRouter } from "next/navigation";
import { createGroup, startMatch, finishMatch } from "@/lib/actions/game.actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";


interface Player {
    _id: string;
    username: string;
    photo: string;
}

interface UserGroup {
    _id: string;
    name: string;
    members: Player[];
}

interface ReunionData {
    reunion: {
        _id: string;
        name: string;
        code: string;
        isActive: boolean;
        admin: { _id: string };
    };
    bench: { players: Player[] };
    groups: UserGroup[];
    queue: { groups: UserGroup[] };
    activeMatch: any;
}


export function ReunionDashboard({ initialData, currentUser }: { initialData: ReunionData, currentUser: Player }) {
    const [data, setData] = useState<ReunionData>(initialData);
    const [isClient, setIsClient] = useState(false);
    const router = useRouter();
    
    // Create Group State
    const [p1, setP1] = useState("");
    const [p2, setP2] = useState("");
    const [createGroupOpen, setCreateGroupOpen] = useState(false);

    const [friends, setFriends] = useState<Player[]>([]);
    const [pendingFriendRequests, setPendingFriendRequests] = useState<any[]>([]);
    const [friendshipStatuses, setFriendshipStatuses] = useState<Record<string, string>>({});
    const [inviteOpen, setInviteOpen] = useState(false);
    const [socialOpen, setSocialOpen] = useState(false);

    useEffect(() => {
        setIsClient(true);
        const interval = setInterval(async () => {
            const fresh = await getReunionDetails(data.reunion._id);
            if(fresh) setData(fresh);
        }, 3000);
        
        // Load social data
        const loadSocial = async () => {
            const [f, p] = await Promise.all([
                getFriends(currentUser._id),
                getPendingRequests(currentUser._id)
            ]);
            setFriends(f);
            setPendingFriendRequests(p);
            
            const allPlayerIds = [
                ...data.bench.players.map((p: any) => p._id),
                ...data.groups.flatMap((g: any) => g.members.map((m: any) => m._id))
            ];
            const statuses = await getFriendshipStatuses(currentUser._id, allPlayerIds);
            setFriendshipStatuses(statuses);
        };
        loadSocial();

        return () => clearInterval(interval);
    }, [data.reunion._id, currentUser._id, data.bench.players, data.groups]);
    
    if(!isClient) return null;

    const { reunion, bench, groups, queue, activeMatch } = data;

    // Helpers
    const refresh = async () => {
        const fresh = await getReunionDetails(reunion._id);
        if(fresh) setData(fresh);
    };

    const handleInvite = async (friend: any) => {
        try {
            await sendReunionInvite(reunion._id, currentUser._id, friend._id);
            alert(`Invite sent to ${friend.username}!`);
        } catch (e: any) {
            alert(e.message);
        }
    };
    
    const handleAddFriend = async (targetId: string, targetName: string) => {
        try {
            await sendFriendRequestById(currentUser._id, targetId);
            alert(`Friend request sent to ${targetName}!`);
            // Update local status
            setFriendshipStatuses(prev => ({ ...prev, [targetId]: "pending" }));
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleRespondToFriend = async (id: string, status: "accepted" | "rejected") => {
        try {
            await respondToFriendRequest(id, status);
            // Refresh social data
            const [f, p] = await Promise.all([
                getFriends(currentUser._id),
                getPendingRequests(currentUser._id)
            ]);
            setFriends(f);
            setPendingFriendRequests(p);
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleCreateGroup = async () => {
        if(!p1 || !p2 || p1 === p2) return;
        await createGroup(reunion._id, [p1, p2]);
        setCreateGroupOpen(false);
        setP1(""); setP2("");
        refresh();
    };

    const handleStartMatch = async () => {
        try {
            await startMatch(reunion._id);
            refresh();
        } catch(e: any) { 
            alert("Cannot start match: " + e.message); 
        }
    };

    const handleFinishMatch = async (winnerGroupId: string) => {
        await finishMatch(activeMatch._id, winnerGroupId);
        refresh();
    };

    const handleLeave = async () => {
        if (confirm("Are you sure you want to leave this reunion? You will be removed from the bench and any groups.")) {
            await leaveReunion(reunion._id, currentUser._id);
            router.push("/");
        }
    };

    const handleKick = async (targetUserId: string, targetName: string) => {
        if (confirm(`Are you sure you want to kick ${targetName}?`)) {
            await kickPlayer(reunion._id, currentUser._id, targetUserId);
            refresh();
        }
    };

    const isAdmin = reunion.admin._id === currentUser._id;

    return (
        <div className="min-h-screen bg-background p-4 md:p-8 space-y-8">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-border/50 pb-6">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                        {reunion.name}
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-muted-foreground">Code: {reunion.code}</Badge>
                        <Badge variant="secondary">{reunion.isActive ? 'Active' : 'Finished'}</Badge>
                        
                        <Dialog open={socialOpen} onOpenChange={setSocialOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" variant="outline" className="h-6 text-xs gap-1 border-primary/20 hover:bg-primary/10 cursor-pointer relative">
                                    <Users className="h-3 w-3" /> Social
                                    {pendingFriendRequests.length > 0 && (
                                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                                        </span>
                                    )}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader><DialogTitle>Social Management</DialogTitle></DialogHeader>
                                <div className="space-y-6 pt-4">
                                    {/* Pending Requests Section */}
                                    {pendingFriendRequests.length > 0 && (
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-bold text-destructive uppercase tracking-wider">Friend Requests</h4>
                                            <div className="grid gap-2">
                                                {pendingFriendRequests.map((r: any) => (
                                                    <div key={r._id} className="flex items-center justify-between p-3 rounded-xl bg-destructive/5 border border-destructive/10">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarImage src={r.requester.photo} />
                                                                <AvatarFallback>{r.requester.username[0]}</AvatarFallback>
                                                            </Avatar>
                                                            <span className="text-sm font-medium">{r.requester.username}</span>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500 hover:bg-green-500/10" onClick={() => handleRespondToFriend(r._id, "accepted")}>
                                                                <UserCheck className="h-4 w-4" />
                                                            </Button>
                                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleRespondToFriend(r._id, "rejected")}>
                                                                <UserPlus className="h-4 w-4 rotate-45" /> 
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Reunion Players Section */}
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Players in Reunion</h4>
                                        <ScrollArea className="h-[200px] rounded-lg border border-border/50 p-2">
                                            <div className="grid gap-2">
                                                {[...bench.players, ...groups.flatMap((g: any) => g.members)]
                                                    .filter((p: any, i, self) => p._id !== currentUser._id && self.findIndex(s => s._id === p._id) === i)
                                                    .map((p: any) => {
                                                        const status = friendshipStatuses[p._id];
                                                        return (
                                                            <div key={p._id} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/10 transition-colors">
                                                                <div className="flex items-center gap-2">
                                                                    <Avatar className="h-8 w-8">
                                                                        <AvatarImage src={p.photo} />
                                                                        <AvatarFallback>{p.username[0]}</AvatarFallback>
                                                                    </Avatar>
                                                                    <span className="text-sm font-medium">{p.username}</span>
                                                                </div>
                                                                {status === "accepted" ? (
                                                                    <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-500 border-green-500/20"><UserCheck className="h-3 w-3"/> Friends</Badge>
                                                                ) : status === "pending" ? (
                                                                    <Badge variant="outline" className="animate-pulse">Pending</Badge>
                                                                ) : (
                                                                    <Button size="sm" variant="ghost" className="h-8 text-primary hover:bg-primary/10" onClick={() => handleAddFriend(p._id, p.username)}>
                                                                        Add Friend
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        );
                                                    })
                                                }
                                                {[...bench.players, ...groups.flatMap((g: any) => g.members)].length <= 1 && (
                                                    <p className="text-center text-xs text-muted-foreground py-8">No other players here yet.</p>
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" variant="outline" className="h-6 text-xs gap-1 border-primary/20 hover:bg-primary/10 cursor-pointer">
                                    <UserPlus className="h-3 w-3" /> Invite Friends
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>Invite Your Friends</DialogTitle></DialogHeader>
                                <div className="space-y-4 pt-4">
                                    <div className="grid gap-3">
                                        {friends.map((f: any) => (
                                            <div key={f._id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/20">
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={f.photo} />
                                                        <AvatarFallback>{f.username[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-sm font-medium">{f.username}</span>
                                                </div>
                                                <Button size="sm" onClick={() => handleInvite(f)}>Invite to Reunion</Button>
                                            </div>
                                        ))}
                                        {friends.length === 0 && (
                                            <p className="text-center text-sm text-muted-foreground py-8">
                                                You don&apos;t have friends yet. Add them from the reunion or the home page!
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                     <p className="text-sm text-muted-foreground">Welcome, {currentUser.username}</p>
                     <Avatar className="h-10 w-10 border-2 border-primary">
                        <AvatarImage src={currentUser.photo} />
                        <AvatarFallback>{currentUser.username?.[0]}</AvatarFallback>
                     </Avatar>
                     <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 cursor-pointer" title="Leave Reunion" onClick={handleLeave}>
                        <LogOut className="h-5 w-5" />
                     </Button>
                </div>
            </header>

            <main className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
                {/* Left: Bench (3 cols) */}
                <section className="md:col-span-3 flex flex-col gap-4">
                     <Card className="flex-1 bg-card/40 backdrop-blur border-primary/10 overflow-hidden flex flex-col">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                             <CardTitle className="flex items-center gap-2 text-lg">
                                <Users className="h-5 w-5 text-primary" /> Bench
                             </CardTitle>
                             <Badge>{bench.players.length}</Badge>
                        </CardHeader>
                        <CardContent className="flex-1 p-0">
                            <ScrollArea className="h-[300px] md:h-full px-4">
                                <div className="space-y-3 py-2">
                                    {bench.players.map((p: any) => (
                                        <div key={p._id} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/20 transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={p.photo} />
                                                    <AvatarFallback>{p.username[0]}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm font-medium">{p.username}</span>
                                            </div>
                                            {isAdmin && p._id !== currentUser._id && (
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => handleKick(p._id, p.username)}>
                                                    <UserMinus className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                    {bench.players.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">Bench is empty</p>}
                                </div>
                            </ScrollArea>
                        </CardContent>
                     </Card>
                     
                     <Dialog open={createGroupOpen} onOpenChange={setCreateGroupOpen}>
                        <DialogTrigger asChild>
                            <Button className="w-full bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 shadow-lg shadow-primary/20 cursor-pointer">
                                <UserPlus className="mr-2 h-4 w-4" /> Form Group
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Group</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Player 1</label>
                                    <Select onValueChange={setP1} value={p1}>
                                        <SelectTrigger><SelectValue placeholder="Select player" /></SelectTrigger>
                                        <SelectContent>
                                            {bench.players.map((p: any) => (
                                                 <SelectItem key={p._id} value={p._id} disabled={p._id === p2}>
                                                    {p.username}
                                                 </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Player 2</label>
                                    <Select onValueChange={setP2} value={p2}>
                                        <SelectTrigger><SelectValue placeholder="Select player" /></SelectTrigger>
                                        <SelectContent>
                                            {bench.players.map((p: any) => (
                                                 <SelectItem key={p._id} value={p._id} disabled={p._id === p1}>
                                                    {p.username}
                                                 </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button onClick={handleCreateGroup} disabled={!p1 || !p2} className="w-full cursor-pointer">Create & Queue</Button>
                            </div>
                        </DialogContent>
                     </Dialog>
                </section>

                {/* Middle: Arena (6 cols) */}
                <section className="md:col-span-6 flex flex-col gap-6">
                     {/* Active Match */}
                     <Card className="bg-gradient-to-br from-card/80 to-primary/5 border-primary/20 shadow-xl relative overflow-hidden min-h-[300px] flex flex-col justify-center">
                         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
                         <CardHeader className="text-center pb-2">
                            <CardTitle className="flex items-center justify-center gap-2 uppercase tracking-widest text-primary/80">
                                <Swords className="h-5 w-5" /> Current Match
                            </CardTitle>
                         </CardHeader>
                         <CardContent className="flex flex-col items-center justify-center gap-8 py-8">
                            {activeMatch ? (
                                <>
                                    <div className="flex items-center justify-between w-full px-4 md:px-12">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="h-20 w-20 md:h-24 md:w-24 rounded-full bg-secondary flex items-center justify-center text-3xl font-bold shadow-inner">
                                                {activeMatch.groupA.name[0]}
                                            </div>
                                            <h3 className="text-xl font-bold text-center">{activeMatch.groupA.name}</h3>
                                        </div>
                                        <div className="text-4xl font-black text-muted-foreground/30">VS</div>
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="h-20 w-20 md:h-24 md:w-24 rounded-full bg-secondary flex items-center justify-center text-3xl font-bold shadow-inner">
                                               {activeMatch.groupB.name[0]}
                                            </div>
                                            <h3 className="text-xl font-bold text-center">{activeMatch.groupB.name}</h3>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-4 mt-4">
                                        <Button variant="default" className="bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/20 cursor-pointer" onClick={() => handleFinishMatch(activeMatch.groupA._id)}>
                                            {activeMatch.groupA.name} Wins
                                        </Button>
                                        <Button variant="default" className="bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20 cursor-pointer" onClick={() => handleFinishMatch(activeMatch.groupB._id)}>
                                            {activeMatch.groupB.name} Wins
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center space-y-4">
                                    <p className="text-muted-foreground text-lg">No match in progress</p>
                                    <Button size="lg" onClick={handleStartMatch} disabled={queue.groups.length < 2} className="cursor-pointer">
                                        <Play className="mr-2 h-5 w-5" /> Start Next Match
                                    </Button>
                                    {queue.groups.length < 2 && <p className="text-xs text-destructive">Need at least 2 groups in queue</p>}
                                </div>
                            )}
                         </CardContent>
                     </Card>

                     {/* Queue */}
                     <Card className="flex-1 bg-card/40 backdrop-blur flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-primary" /> Queue ({queue.groups.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 p-0">
                            <ScrollArea className="h-[200px] md:h-full px-4">
                                <div className="space-y-2 py-2">
                                    {queue.groups.map((g: any, i: number) => (
                                        <div key={g._id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50">
                                            <div className="flex items-center gap-3">
                                                <Badge variant="outline" className="h-6 w-6 flex items-center justify-center rounded-full bg-primary/10 border-none text-primary">
                                                    {i + 1}
                                                </Badge>
                                                <span className="font-semibold">{g.name}</span>
                                            </div>
                                            <div className="flex -space-x-2">
                                                {g.members.map((m: any) => (
                                                    <Avatar key={m._id} className="h-6 w-6 border border-background">
                                                        <AvatarImage src={m.photo} />
                                                        <AvatarFallback>{m.username[0]}</AvatarFallback>
                                                    </Avatar>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {queue.groups.length === 0 && <p className="text-center text-muted-foreground py-4">Queue is empty</p>}
                                </div>
                            </ScrollArea>
                        </CardContent>
                     </Card>
                </section>

                {/* Right: Groups (3 cols) */}
                <section className="md:col-span-3 flex flex-col gap-4">
                    <Card className="flex-1 bg-card/40 backdrop-blur flex flex-col">
                         <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-primary" /> All Groups
                            </CardTitle>
                         </CardHeader>
                         <CardContent className="flex-1 p-0">
                             <ScrollArea className="h-[300px] md:h-full px-4">
                                 <div className="space-y-3 py-2">
                                     {groups.map((g: any) => {
                                         const isInQueue = queue.groups.find((q: any) => q._id === g._id);
                                         const isPlaying = activeMatch && (activeMatch.groupA._id === g._id || activeMatch.groupB._id === g._id);
                                         
                                         return (
                                            <div key={g._id} className="p-3 rounded-xl border border-border/50 bg-card hover:bg-card/80 transition-all">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="font-bold">{g.name}</h4>
                                                    {isPlaying ? <Badge className="bg-green-500/20 text-green-500 border-green-500/20">Playing</Badge> : 
                                                     isInQueue ? <Badge variant="secondary">Queued</Badge> : 
                                                     <Badge variant="outline" className="text-muted-foreground opacity-50">Inactive</Badge>
                                                    }
                                                </div>
                                                <div className="flex gap-2">
                                                    {g.members.map((m: any) => (
                                                        <div key={m._id} className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
                                                            {m.username}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                         )
                                     })}
                                     {groups.length === 0 && <p className="text-center text-muted-foreground py-4">No groups formed</p>}
                                 </div>
                             </ScrollArea>
                         </CardContent>
                    </Card>
                </section>
            </main>
        </div>
    )
}
