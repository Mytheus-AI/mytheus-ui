import type { Metadata } from "next";
import { LegalLayout, type LegalSection } from "@/components/company/LegalLayout";

export const metadata: Metadata = { title: "Privacy Policy | Mytheus" };

const SECTIONS: LegalSection[] = [
  {
    id: "overview",
    title: "Overview",
    body: (
      <p>
        Mytheus is its own meeting platform where every participant gets a Myte, a personal AI agent that captures notes,
        decisions, and actions and builds lasting meeting memory. This policy explains what information we collect,
        how we use it, and the choices you have. We designed Mytheus so that you own your meeting content and your
        memory, and so that nothing is saved to your memory unless you confirm it.
      </p>
    ),
  },
  {
    id: "information-we-collect",
    title: "Information we collect",
    body: (
      <ul>
        <li>
          <strong>Account information.</strong> Details you provide when you sign up, such as your name, email
          address, workspace name, and billing contact for paid plans.
        </li>
        <li>
          <strong>Meeting content you create in Mytheus.</strong> The meetings you run on Mytheus and the notes,
          decisions, actions, and memory your Myte helps you capture and that you choose to save.
        </li>
        <li>
          <strong>Usage and diagnostics.</strong> Technical information such as log data, device and browser
          details, and feature usage that helps us keep the service reliable and secure.
        </li>
      </ul>
    ),
  },
  {
    id: "how-we-use-information",
    title: "How we use information",
    body: (
      <ul>
        <li>To provide, maintain, and secure the Mytheus service.</li>
        <li>To power your Myte&apos;s suggested notes, decisions, actions, and the meeting memory you choose to keep.</li>
        <li>To improve the reliability and quality of the product, diagnose issues, and prevent abuse.</li>
      </ul>
    ),
  },
  {
    id: "your-agent-and-your-data",
    title: "Your Myte and your data",
    body: (
      <p>
        Your Myte processes your meetings to suggest notes, decisions, and actions in the moment. Nothing is written
        to your memory until you confirm it: your Myte never persists a decision or action silently. You own your
        meeting content and memory, and you can export or delete it at any time.
      </p>
    ),
  },
  {
    id: "how-we-share-information",
    title: "How we share information",
    body: (
      <ul>
        <li>
          <strong>Service providers and subprocessors.</strong> We share data only with vetted providers (for
          example, hosting and infrastructure) under contracts that require them to protect it and use it solely to
          provide services to us.
        </li>
        <li>
          <strong>We never sell personal data.</strong> Your information is not a product we sell or rent to anyone.
        </li>
        <li>
          <strong>No third-party meeting integrations.</strong> Mytheus is its own platform; we do not connect to or
          share your data with outside meeting, chat, or task tools.
        </li>
      </ul>
    ),
  },
  {
    id: "data-retention",
    title: "Data retention",
    body: (
      <p>
        We retain account and meeting information for as long as your account is active or as needed to provide the
        service. When you delete content or close your account, we delete or de-identify the associated data within a
        reasonable period, except where we must retain it to meet legal, security, or billing obligations.
      </p>
    ),
  },
  {
    id: "security",
    title: "Security",
    body: (
      <p>
        We protect your data using practices such as encryption in transit and at rest, tenant isolation between
        workspaces, and strict access controls limiting who can reach your content. No system is perfectly secure,
        but we work continuously to safeguard your information.
      </p>
    ),
  },
  {
    id: "your-rights-and-choices",
    title: "Your rights and choices",
    body: (
      <ul>
        <li>
          <strong>Access.</strong> You can review the account and meeting information associated with your
          workspace.
        </li>
        <li>
          <strong>Export.</strong> You can export your meeting content and memory in a portable format.
        </li>
        <li>
          <strong>Deletion.</strong> You can delete specific content or request deletion of your account and
          associated data.
        </li>
      </ul>
    ),
  },
  {
    id: "childrens-privacy",
    title: "Children's privacy",
    body: (
      <p>
        Mytheus is intended for use by adults in a professional setting. It is not directed to children, and we do
        not knowingly collect personal information from anyone under the age required by applicable law. If we learn
        we have done so, we will delete it.
      </p>
    ),
  },
  {
    id: "international-data-transfers",
    title: "International data transfers",
    body: (
      <p>
        We may process and store information in countries other than where you are located. Where required, we use
        appropriate safeguards to protect your information when it is transferred across borders.
      </p>
    ),
  },
  {
    id: "changes-to-this-policy",
    title: "Changes to this policy",
    body: (
      <p>
        We may update this policy from time to time. When we make material changes, we will update the date above
        and, where appropriate, notify you within the product or by email.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <p>
        Questions about this policy or your data? Reach us at <a href="mailto:privacy@reprise.ai">privacy@reprise.ai</a>.
      </p>
    ),
  },
];

export default function Page() {
  return <LegalLayout title="Privacy Policy" updated="June 2026" sections={SECTIONS} />;
}
