import { SignIn } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { AuthShell } from "@/components/auth-shell";

export default function SignInPage() {
  return (
    <AuthShell variant="signIn">
      <SignIn
        appearance={clerkAppearance}
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/dashboard"
        signUpFallbackRedirectUrl="/dashboard"
      />
    </AuthShell>
  );
}
