import { Link } from "react-router-dom";
import rolloutLogo from "@/assets/rollout-logo.png";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-6 py-4">
        <Link to="/">
          <img src={rolloutLogo} alt="Rollout" className="h-10" />
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 prose prose-neutral dark:prose-invert">
        <h1>Terms of Service</h1>
        <p className="text-muted-foreground text-sm">Last updated: March 18, 2026</p>

        <p>
          These Terms of Service ("Terms") govern your access to and use of the Rollout
          platform at <strong>app.rollout.cc</strong> (the "Service"), operated by Rollout
          ("we," "our," or "us"). By using the Service, you agree to these Terms.
        </p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By creating an account or using the Service, you agree to be bound by these Terms
          and our <Link to="/privacy">Privacy Policy</Link>. If you do not agree, do not use
          the Service.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          Rollout is a management platform for music labels, managers, and artists. The
          Service provides tools for roster management, task tracking, financial management,
          split sheets, distribution coordination, A&amp;R pipeline management, and related
          workflows.
        </p>

        <h2>3. Account Responsibilities</h2>
        <ul>
          <li>You must provide accurate and complete registration information.</li>
          <li>You are responsible for maintaining the security of your account credentials.</li>
          <li>You are responsible for all activities that occur under your account.</li>
          <li>You must notify us immediately of any unauthorized use of your account.</li>
        </ul>

        <h2>4. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for any unlawful purpose</li>
          <li>Upload content that infringes on any third party's intellectual property rights</li>
          <li>Attempt to gain unauthorized access to any part of the Service</li>
          <li>Interfere with or disrupt the integrity or performance of the Service</li>
          <li>Use automated means to access the Service without our written permission</li>
        </ul>

        <h2>5. Intellectual Property</h2>
        <p>
          The Service, including its design, features, and content (excluding user-generated
          content), is owned by Rollout and protected by intellectual property laws. You
          retain ownership of all content you create or upload through the Service.
        </p>

        <h2>6. Payment &amp; Billing</h2>
        <p>
          Certain features of the Service require a paid subscription. By subscribing, you
          agree to pay the applicable fees. All fees are non-refundable except as required by
          law. We may change pricing with 30 days' notice.
        </p>

        <h2>7. Free Trial</h2>
        <p>
          We may offer a free trial period. At the end of the trial, your account will
          require a paid subscription to continue using premium features. No credit card is
          required to start a trial.
        </p>

        <h2>8. Termination</h2>
        <p>
          You may terminate your account at any time. We may suspend or terminate your
          account if you violate these Terms. Upon termination, your right to use the Service
          ceases immediately. We may retain certain data as required by law.
        </p>

        <h2>9. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Rollout shall not be liable for any
          indirect, incidental, special, consequential, or punitive damages, or any loss of
          profits or revenues, whether incurred directly or indirectly, or any loss of data,
          use, goodwill, or other intangible losses resulting from your use of the Service.
        </p>

        <h2>10. Disclaimer of Warranties</h2>
        <p>
          The Service is provided "as is" and "as available" without warranties of any kind,
          whether express or implied. We do not guarantee that the Service will be
          uninterrupted, secure, or error-free.
        </p>

        <h2>11. Indemnification</h2>
        <p>
          You agree to indemnify and hold harmless Rollout from any claims, damages, or
          expenses arising from your use of the Service or violation of these Terms.
        </p>

        <h2>12. Governing Law</h2>
        <p>
          These Terms shall be governed by and construed in accordance with the laws of the
          State of Delaware, United States, without regard to its conflict of law provisions.
        </p>

        <h2>13. Changes to Terms</h2>
        <p>
          We reserve the right to modify these Terms at any time. We will provide notice of
          material changes by posting the updated Terms on this page. Your continued use of
          the Service after changes constitutes acceptance of the modified Terms.
        </p>

        <h2>14. Contact Us</h2>
        <p>
          If you have questions about these Terms, please contact us at{" "}
          <a href="mailto:legal@rollout.cc">legal@rollout.cc</a>.
        </p>
      </main>

      <footer className="border-t border-border px-6 py-6 text-center text-sm text-muted-foreground">
        <Link to="/privacy" className="hover:text-foreground transition-colors">
          Privacy Policy
        </Link>
        <span className="mx-2">·</span>
        <span>© {new Date().getFullYear()} Rollout. All rights reserved.</span>
      </footer>
    </div>
  );
}
