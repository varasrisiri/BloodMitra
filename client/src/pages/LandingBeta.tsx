import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import {
    Droplets,
    Users,
    Heart,
    Search,
    CheckCircle,
    ArrowRight,
    ShieldCheck,
    Zap,
    Activity,
    UserPlus,
    LogIn,
    AlertTriangle
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

import { BloodMitraLogo } from "@/components/BloodMitraLogo";

export default function LandingBeta() {
    const [, setLocation] = useLocation();
    const { isAuthenticated, user } = useAuth();

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ["/api", "public-stats"],
        queryFn: async () => {
            const res = await fetch("/api/public-stats");
            if (!res.ok) throw new Error("Failed to fetch stats");
            return res.json();
        }
    });

    const primaryActions = [
        {
            title: "Request Blood",
            description: "Need blood urgently? Start a request linked to a hospital.",
            icon: Search,
            action: () => setLocation(isAuthenticated ? "/" : "/auth"),
            variant: "default" as const,
            testId: "action-request"
        },
        {
            title: "Become a Donor",
            description: "Join our network of heroes and save lives in your area.",
            icon: UserPlus,
            action: () => setLocation("/auth?mode=register"),
            variant: "default" as const,
            testId: "action-donate"
        },
        {
            title: "Hospital Portal",
            description: "Manage blood inventory and verify donations.",
            icon: ShieldCheck,
            action: () => setLocation("/auth?role=hospital"),
            variant: "default" as const,
            testId: "action-hospital"
        }
    ];

    const steps = [
        {
            title: "Raise Request",
            desc: "Connect to a specific hospital for verified routing.",
            icon: Droplets
        },
        {
            title: "Instant Alerts",
            desc: "Eligible donors receive real-time notifications.",
            icon: Zap
        },
        {
            title: "Safe Fulfillment",
            desc: "Hospitals verify and complete the donation process.",
            icon: ShieldCheck
        }
    ];

    const StatItem = ({ label, value, icon: Icon }: { label: string, value?: number, icon: any }) => (
        <Card className="text-center">
            <CardContent className="pt-6">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Icon className="h-5 w-5 text-primary" />
                </div>
                {statsLoading ? (
                    <Skeleton className="h-8 w-20 mx-auto mb-2" />
                ) : (
                    <div className="text-2xl font-bold text-primary mb-1">
                        {value?.toLocaleString() ?? "0"}
                    </div>
                )}
                <div className="text-sm text-muted-foreground">{label}</div>
            </CardContent>
        </Card>
    );

    return (
        <div className="min-h-screen bg-background pb-20 md:pb-0">
            <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b">
                <div className="container mx-auto px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setLocation("/")}>
                            <BloodMitraLogo size={28} />
                            <span className="text-xl font-bold tracking-tight">BloodMitra</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <ThemeToggle />
                            <Button size="sm" variant="ghost" className="hidden sm:flex" onClick={() => setLocation("/auth")}>
                                Sign In
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 pt-28 max-w-5xl">
                <section className="text-center mb-16 px-2">

                    <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight">
                        Find Blood <span className="text-primary">Faster.</span>
                    </h1>
                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
                        A verified, hospital-linked network designed to connect donors and recipients in seconds. Every second counts.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {primaryActions.map((item) => (
                            <Card key={item.title} className="hover-elevate transition-all border-primary/10 hover:border-primary/30">
                                <CardContent className="p-8 flex flex-col items-center">
                                    <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center mb-6">
                                        <item.icon className="h-7 w-7 text-primary" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                                    <p className="text-muted-foreground text-sm mb-8">{item.description}</p>
                                    <Button
                                        className="w-full font-semibold group relative overflow-hidden transition-all duration-300 shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] bg-primary/90 hover:bg-primary border border-primary/20 backdrop-blur-sm"
                                        variant={item.variant}
                                        onClick={item.action}
                                        data-testid={item.testId}
                                    >
                                        Get Started
                                        <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>

                <section className="bg-card rounded-3xl p-8 md:p-12 mb-16 border border-border/50">
                    <div className="flex flex-col md:flex-row items-center gap-12">
                        <div className="flex-1 space-y-6">
                            <h2 className="text-3xl font-bold">How It Works</h2>
                            <div className="space-y-8">
                                {steps.map((step, i) => (
                                    <div key={i} className="flex gap-4">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                            <step.icon className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-lg">{step.title}</h4>
                                            <p className="text-muted-foreground">{step.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 w-full">
                            <div className="grid grid-cols-2 gap-4">
                                <StatItem label="Active Donors" value={stats?.availableDonors} icon={Users} />
                                <StatItem label="Hospitals" value={stats?.totalHospitals} icon={ShieldCheck} />
                                <StatItem label="Lives Saved" value={stats?.completedDonations} icon={Heart} />
                                <StatItem label="Urgent Requests" value={stats?.pendingRequests} icon={AlertTriangle} />
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Floating Emergency Bar for Mobile */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-md border-t z-50 md:hidden">
                <Button
                    variant="destructive"
                    className="w-full h-12 text-lg font-bold shadow-lg shadow-destructive/20 animate-pulse"
                    onClick={() => setLocation(isAuthenticated ? "/" : "/auth")}
                >
                    <Droplets className="h-5 w-5 mr-2" />
                    Raise Emergency Request
                </Button>
            </div>

            <footer className="py-12 border-t mt-12 bg-card/30">
                <div className="container mx-auto px-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <BloodMitraLogo size={20} />
                        <span className="font-bold">BloodMitra Beta</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Experimental Action-Driven Design &copy; {new Date().getFullYear()}
                    </p>
                </div>
            </footer>
        </div>
    );
}
