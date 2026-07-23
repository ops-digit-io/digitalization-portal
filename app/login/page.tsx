import Link from "next/link";
import { oidcEnabled } from "@/lib/auth/config";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  invalid_state: "The login response didn't match — please try again.",
  not_a_member: "Your account has no portal role. Ask an admin to add you to a DU-Portal-* group.",
  no_identity: "The identity provider returned no usable account identity.",
  auth_failed: "Sign-in could not be completed. Please try again.",
  provider_unreachable: "The identity provider could not be reached.",
};

export default function LoginPage({ searchParams }: { searchParams: { returnTo?: string; error?: string; signedout?: string } }) {
  const enabled = oidcEnabled();
  const returnTo = searchParams.returnTo?.startsWith("/") ? searchParams.returnTo : "/";
  const loginHref = `/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`;
  const error = searchParams.error ? ERRORS[searchParams.error] ?? "Sign-in failed." : null;

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4">
      <div className="mb-6 flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded bg-primary text-sm text-primary-foreground">DP</span>
        <span className="text-lg font-semibold">Digitalization Portal</span>
      </div>

      <Card className="p-6">
        <h1 className="text-base font-semibold">Sign in</h1>

        {searchParams.signedout && (
          <div className="mt-3 rounded-md border border-ok/40 bg-ok/5 px-3 py-2 text-xs text-muted-foreground">You've been signed out.</div>
        )}
        {error && (
          <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">{error}</div>
        )}

        {enabled ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">Use your corporate account. Roles and plant access come from your directory groups.</p>
            <a href={loginHref} className="mt-4 flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
              Sign in with corporate account →
            </a>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Single sign-on isn't configured on this deployment, so the portal runs on a demo session. Set{" "}
              <code className="rounded border px-1">OIDC_ISSUER</code>, <code className="rounded border px-1">OIDC_CLIENT_ID</code>,{" "}
              <code className="rounded border px-1">OIDC_CLIENT_SECRET</code>, and <code className="rounded border px-1">AUTH_SECRET</code> to enable real login.
            </p>
            <Link href="/" className="mt-4 flex w-full items-center justify-center rounded-md border px-4 py-2.5 text-sm font-medium hover:border-foreground/40">
              Continue as demo user →
            </Link>
          </>
        )}
      </Card>

      <p className="mt-4 text-center text-xs text-muted-foreground">Credentials are handled server-side and never reach the browser.</p>
    </main>
  );
}
