import Link from "next/link";
import { oidcEnabled } from "@/lib/auth/config";
import { getT } from "@/lib/i18n-server";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function LoginPage({ searchParams }: { searchParams: { returnTo?: string; error?: string; signedout?: string } }) {
  const t = getT();
  const errors: Record<string, string> = {
    invalid_state: t("login.error.invalidState", "The login response didn't match — please try again."),
    not_a_member: t("login.error.notAMember", "Your account has no portal role. Ask an admin to add you to a DU-Portal-* group."),
    no_identity: t("login.error.noIdentity", "The identity provider returned no usable account identity."),
    auth_failed: t("login.error.authFailed", "Sign-in could not be completed. Please try again."),
    provider_unreachable: t("login.error.providerUnreachable", "The identity provider could not be reached."),
  };
  const enabled = oidcEnabled();
  const returnTo = searchParams.returnTo?.startsWith("/") ? searchParams.returnTo : "/";
  const loginHref = `/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`;
  const error = searchParams.error ? errors[searchParams.error] ?? t("login.error.generic", "Sign-in failed.") : null;

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4">
      <div className="mb-6 flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded bg-primary text-sm text-primary-foreground">DP</span>
        <span className="text-lg font-semibold">Digitalization Portal</span>
      </div>

      <Card className="p-6">
        <h1 className="text-base font-semibold">{t("auth.signIn", "Sign in")}</h1>

        {searchParams.signedout && (
          <div className="mt-3 rounded-md border border-ok/40 bg-ok/5 px-3 py-2 text-xs text-muted-foreground">{t("login.signedOut", "You've been signed out.")}</div>
        )}
        {error && (
          <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">{error}</div>
        )}

        {enabled ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">{t("login.corporateHint", "Use your corporate account. Roles and plant access come from your directory groups.")}</p>
            <a href={loginHref} className="mt-4 flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
              {t("login.signInCorporate", "Sign in with corporate account")} →
            </a>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("login.demoHint1", "Single sign-on isn't configured on this deployment, so the portal runs on a demo session. Set")}{" "}
              <code className="rounded border px-1">OIDC_ISSUER</code>, <code className="rounded border px-1">OIDC_CLIENT_ID</code>,{" "}
              <code className="rounded border px-1">OIDC_CLIENT_SECRET</code>, and <code className="rounded border px-1">AUTH_SECRET</code> {t("login.demoHint2", "to enable real login.")}
            </p>
            <Link href="/" className="mt-4 flex w-full items-center justify-center rounded-md border px-4 py-2.5 text-sm font-medium hover:border-foreground/40">
              {t("login.continueDemo", "Continue as demo user")} →
            </Link>
          </>
        )}
      </Card>

      <p className="mt-4 text-center text-xs text-muted-foreground">{t("login.credentialsFooter", "Credentials are handled server-side and never reach the browser.")}</p>
    </main>
  );
}
