import { Link } from "react-router-dom";
import rolloutLogo from "@/assets/rollout-logo.png";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-6 py-4">
        <Link to="/">
          <img src={rolloutLogo} alt="Rollout" className="h-10" />
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 prose prose-neutral dark:prose-invert">
        <h1>Privacy Policy</h1>
        <p className="text-muted-foreground text-sm">Last updated: March 18, 2026</p>

        <p>
          Rollout ("we," "our," or "us") operates the Rollout platform at{" "}
          <strong>app.rollout.cc</strong> (the "Service"). This Privacy Policy explains how we
          collect, use, disclose, and safeguard your information when you use our Service.
        </p>

        <h2>1. Information We Collect</h2>
        <h3>Account Information</h3>
        <p>
          When you create an account we collect your name, email address, and password. If you
          sign in via Google or Apple, we receive your name, email, and profile picture from
          those providers.
        </p>
        <h3>Usage Data</h3>
        <p>
          We automatically collect information about how you interact with the Service,
          including pages visited, features used, browser type, device information, and IP
          address.
        </p>
        <h3>Content You Provide</h3>
        <p>
          This includes artist rosters, financial data, tasks, notes, split sheets, and any
          other content you create or upload through the Service.
        </p>

        <h2>2. How We Use Your Information</h2>
        <ul>
          <li>To provide, maintain, and improve the Service</li>
          <li>To process transactions and send related information (e.g., invoices)</li>
          <li>To send administrative messages, updates, and security alerts</li>
          <li>To respond to your comments, questions, and support requests</li>
          <li>To monitor and analyze trends, usage, and activities</li>
          <li>To detect, investigate, and prevent fraudulent or unauthorized activity</li>
        </ul>

        <h2>3. Third-Party Services</h2>
        <p>We use the following third-party services that may receive your data:</p>
        <ul>
          <li><strong>Google OAuth</strong> — for authentication</li>
          <li><strong>Apple Sign-In</strong> — for authentication</li>
          <li><strong>Stripe</strong> — for payment processing</li>
          <li><strong>Spotify API</strong> — for artist data enrichment</li>
        </ul>
        <p>
          Each third-party service operates under its own privacy policy. We encourage you to
          review their policies.
        </p>

        <h2>4. Cookies &amp; Tracking</h2>
        <p>
          We use essential cookies to maintain your session and preferences. We do not use
          third-party advertising cookies.
        </p>

        <h2>5. Data Retention</h2>
        <p>
          We retain your account data for as long as your account is active. You may request
          deletion of your account and associated data at any time by contacting us.
        </p>

        <h2>6. Data Security</h2>
        <p>
          We implement industry-standard security measures including encryption in transit
          (TLS) and at rest. However, no method of transmission over the Internet is 100%
          secure.
        </p>

        <h2>7. Your Rights</h2>
        <p>Depending on your jurisdiction, you may have the right to:</p>
        <ul>
          <li>Access the personal data we hold about you</li>
          <li>Request correction or deletion of your data</li>
          <li>Object to or restrict processing of your data</li>
          <li>Request data portability</li>
        </ul>
        <p>
          To exercise any of these rights, contact us at{" "}
          <a href="mailto:privacy@rollout.cc">privacy@rollout.cc</a>.
        </p>

        <h2>8. Children's Privacy</h2>
        <p>
          The Service is not intended for individuals under 16. We do not knowingly collect
          personal information from children.
        </p>

        <h2>9. Data Access &amp; Ownership</h2>
        <p>
          When you become the owner of a team on Rollout, your data is exclusively yours.
          Rollout staff <strong>cannot</strong> access your account, team data, or any
          associated information without your explicit written consent.
        </p>
        <ul>
          <li>
            All ownership transfers are formally documented and require mutual acknowledgment
            from both parties
          </li>
          <li>
            If Rollout Support needs temporary access to your team for troubleshooting, a
            formal request is sent that you must approve. These sessions are time-limited
            (default 2 hours), logged with full timestamps, and you can revoke access at
            any time
          </li>
          <li>
            Support access sessions are automatically terminated upon expiry — no standing
            access is ever retained
          </li>
          <li>
            All access events (requests, approvals, sessions, revocations) are recorded in
            an immutable audit log
          </li>
        </ul>

        <h2>10. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of material
          changes by posting the updated policy on this page with a revised "Last updated"
          date.
        </p>

        <h2>11. Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy, please contact us at{" "}
          <a href="mailto:privacy@rollout.cc">privacy@rollout.cc</a>.
        </p>
      </main>

      <footer className="border-t border-border px-6 py-6 text-center text-sm text-muted-foreground">
        <Link to="/terms" className="hover:text-foreground transition-colors">
          Terms of Service
        </Link>
        <span className="mx-2">·</span>
        <span>© {new Date().getFullYear()} Rollout. All rights reserved.</span>
      </footer>
    </div>
  );
}
