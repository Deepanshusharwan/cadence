import { SignUp } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { AuthShell } from "@/components/auth-shell";

export default function SignUpPage() {
  return (
    <AuthShell variant="signUp">
      <SignUp
        appearance={clerkAppearance}
        signInUrl="/sign-in"
        fallbackRedirectUrl="/dashboard"
        signInFallbackRedirectUrl="/dashboard"
      />
    </AuthShell>
  );
}
