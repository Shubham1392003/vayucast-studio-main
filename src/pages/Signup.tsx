import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import signupIllustration from "@/assets/signup-illustration.png";
import vayucastLogo from "@/assets/vayucast-logo.png";
import { useState } from "react";
import { auth } from "@/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { toast } from "sonner";

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    try {
      setIsLoading(true);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      toast.success("Account created successfully!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Left - Illustration */}
      <div className="hidden w-full flex-col p-8 lg:flex lg:w-1/2 lg:p-12">
        <Link to="/">
          <img src={vayucastLogo} alt="VayuCAST" className="h-12 sm:h-14 md:h-16" />
        </Link>
        <div className="flex flex-1 items-center justify-center">
          <img
            src={signupIllustration}
            alt="Signup illustration"
            className="w-full max-w-sm lg:max-w-md"
          />
        </div>
      </div>

      {/* Right - Signup Form */}
      <div className="flex w-full flex-1 flex-col items-center justify-center px-6 py-12 sm:px-8 lg:w-1/2">
        {/* Show logo on mobile since left panel is hidden */}
        <Link to="/" className="mb-8 lg:hidden">
          <img src={vayucastLogo} alt="VayuCAST" className="h-12 sm:h-14" />
        </Link>

        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
          <h1 className="mb-6 text-center font-display text-xl font-bold italic text-foreground sm:mb-8 sm:text-2xl">
            Sign Up
          </h1>

          <form className="space-y-4 sm:space-y-5" onSubmit={handleSignup}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input 
                placeholder="Enter Name" 
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input 
                type="email" 
                placeholder="Enter Email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input 
                type="password" 
                placeholder="Enter Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Input 
                type="password" 
                placeholder="Confirm Password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <div className="flex justify-center pt-2">
              <Button size="lg" className="w-full px-10 sm:w-auto" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Account"}
              </Button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have account?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
