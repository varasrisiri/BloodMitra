import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Droplets,
    User as UserIcon,
    Building2,
    Lock,
    Mail,
    Plus,
    FileText,
    CheckCircle,
    XCircle,
    Eye,
    UserCircle,
    Phone
} from "lucide-react";
import { BloodMitraLogo } from "@/components/BloodMitraLogo";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, type InsertUser } from "@shared/schema";

import { z } from "zod";

export default function AuthPage() {
    const { user, loginMutation, registerMutation } = useAuth();
    const { toast } = useToast();
    const [, setLocation] = useLocation();
    const [role, setRole] = useState<"user" | "hospital">("user");

    if (user) {
        setLocation("/");
        return null;
    }

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-background">
            {/* Hero Section */}
            <div className="md:flex-1 bg-primary relative overflow-hidden flex flex-col items-center justify-center p-8 text-primary-foreground hidden md:flex">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1536856789758-0c65a8ff33f2?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay opacity-20" />
                <div className="relative z-10 max-w-md text-center">
                    <BloodMitraLogo size={80} className="mb-6 mx-auto" />
                    <h1 className="text-4xl font-bold mb-4 tracking-tight">BloodMitra</h1>
                    <p className="text-xl opacity-90 leading-relaxed">
                        Connecting donors, receivers, and hospitals in a smart matching platform. Join us and help save lives today.
                    </p>
                </div>
            </div>

            {/* Form Section */}
            <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-card">
                <div className="w-full max-w-[450px] space-y-6">
                    <div className="text-center md:hidden mb-8">
                        <div className="inline-flex items-center gap-2 mb-2">
                            <BloodMitraLogo size={32} />
                            <span className="text-2xl font-bold">BloodMitra</span>
                        </div>
                    </div>

                    <Tabs defaultValue="login" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-8 p-1 bg-muted/50 rounded-xl">
                            <TabsTrigger value="login" className="rounded-lg py-2.5 transition-all text-sm font-medium">Login</TabsTrigger>
                            <TabsTrigger value="register" className="rounded-lg py-2.5 transition-all text-sm font-medium">Register</TabsTrigger>
                        </TabsList>

                        <TabsContent value="login">
                            <LoginForm role={role} setRole={setRole} loginMutation={loginMutation} />
                        </TabsContent>

                        <TabsContent value="register">
                            <RegisterForm role={role} setRole={setRole} registerMutation={registerMutation} />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}

function RoleToggle({ role, setRole }: { role: "user" | "hospital", setRole: (r: "user" | "hospital") => void }) {
    return (
        <div className="flex p-1 bg-muted rounded-lg mb-6 w-full max-w-[280px] mx-auto">
            <button
                onClick={() => setRole("user")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition-all ${role === "user" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
            >
                <UserIcon className="h-3.5 w-3.5" />
                Individual
            </button>
            <button
                onClick={() => setRole("hospital")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition-all ${role === "hospital" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
            >
                <Building2 className="h-3.5 w-3.5" />
                Hospital
            </button>
        </div>
    );
}

function LoginForm({ role, setRole, loginMutation }: any) {
    const form = useForm({
        defaultValues: { username: "", password: "" }
    });
    const [, setLocation] = useLocation();

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="text-center pb-2 px-0">
                <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
                <CardDescription>Login to your account as a {role}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 px-0">
                <RoleToggle role={role} setRole={setRole} />
                <form onSubmit={form.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <div className="relative">
                            <UserCircle className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input id="username" placeholder="Enter Username" className="pl-10" {...form.register("username")} required />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input id="password" type="password" className="pl-10" {...form.register("password")} required />
                        </div>
                    </div>
                    <Button type="submit" className="w-full py-6 text-lg rounded-xl mt-4" disabled={loginMutation.isPending}>
                        {loginMutation.isPending ? "Signing in..." : "Sign In"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

function RegisterForm({ role, setRole, registerMutation }: any) {
    const { toast } = useToast();
    const form = useForm<z.input<typeof insertUserSchema>>({
        resolver: zodResolver(insertUserSchema),
        defaultValues: {
            username: "",
            password: "",
            role: role,
            name: "",
            email: "",
            location: "",
            bloodGroup: undefined,
            phone: "",
        }
    });

    // Keep the role in sync with the parent state
    useEffect(() => {
        form.setValue("role", role);
    }, [role, form]);

    const onSubmit = (data: z.input<typeof insertUserSchema>) => {
        const formData = new FormData();

        // IMPORTANT: Append text fields BEFORE files. 
        // Some multipart parsers require this to correctly populate req.body.
        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null && (key !== "bloodGroup" || value !== "")) {
                formData.append(key, String(value));
            }
        });

        // Ensure current role is explicitly set
        formData.delete("role");
        formData.append("role", role);

        const fileInput = document.getElementById("id-document") as HTMLInputElement;
        if (fileInput?.files?.[0]) {
            if (fileInput.files[0].size > 2 * 1024 * 1024) {
                toast({
                    title: "File too large",
                    description: "ID Document must be less than 2MB",
                    variant: "destructive",
                });
                return;
            }
            formData.append("idDocument", fileInput.files[0]);
        } else if (role === "user") {
            toast({
                title: "ID Required",
                description: "Please upload a valid ID proof (PDF)",
                variant: "destructive",
            });
            return;
        }

        registerMutation.mutate(formData);
    };

    const onFormError = (errors: any) => {
        console.error("Registration form errors:", errors);
        const errorMessages = Object.values(errors).map((err: any) => err.message);
        if (errorMessages.length > 0) {
            toast({
                title: "Validation Error",
                description: String(errorMessages[0]),
                variant: "destructive",
            });
        }
    };

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="text-center pb-2 px-0">
                <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
                <CardDescription>Join our life-saving community today</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 px-0 text-left">
                <RoleToggle role={role} setRole={setRole} />
                <form onSubmit={form.handleSubmit(onSubmit, onFormError)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">{role === "hospital" ? "Hospital Name" : "Full Name"}</Label>
                        <Input id="name" placeholder={role === "hospital" ? "ABC Hospital" : "Ex: Mohit Prakash"} {...form.register("name")} required />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input id="username" placeholder="Ex: mohitprakash123" {...form.register("username")} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" type="password" placeholder="Create Password" {...form.register("password")} required />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input id="email" type="email" placeholder="Enter Email" className="pl-10" {...form.register("email")} required />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input id="phone" placeholder="+91 9000000000" className="pl-10" {...form.register("phone")} required />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="location">Location (City)</Label>
                            <Input id="location" placeholder="Enter your location" {...form.register("location")} required />
                        </div>
                        {role === "user" && (
                            <div className="space-y-2">
                                <Label htmlFor="bloodGroup">Blood Group</Label>
                                <select
                                    id="bloodGroup"
                                    className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    {...form.register("bloodGroup")}
                                    required
                                >
                                    <option value="">Select</option>
                                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bg => (
                                        <option key={bg} value={bg}>{bg}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {role === "user" && (
                        <div className="space-y-2">
                            <Label htmlFor="id-document">ID Document (PDF, max 2MB) *</Label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="id-document"
                                    type="file"
                                    accept=".pdf"
                                    className="pl-10 pb-2 cursor-pointer pt-2"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <Button type="submit" className="w-full py-6 text-lg rounded-xl mt-4" disabled={registerMutation.isPending}>
                        {registerMutation.isPending ? "Creating Account..." : "Register Now"}
                    </Button>
                </form>
            </CardContent >
        </Card >
    );
}
