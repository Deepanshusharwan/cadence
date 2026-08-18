// Themes Clerk's prebuilt <SignIn>/<SignUp> widgets to match the app's own
// design system (notion-web-design skill: warm paper canvas, single
// notion-blue accent, hairline borders, no shadows) instead of Clerk's
// default look. Untyped (rather than importing `Appearance` from
// `@clerk/types`, which pnpm's strict node_modules isolation doesn't expose
// for direct import here) — `<SignIn>`/`<SignUp>` still structurally
// type-check this object against their real `appearance` prop.
export const clerkAppearance = {
  variables: {
    colorPrimary: "#0075de",
    colorBackground: "#ffffff",
    colorText: "#000000",
    colorTextSecondary: "#615d59",
    colorInputBackground: "#ffffff",
    colorInputText: "#000000",
    fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
    borderRadius: "8px",
  },
  elements: {
    card: "shadow-none border border-black/8 rounded-xl",
    headerTitle: "text-black",
    headerSubtitle: "text-[#615d59]",
    formButtonPrimary:
      "bg-[#0075de] hover:opacity-90 text-white text-sm font-medium normal-case shadow-none",
    footerActionLink: "text-[#0075de] hover:opacity-90",
    formFieldInput: "border border-black/12 focus:border-[#0075de]",
    dividerLine: "bg-black/8",
    socialButtonsBlockButton: "border border-black/12 hover:bg-black/5",
  },
};
