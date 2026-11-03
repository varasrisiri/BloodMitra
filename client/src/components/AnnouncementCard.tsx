import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Calendar } from "lucide-react";
import type { Announcement } from "@shared/schema";

interface AnnouncementCardProps {
    announcement: Announcement & { creatorName: string };
    isNew?: boolean;
}

export function AnnouncementCard({ announcement, isNew }: AnnouncementCardProps) {
    return (
        <Card className={`mb-4 relative overflow-hidden ${isNew ? 'border-primary/50 bg-primary/5' : ''}`}>
            {isNew && (
                <div className="absolute top-0 right-0">
                    <Badge variant="default" className="rounded-none rounded-bl-lg">New</Badge>
                </div>
            )}
            <CardHeader className="pb-2">
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-primary/10 rounded-full">
                        <Megaphone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-bold">{announcement.title}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                            <span className="font-medium text-primary">{announcement.creatorName || "Hospital Admin"}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(announcement.createdAt || new Date()).toLocaleDateString()}
                            </span>
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{announcement.message}</p>
            </CardContent>
        </Card>
    );
}
