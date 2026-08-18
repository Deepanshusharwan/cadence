import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// The onboarding wizard and the app itself both require a signed-in user —
// Cadence's own onboarding (categories, anchors, ...) is separate from
// Clerk's identity, but there's no reason to let someone through /setup
// without an account to attach that data to.
//
// Named/exported as `proxy` (not `middleware`) — this Next.js version
// deprecated the `middleware.ts` file convention in favor of `proxy.ts`
// (same underlying mechanism, new name); see
// node_modules/next/dist/docs/.../file-conventions/proxy.md.
const isProtectedRoute = createRouteMatcher(["/setup(.*)", "/dashboard(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
