import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Lock } from "lucide-react";
import loginIllustration from "@/assets/login-illustration.png";
import vayucastLogo from "@/assets/vayucast-logo.png";
import { useState } from "react";
import { auth } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { toast } from "sonner";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setIsLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Successfully logged in!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to log in");
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Left - Illustration */}
      <div className="hidden w-full flex-col bg-hero-gradient p-8 lg:flex lg:w-1/2 lg:p-12">
        <h2 className="font-display text-2xl font-bold text-primary lg:text-3xl">
          Welcome to VayuCast
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          AI-powered air quality monitoring and prediction system.
        </p>
        <div className="flex flex-1 items-center justify-center">
          <img
            src={loginIllustration}
            alt="Login illustration"
            className="w-full max-w-sm lg:max-w-md"
          />
        </div>
      </div>

      {/* Right - Login Form */}
      <div className="flex w-full flex-1 flex-col items-center justify-center px-6 py-12 sm:px-8 lg:w-1/2">
        <Link to="/" className="mb-8 lg:mb-12">
          <img src={vayucastLogo} alt="VayuCAST" className="h-12 sm:h-14 md:h-16" />
        </Link>

        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
          <h1 className="mb-6 text-center font-display text-xl font-bold text-foreground sm:mb-8 sm:text-2xl">
            Login
          </h1>

          <form className="space-y-4 sm:space-y-5" onSubmit={handleLogin}>
            <div className="relative">
              <Input 
                type="email" 
                placeholder="Email Address" 
                className="pr-10" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Mail className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
            <div className="relative">
              <Input 
                type="password" 
                placeholder="Password" 
                className="pr-10" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
            <Button className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="font-medium text-primary hover:underline">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
