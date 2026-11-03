import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Droplets,
  Users,
  Heart,
  Clock,
  LogIn,
  UserPlus,
  Search,
  Send,
  CheckCircle,
  Phone,
  Mail,
  MapPin,
  ArrowRight
} from "lucide-react";
import heroImage from "@assets/stock_images/blood_donation_medic_49df73e9.jpg";
import { BloodMitraLogo } from "@/components/BloodMitraLogo";

export default function Landing() {
  const stats = [
    { label: "Registered Donors", value: "10,000+", icon: Users },
    { label: "Blood Units Donated", value: "25,000+", icon: Droplets },
    { label: "Lives Saved", value: "50,000+", icon: Heart },
    { label: "Average Response Time", value: "< 2 hrs", icon: Clock },
  ];

  const howItWorks = [
    {
      step: 1,
      icon: UserPlus,
      title: "Register & Create Profile",
      description: "Sign up and complete your profile with blood type, location, and availability status.",
    },
    {
      step: 2,
      icon: Search,
      title: "Search or Request Blood",
      description: "Find available donors in your area or create a blood request for your needs.",
    },
    {
      step: 3,
      icon: CheckCircle,
      title: "Connect & Donate",
      description: "Get matched with donors or receivers and complete the life-saving donation.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <BloodMitraLogo size={32} />
              <span className="text-xl font-bold">BloodMitra</span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button asChild data-testid="button-login">
                <a href="/auth">
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden pt-16">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />

          <div className="relative z-10 container mx-auto px-4 py-20 text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Every Drop Counts.
              <br />
              <span className="text-primary-foreground/90">Be a Hero Today.</span>
            </h1>
            <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-8">
              Connect with blood donors and receivers in real-time.
              Our platform makes it easy to save lives with just a few clicks.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild className="text-lg px-8" data-testid="button-get-started">
                <a href="/auth">
                  Get Started
                  <ArrowRight className="h-5 w-5 ml-2" />
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 bg-white/10 backdrop-blur-sm border-white/30 text-white"
                data-testid="button-learn-more"
              >
                Learn More
              </Button>
            </div>
          </div>
        </section>

        <section className="py-16 bg-card">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
              How It Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {howItWorks.map((item) => (
                <Card key={item.step} className="hover-elevate text-center">
                  <CardContent className="p-8">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <item.icon className="h-8 w-8 text-primary" />
                    </div>
                    <div className="text-sm font-medium text-primary mb-2">
                      Step {item.step}
                    </div>
                    <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
              Our Impact
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat) => (
                <Card key={stat.label} className="hover-elevate text-center">
                  <CardContent className="p-6">
                    <stat.icon className="h-10 w-10 text-primary mx-auto mb-4" />
                    <p className="text-3xl md:text-4xl font-bold text-primary mb-2">
                      {stat.value}
                    </p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 bg-card">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
              For Donors & Receivers
            </h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <Card className="hover-elevate border-primary/20">
                <CardContent className="p-8">
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                    <Heart className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">For Donors</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      <span>Set your availability status</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      <span>Receive blood requests from your area</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      <span>Track your donation history</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      <span>Earn badges and recognition</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="hover-elevate border-primary/20">
                <CardContent className="p-8">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                    <Send className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">For Receivers</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                      <span>Search for donors by blood type</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                      <span>Create blood requests quickly</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                      <span>Get matched with nearby donors</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                      <span>Track request status in real-time</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-12 bg-primary">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-primary-foreground">
              <div className="flex items-center gap-4">
                <Phone className="h-8 w-8" />
                <div>
                  <p className="text-sm opacity-80">24/7 Emergency Helpline</p>
                  <p className="text-2xl font-bold">1-800-BLOOD-HELP</p>
                </div>
              </div>
              <div className="text-center md:text-right">
                <p className="text-lg font-medium">
                  Need blood urgently? Contact us anytime!
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-card border-t py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BloodMitraLogo size={24} />
                <span className="text-lg font-bold">BloodMitra</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Connecting blood donors and receivers to save lives through our smart matching platform.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">How It Works</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">For Hospitals</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">FAQs</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  1-800-BLOOD-HELP
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  support@bloodmitra.com
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Available Nationwide
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Get Started</h4>
              <Button asChild className="w-full" data-testid="button-footer-signup">
                <a href="/auth">
                  Join as Donor
                </a>
              </Button>
            </div>
          </div>

          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} BloodMitra. All rights reserved. Saving lives, one drop at a time.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
