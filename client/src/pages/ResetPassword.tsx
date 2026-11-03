import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BloodMitraLogo } from "@/components/BloodMitraLogo";
import { Lock, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";

/** Extract a query-param from the current URL without a router dep */
function getQueryParam(name: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(name);
}

type TokenState = "checking" | "valid" | "invalid";

export default function ResetPassword() {
  const [, setLocation] = useLocation();

  const token = getQueryParam("token") || "";

  const [tokenState, setTokenState] = useState<TokenState>("checking");
  const [tokenError, setTokenError] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState("");

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setTokenState("invalid");
      setTokenError("No reset token found. Please request a new password reset link.");
      return;
    }

    fetch(`/api/auth/validate-reset-token?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setTokenState("valid");
        } else {
          setTokenState("invalid");
          setTokenError(data.message || "This reset link is invalid or has expired.");
        }
      })
      .catch(() => {
        setTokenState("invalid");
        setTokenError("Could not validate reset link. Please try again.");
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (newPassword.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.message || "Reset failed. Please try again.");
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setFormError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Password strength indicator
  const strength = (() => {
    if (newPassword.length === 0) return null;
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;
    if (score <= 1) return { label: "Weak", color: "bg-red-500" };
    if (score === 2) return { label: "Fair", color: "bg-yellow-500" };
    if (score === 3) return { label: "Good", color: "bg-blue-500" };
    return { label: "Strong", color: "bg-green-500" };
  })();

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
            {success ? (
              <>
                <div className="flex justify-center mb-3">
                  <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <CardTitle className="text-xl">Password Reset Successful</CardTitle>
                <CardDescription className="mt-1">
                  Your password has been updated. You can now log in with your new
                  password.
                </CardDescription>
              </>
            ) : tokenState === "invalid" ? (
              <>
                <div className="flex justify-center mb-3">
                  <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                <CardTitle className="text-xl">Link Expired or Invalid</CardTitle>
                <CardDescription className="mt-1">{tokenError}</CardDescription>
              </>
            ) : tokenState === "checking" ? (
              <>
                <div className="flex justify-center mb-3">
                  <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                </div>
                <CardTitle className="text-xl">Validating Link…</CardTitle>
              </>
            ) : (
              <>
                <div className="flex justify-center mb-3">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <Lock className="h-7 w-7 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-xl">Set New Password</CardTitle>
                <CardDescription className="mt-1">
                  Choose a strong password for your BloodMitra account.
                </CardDescription>
              </>
            )}
          </CardHeader>

          <CardContent>
            {success && (
              <Button className="w-full" onClick={() => setLocation("/auth")}>
                Go to Login
              </Button>
            )}

            {tokenState === "invalid" && !success && (
              <div className="space-y-3">
                <Button
                  className="w-full"
                  onClick={() => setLocation("/forgot-password")}
                >
                  Request a New Reset Link
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setLocation("/auth")}
                >
                  Back to Login
                </Button>
              </div>
            )}

            {tokenState === "valid" && !success && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New Password */}
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimum 8 characters"
                      className="pl-10 pr-10"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {/* Strength bar */}
                  {strength && (
                    <div className="space-y-1">
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${strength.color}`}
                          style={{
                            width:
                              strength.label === "Weak" ? "25%" :
                              strength.label === "Fair" ? "50%" :
                              strength.label === "Good" ? "75%" : "100%",
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Strength: <span className="font-medium">{strength.label}</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Re-enter your new password"
                      className="pl-10 pr-10"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowConfirm(!showConfirm)}
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-destructive">Passwords do not match.</p>
                  )}
                  {confirmPassword && newPassword === confirmPassword && newPassword.length >= 8 && (
                    <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> Passwords match
                    </p>
                  )}
                </div>

                {formError && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                    {formError}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full py-5 text-base rounded-xl mt-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Resetting Password..." : "Reset Password"}
                </Button>

                <button
                  type="button"
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setLocation("/auth")}
                >
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
