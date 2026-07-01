import type { Metadata } from "next";
import { PageShell } from "@/components/marketing/PageShell";
import { PageHero } from "@/components/marketing/PageHero";
import { Prose } from "@/components/marketing/Prose";

export const metadata: Metadata = { title: "Privacy Policy — Mytheus" };

export default function Page() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Legal"
        title="Privacy Policy"
        blurb="Last updated: June 2026"
      />
      <section className="mx-auto px-6 py-16 sm:px-8 sm:py-20">
        <Prose>
          <h2>Overview</h2>
          <p>
            Mytheus is its own meeting platform where every participant gets a
            personal AI agent that captures notes, decisions, and actions and
            builds lasting meeting memory. This policy explains what information
            we collect, how we use it, and the choices you have. We designed
            Mytheus so that you own your meeting content and your memory, and so
            that nothing is saved to your memory unless you confirm it.
          </p>

          <h2>Information we collect</h2>
          <ul>
            <li>
              <strong>Account information.</strong> Details you provide when you
              sign up, such as your name, email address, workspace name, and
              billing contact for paid plans.
            </li>
            <li>
              <strong>Meeting content you create in Mytheus.</strong> The
              meetings you run on Mytheus and the notes, decisions, actions, and
              memory your agent helps you capture and that you choose to save.
            </li>
            <li>
              <strong>Usage and diagnostics.</strong> Technical information such
              as log data, device and browser details, and feature usage that
              helps us keep the service reliable and secure.
            </li>
          </ul>

          <h2>How we use information</h2>
          <ul>
            <li>To provide, maintain, and secure the Mytheus service.</li>
            <li>
              To power your agent&apos;s suggested notes, decisions, actions, and
              the meeting memory you choose to keep.
            </li>
            <li>
              To improve the reliability and quality of the product, diagnose
              issues, and prevent abuse.
            </li>
          </ul>

          <h2>Your agent and your data</h2>
          <p>
            Your agent processes your meetings to suggest notes, decisions, and
            actions in the moment. Nothing is written to your memory until you
            confirm it &mdash; the agent never persists a decision or action
            silently. You own your meeting content and memory, and you can export
            or delete it at any time.
          </p>

          <h2>How we share information</h2>
          <ul>
            <li>
              <strong>Service providers and subprocessors.</strong> We share data
              only with vetted providers (for example, hosting and
              infrastructure) under contracts that require them to protect it and
              use it solely to provide services to us.
            </li>
            <li>
              <strong>We never sell personal data.</strong> Your information is
              not a product we sell or rent to anyone.
            </li>
            <li>
              <strong>No third-party meeting integrations.</strong> Mytheus is
              its own platform; we do not connect to or share your data with
              outside meeting, chat, or task tools.
            </li>
          </ul>

          <h2>Data retention</h2>
          <p>
            We retain account and meeting information for as long as your account
            is active or as needed to provide the service. When you delete
            content or close your account, we delete or de-identify the
            associated data within a reasonable period, except where we must
            retain it to meet legal, security, or billing obligations.
          </p>

          <h2>Security</h2>
          <p>
            We protect your data using practices such as encryption in transit
            and at rest, tenant isolation between workspaces, and strict access
            controls limiting who can reach your content. No system is perfectly
            secure, but we work continuously to safeguard your information.
          </p>

          <h2>Your rights &amp; choices</h2>
          <ul>
            <li>
              <strong>Access.</strong> You can review the account and meeting
              information associated with your workspace.
            </li>
            <li>
              <strong>Export.</strong> You can export your meeting content and
              memory in a portable format.
            </li>
            <li>
              <strong>Deletion.</strong> You can delete specific content or
              request deletion of your account and associated data.
            </li>
          </ul>

          <h2>Children&apos;s privacy</h2>
          <p>
            Mytheus is intended for use by adults in a professional setting. It is
            not directed to children, and we do not knowingly collect personal
            information from anyone under the age required by applicable law. If
            we learn we have done so, we will delete it.
          </p>

          <h2>International data transfers</h2>
          <p>
            We may process and store information in countries other than where you
            are located. Where required, we use appropriate safeguards to protect
            your information when it is transferred across borders.
          </p>

          <h2>Changes to this policy</h2>
          <p>
            We may update this policy from time to time. When we make material
            changes, we will update the date above and, where appropriate, notify
            you within the product or by email.
          </p>

          <h2>Contact</h2>
          <p>
            Questions about this policy or your data? Reach us at{" "}
            <a href="mailto:privacy@reprise.ai">privacy@reprise.ai</a>.
          </p>
        </Prose>
      </section>
    </PageShell>
  );
}
