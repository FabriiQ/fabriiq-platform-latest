'use client'

import { useState, useEffect } from "react";
import { Button } from "../atoms/button";
import { Input } from "../atoms/input";
import { Eye, X, User, GraduationCap, School, Home } from "lucide-react";
import Link from "next/link";
import { logger } from "@/server/api/utils/logger";
import { logLoginPerformance } from "@/utils/performance-monitor";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

interface LoginFormProps {
  callbackUrl?: string;
}

export function LoginForm({ callbackUrl }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showDemoAccounts, setShowDemoAccounts] = useState(true);
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [directLoginTargetUrl, setDirectLoginTargetUrl] = useState<string | null>(null);
  const pathname = usePathname();

  // Check if we're coming from a direct-login callback URL
  useEffect(() => {
    if (callbackUrl && callbackUrl.startsWith('/direct-login')) {
      try {
        // Extract the parameters from the callback URL
        const decodedCallbackUrl = decodeURIComponent(callbackUrl);
        const urlParams = new URLSearchParams(decodedCallbackUrl.split('?')[1]);

        const urlUsername = urlParams.get('username');
        const urlPassword = urlParams.get('password');
        let urlTargetUrl = urlParams.get('targetUrl');

        // If targetUrl is encoded again, decode it
        if (urlTargetUrl && urlTargetUrl.startsWith('%2F')) {
          urlTargetUrl = decodeURIComponent(urlTargetUrl);
        }

        console.log('[LOGIN-FORM] Extracted direct-login parameters', {
          username: urlUsername,
          hasPassword: !!urlPassword,
          targetUrl: urlTargetUrl
        });

        // Pre-fill the form with the extracted parameters
        if (urlUsername) setUsername(urlUsername);
        if (urlPassword) setPassword(urlPassword);
        if (urlTargetUrl) setDirectLoginTargetUrl(urlTargetUrl);

        // If we have all parameters, submit the form automatically
        if (urlUsername && urlPassword && urlTargetUrl) {
          console.log('[LOGIN-FORM] Auto-submitting form with direct-login parameters');
          // Use setTimeout to ensure the state is updated before submitting
          setTimeout(() => {
            const form = document.querySelector('form');
            if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          }, 100);
        }
      } catch (error) {
        console.error('[LOGIN-FORM] Error processing direct-login callback URL', error);
      }
    }
  }, [callbackUrl]);

  // Extract institution ID from URL path
  useEffect(() => {
    if (pathname) {
      const pathParts = pathname.split('/');
      if (pathParts.length > 1 && pathParts[1]) {
        // Check if the first path segment is a valid institution ID
        // This is a simplified check - in a real app, you'd validate against a list of valid institutions
        const potentialInstitutionId = pathParts[1];
        if (potentialInstitutionId && potentialInstitutionId !== 'login' && potentialInstitutionId !== 'api' && potentialInstitutionId !== '_next') {
          setInstitutionId(potentialInstitutionId);
        }
      }
    }
  }, [pathname]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Prevent duplicate submissions
    if (isLoading) return;

    setError("");
    setIsLoading(true);

    const startTime = performance.now();

    try {
      // Determine target URL based on username (for demo accounts)
      let targetUrl = directLoginTargetUrl || callbackUrl;

      if (!targetUrl) {
        // Map demo usernames directly to role-specific URLs
        const roleUrls: Record<string, string> = {
          "sys_admin": "/admin/system",
          "michael_smith": "/admin/campus",
          "sarah_williams": "/admin/campus",
          "alex_johnson": "/admin/coordinator",
          "robert_brown": "/teacher/dashboard",
          "jennifer_davis": "/teacher/dashboard",
          "james_anderson": "/teacher/dashboard",
          "john_smith": "/student/classes",
          "emily_johnson": "/student/classes"
        };

        targetUrl = roleUrls[username] || "/dashboard";
      }

      console.log('[LOGIN-FORM] Direct target URL', { username, targetUrl });

      const { signIn } = await import('next-auth/react');

      // Add timeout to prevent hanging requests
      const signInPromise = signIn('credentials', {
        username,
        password,
        redirect: true,
        callbackUrl: targetUrl
      });

      // Set a 30-second timeout for login
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Login timeout - please try again')), 30000);
      });

      const result = await Promise.race([signInPromise, timeoutPromise]) as any;

      if (result?.error) {
        // Log failed login performance
        logLoginPerformance({
          username,
          startTime,
          endTime: performance.now(),
          targetUrl,
          success: false,
          error: result.error
        });

        setError(result.error || 'Authentication failed');
        setIsLoading(false);
      } else {
        // Log successful login performance
        logLoginPerformance({
          username,
          startTime,
          endTime: performance.now(),
          targetUrl,
          success: true
        });
      }
    } catch (error) {
      // Log error login performance
      logLoginPerformance({
        username,
        startTime,
        endTime: performance.now(),
        targetUrl: directLoginTargetUrl || callbackUrl || "/dashboard",
        success: false,
        error: String(error)
      });

      console.error("Login error:", error);
      setError("An error occurred during login. Please check your network connection and try again.");
      logger.error("[AUTH] Login error", { error });
      setIsLoading(false);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  // Function to fill in credentials for demo accounts
  const fillCredentials = (username: string) => {
    setUsername(username);
    setPassword("Password123!");
  };

  // Function to fill credentials and submit the form
  const loginWithDemoAccount = async (username: string) => {
    // Prevent duplicate submissions
    if (isLoading) return;

    setUsername(username);
    setPassword("Password123!");
    setIsLoading(true);

    const startTime = performance.now();

    try {
      // Prepare the target URL with institution context
      let targetUrl = directLoginTargetUrl || callbackUrl;

      // If no targetUrl is provided, determine the appropriate dashboard URL
      if (!targetUrl) {
        // Map demo usernames directly to role-specific URLs
        const roleUrls: Record<string, string> = {
          "sys_admin": "/admin/system",
          "michael_smith": "/admin/campus",
          "sarah_williams": "/admin/campus",
          "alex_johnson": "/admin/coordinator",
          "robert_brown": "/teacher/dashboard",
          "jennifer_davis": "/teacher/dashboard",
          "james_anderson": "/teacher/dashboard",
          "john_smith": "/student/classes",
          "emily_johnson": "/student/classes"
        };

        targetUrl = roleUrls[username] || "/dashboard";
      }

      console.log(`[AUTH] Demo login for ${username}, redirecting to ${targetUrl}`);

      const { signIn } = await import('next-auth/react');

      // Add timeout to prevent hanging requests
      const signInPromise = signIn('credentials', {
        username,
        password: "Password123!",
        redirect: true,
        callbackUrl: targetUrl
      });

      // Set a 30-second timeout for login
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Login timeout - please try again')), 30000);
      });

      const result = await Promise.race([signInPromise, timeoutPromise]) as any;

      // Log performance for demo login
      logLoginPerformance({
        username,
        startTime,
        endTime: performance.now(),
        targetUrl,
        success: !result?.error
      });

      if (result?.error) {
        setError(result.error || 'Authentication failed');
      }

      setIsLoading(false);
    } catch (error) {
      // Log error performance
      logLoginPerformance({
        username,
        startTime,
        endTime: performance.now(),
        targetUrl: directLoginTargetUrl || callbackUrl || "/dashboard",
        success: false,
        error: String(error)
      });

      console.error('[LOGIN-FORM] Demo login error:', error);
      setError('An error occurred during login');
      setIsLoading(false);
    }
  };

  // Demo account button component
  const DemoAccountButton = ({
    label,
    username,
    onClick,
    className
  }: {
    label: string;
    username: string;
    onClick: () => void;
    className?: string;
  }) => {
    return (
      <div className={cn("flex flex-col gap-1", className)}>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            "text-left px-3 py-2 rounded border transition-colors",
            "flex flex-col text-xs w-full",
            "border-muted-foreground/20 hover:bg-primary/10 hover:border-primary/30"
          )}
        >
          <div className="flex justify-between items-center">
            <span className="font-medium">{label}</span>
          </div>
          <span className="text-muted-foreground text-[10px]">@{username}</span>
        </button>
        <button
          type="button"
          onClick={() => loginWithDemoAccount(username)}
          className="text-[10px] py-1 px-2 bg-primary/10 hover:bg-primary/20 text-primary rounded transition-colors w-full"
        >
          Sign in as {label}
        </button>
      </div>
    );
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              className="w-full"
              disabled={isLoading}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <Link href="/forgot-password" className="text-sm text-primary hover:text-primary-dark">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full pr-10"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={toggleShowPassword}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500"
                tabIndex={-1}
              >
                {showPassword ? <X size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
        </div>
        {error && (
          <div className="text-sm text-red-500 mt-2">
            {error}
          </div>
        )}
      </form>

      <div className="mt-6 border-t pt-4">
        <Button
          variant="ghost"
          className="text-sm text-muted-foreground w-full"
          onClick={() => setShowDemoAccounts(!showDemoAccounts)}
        >
          {showDemoAccounts ? "Hide Demo Accounts" : "Show Demo Accounts"}
        </Button>

        {showDemoAccounts && (
          <div className="mt-2 text-xs space-y-4 bg-muted p-4 rounded">
            <div className="text-center mb-3">
              <p className="text-sm font-medium">Demo Accounts</p>
              <p className="text-xs text-muted-foreground">Click to fill credentials or sign in directly</p>
            </div>

            {/* System Level Accounts */}
            <div>
              <div className="flex items-center gap-1 mb-2">
                <User className="h-4 w-4 text-primary" />
                <p className="font-semibold text-sm text-primary">System Level:</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <DemoAccountButton
                  label="System Admin"
                  username="sys_admin"
                  onClick={() => fillCredentials("sys_admin")}
                />
                <DemoAccountButton
                  label="Program Coordinator"
                  username="alex_johnson"
                  onClick={() => fillCredentials("alex_johnson")}
                />
              </div>
            </div>

            {/* Campus Level Accounts */}
            <div>
              <div className="flex items-center gap-1 mb-2">
                <Home className="h-4 w-4 text-primary" />
                <p className="font-semibold text-sm text-primary">Campus Level:</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <DemoAccountButton
                  label="Boys Campus Admin"
                  username="michael_smith"
                  onClick={() => fillCredentials("michael_smith")}
                />
                <DemoAccountButton
                  label="Girls Campus Admin"
                  username="sarah_williams"
                  onClick={() => fillCredentials("sarah_williams")}
                />
              </div>
            </div>

            {/* Teacher Accounts */}
            <div>
              <div className="flex items-center gap-1 mb-2">
                <School className="h-4 w-4 text-primary" />
                <p className="font-semibold text-sm text-primary">Teacher Accounts:</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <DemoAccountButton
                  label="Math Teacher (Boys)"
                  username="robert_brown"
                  onClick={() => fillCredentials("robert_brown")}
                />
                <DemoAccountButton
                  label="Math Teacher (Girls)"
                  username="jennifer_davis"
                  onClick={() => fillCredentials("jennifer_davis")}
                />
                <DemoAccountButton
                  label="Science Teacher"
                  username="james_anderson"
                  onClick={() => fillCredentials("james_anderson")}
                  className="col-span-2"
                />
              </div>
            </div>

            {/* Student Accounts */}
            <div>
              <div className="flex items-center gap-1 mb-2">
                <GraduationCap className="h-4 w-4 text-primary" />
                <p className="font-semibold text-sm text-primary">Student Accounts:</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <DemoAccountButton
                  label="Boy Student"
                  username="john_smith"
                  onClick={() => fillCredentials("john_smith")}
                />
                <DemoAccountButton
                  label="Girl Student"
                  username="emily_johnson"
                  onClick={() => fillCredentials("emily_johnson")}
                />
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground border-t pt-2 text-center">
              <p>All demo accounts use password: <strong>Password123!</strong></p>
              <p>These accounts are for demonstration purposes only</p>
              <div className="mt-2 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[10px] h-6 px-2"
                  onClick={() => setShowDemoAccounts(false)}
                >
                  Hide Demo Accounts
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}