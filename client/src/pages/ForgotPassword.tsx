import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BloodMitraLogo } from "@/components/BloodMitraLogo";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Something went wrong. Please try again.");
      } else {
        setSubmitted(true);
      }
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <BloodMitraLogo size={36} />
          <span className="text-2xl font-bold">BloodMitra</span>
        </div>

        <Card>
          <CardHeader className="text-center">
            {submitted ? (
              <>
                <div className="flex justify-center mb-3">
                  <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <CardTitle className="text-xl">Check Your Email</CardTitle>
                <CardDescription className="mt-2">
                  If an account exists for <strong>{email}</strong>, a reset link
                  will be sent if email delivery is available. The link expires in
                  one hour.
                </CardDescription>
              </>
            ) : (
              <>
                <div className="flex justify-center mb-3">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="h-7 w-7 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-xl">Forgot Password?</CardTitle>
                <CardDescription className="mt-1">
                  Enter your registered email address and we'll send you a link
                  to reset your password.
                </CardDescription>
              </>
            )}
          </CardHeader>

          <CardContent>
            {submitted ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Didn't receive the email? Check your spam folder, or{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium"
                    onClick={() => { setSubmitted(false); setEmail(""); }}
                  >
                    try again
                  </button>
                  .
                </p>
                <Button
                  className="w-full"
                  onClick={() => setLocation("/auth")}
                >
                  Back to Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your registered email"
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full py-5 text-base rounded-xl"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending Reset Link..." : "Send Reset Link"}
                </Button>

                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mt-2"
                  onClick={() => setLocation("/auth")}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Login
                </button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
