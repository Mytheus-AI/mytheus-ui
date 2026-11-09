/**
 * The Mytheus versions of Clerk's auth emails (verification codes, sign-in links, invitations,
 * security notices). Clerk sends them; this file decides how they look and read.
 *
 *   node scripts/clerk-emails.mjs assets           # render the header art to public/email/*.png
 *   node scripts/clerk-emails.mjs build            # write emails/clerk/<slug>.html (committed)
 *   node scripts/clerk-emails.mjs preview <dir>    # render every email with sample data, plus an index
 *   node scripts/clerk-emails.mjs apply [slug...]  # PUT them to Clerk (needs CLERK_SECRET_KEY)
 *
 * WHY HERE AND NOT ONLY IN CLERK'S DASHBOARD. An email edited in the dashboard has no history and
 * no review. Keeping the source here means a change is a diff, and `apply` makes Clerk match it.
 * To undo, Clerk's dashboard has "Revert to default" per template, or re-apply an older commit.
 *
 * The bodies are Clerk's Handlebars: `{{var}}`, `{{#if var}}...{{else}}...{{/if}}`, and Clerk's
 * `escapeURIs` helper for user-written names (an org or passkey name could otherwise smuggle a
 * link into the email). Every template keeps the variables Clerk marks as required for it.
 *
 * Email clients are not browsers: layout is tables, styles are inline, the font falls back to
 * system sans where Geist cannot load (Gmail), and the images (the header art in
 * `scripts/clerk-email-art.mjs`) are PNGs served from the app at `/email/`. That means the
 * images must be DEPLOYED before `apply`: merge first, then apply. Copy rule: no em-dashes.
 */

import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "emails", "clerk");
const APP = "https://dashboard.mytheus.cloud";
import { ART_KINDS, artPage } from "./clerk-email-art.mjs";

const ASSETS = `${APP}/email`;

/* Tokens, copied from src/app/globals.css (an email cannot read CSS variables). */
const c = {
  page: "#f3f1ea", // --bg-2
  card: "#ffffff", // --surface
  soft: "#faf9f5", // --bg
  ink: "#1c1a15", // --ink
  display: "#26231d", // --ink-display, also --pill
  body: "#423e36", // --ink-2
  muted: "#6f6a5f", // --ink-3
  line: "#e7e2d6", // --line
  line2: "#d8d2c3", // --line-2
  signal: "#d97757", // --signal
  signalDeep: "#bd5d3a", // --signal-deep
  signalSoft: "#f5e5dc", // --signal-soft
};
const SANS = "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

/* ---------- building blocks ---------- */

const p = (html, { size = 15, line = 24, color = c.body, top = 16 } = {}) =>
  `<p style="margin:${top}px 0 0;font-family:${SANS};font-size:${size}px;line-height:${line}px;color:${color};">${html}</p>`;

const muted = (html, top = 16) => p(html, { size: 13.5, line: 21, color: c.muted, top });

const greeting = () => `{{#if greeting_name}}${p("Hi {{greeting_name}},", { top: 20 })}{{/if}}`;

const button = (href, label) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0;">
  <tr>
    <td bgcolor="${c.signal}" style="border-radius:999px;background-color:${c.signal};">
      <a href="${href}" target="_blank" style="display:inline-block;padding:14px 26px;font-family:${SANS};font-size:15px;line-height:20px;font-weight:600;color:${c.ink};text-decoration:none;border-radius:999px;">${label}&nbsp;&nbsp;&rarr;</a>
    </td>
  </tr>
</table>`;

const fallbackLink = (href) =>
  muted(
    `Button not working? Paste this link into your browser:<br><a href="${href}" target="_blank" style="color:${c.signalDeep};text-decoration:underline;word-break:break-all;">${href}</a>`,
    20,
  );

/** The code, set like a live caption: a labelled strip over big mono digits. */
const code = (value) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0;border-collapse:separate;">
  <tr>
    <td bgcolor="${c.ink}" style="padding:14px 20px 0;background-color:${c.ink};border-radius:18px 18px 0 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="font-family:${MONO};font-size:10.5px;line-height:14px;font-weight:600;letter-spacing:2px;color:${c.signal};">&#9679;&nbsp; YOUR CODE</td>
        <td align="right" style="font-family:${MONO};font-size:10.5px;line-height:14px;letter-spacing:1.6px;color:#8f897c;">ONE USE ONLY</td>
      </tr></table>
    </td>
  </tr>
  <tr>
    <td align="center" bgcolor="${c.ink}" style="padding:14px 16px 24px;background-color:${c.ink};border-radius:0 0 18px 18px;">
      <span class="code" style="font-family:${MONO};font-size:40px;line-height:48px;font-weight:600;letter-spacing:12px;color:${c.soft};">${value}</span>
    </td>
  </tr>
</table>`;

/** Label and value rows, set like a transcript log. Rows are [label, value, ifVar?]. */
const details = (rows) => {
  const tr = ([label, value, ifVar], i) => {
    const rule = i === 0 ? "" : `border-top:1px dashed ${c.line2};`;
    const row = `
  <tr>
    <td valign="top" style="padding:11px 16px 11px 20px;width:96px;${rule}font-family:${MONO};font-size:10.5px;line-height:20px;letter-spacing:1.6px;text-transform:uppercase;color:${c.muted};white-space:nowrap;">${label}</td>
    <td valign="top" style="padding:11px 20px 11px 0;${rule}font-family:${SANS};font-size:14px;line-height:20px;font-weight:600;color:${c.ink};">${value}</td>
  </tr>`;
    return ifVar ? `{{#if ${ifVar}}}${row}{{/if}}` : row;
  };
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${c.soft}" style="margin:24px 0 0;background-color:${c.soft};border:1px solid ${c.line};border-left:3px solid ${c.signal};border-radius:4px 14px 14px 4px;border-collapse:separate;">${rows.map(tr).join("")}
</table>`;
};

/** What the product does, as three numbered agent notes. */
const perks = (items) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0;">${items
  .map(
    ([title, text], i) => `
  <tr>
    <td valign="top" style="padding:${i ? 14 : 0}px 14px 0 0;width:28px;font-family:${MONO};font-size:12px;line-height:22px;font-weight:600;color:${c.signal};">0${i + 1}</td>
    <td valign="top" style="padding:${i ? 14 : 0}px 0 0;font-family:${SANS};font-size:14.5px;line-height:22px;color:${c.body};"><b style="color:${c.ink};">${title}</b> ${text}</td>
  </tr>`,
  )
  .join("")}
</table>`;

/** The "didn't do this?" note, set like an agent card: coral priority strip, mono label. */
const aside = (title, html) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${c.signalSoft}" style="margin:32px 0 0;background-color:${c.signalSoft};border-left:3px solid ${c.signal};border-radius:4px 14px 14px 4px;border-collapse:separate;">
  <tr>
    <td style="padding:16px 20px 18px;">
      <p style="margin:0;font-family:${MONO};font-size:10.5px;line-height:14px;font-weight:600;letter-spacing:2px;color:${c.signalDeep};">&#9679;&nbsp; AGENT NOTE</p>
      <p style="margin:8px 0 0;font-family:${SANS};font-size:14px;line-height:21px;font-weight:600;color:${c.ink};">${title}</p>
      <p style="margin:3px 0 0;font-family:${SANS};font-size:13.5px;line-height:21px;color:${c.body};">${html}</p>
    </td>
  </tr>
</table>`;

const requestedFrom =
  "{{#if requested_from}}It was requested from <b>{{requested_from}}</b>{{#if requested_at}} at <b>{{requested_at}}</b>{{/if}}. {{/if}}";

/* ---------- the shell every email shares ---------- */

function layout({ title, preheader, eyebrow, heading, content, why, art }) {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@500;600&display=swap" rel="stylesheet">
<style type="text/css">
  body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; }
  img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
  a { color: ${c.signalDeep}; }
  @media only screen and (max-width: 620px) {
    .outer { padding: 16px 10px 32px !important; }
    .card { padding: 28px 22px 26px !important; }
    .h1 { font-size: 26px !important; line-height: 31px !important; }
    .code { font-size: 30px !important; letter-spacing: 7px !important; }
  }
</style>
<!--[if mso]><style type="text/css">body, table, td, p, a, span { font-family: Arial, Helvetica, sans-serif !important; }</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${c.page};">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;">${preheader}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${c.page}" style="width:100%;background-color:${c.page};">
  <tr>
    <td align="center" class="outer" style="padding:36px 16px 48px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;border-collapse:separate;">
        <tr>
          <td bgcolor="${c.ink}" style="background-color:${c.ink};border-radius:24px 24px 0 0;line-height:0;font-size:0;">
            <a href="${APP}" target="_blank" style="text-decoration:none;"><img src="${ASSETS}/header-${art}.png" width="560" alt="Mytheus" style="display:block;width:100%;max-width:560px;height:auto;border-radius:24px 24px 0 0;color:${c.soft};font-family:${SANS};font-size:22px;font-weight:700;line-height:60px;text-align:left;"></a>
          </td>
        </tr>
        <tr>
          <td class="card" bgcolor="${c.card}" style="padding:36px 40px 36px;background-color:${c.card};border:1px solid ${c.line};border-top:0;border-radius:0 0 24px 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;"><tr>
              <td bgcolor="${c.signalSoft}" style="padding:5px 12px;background-color:${c.signalSoft};border-radius:999px;font-family:${MONO};font-size:10.5px;line-height:14px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:${c.signalDeep};">&#9679;&nbsp; ${eyebrow}</td>
            </tr></table>
            <h1 class="h1" style="margin:16px 0 0;font-family:${SANS};font-size:31px;line-height:36px;font-weight:600;letter-spacing:-1px;color:${c.display};">${heading}</h1>
            ${content}
          </td>
        </tr>
        <tr>
          <td style="padding:28px 12px 0;">
            <p style="margin:0;font-family:${SANS};font-size:19px;line-height:24px;font-weight:600;letter-spacing:-0.5px;color:${c.display};">Every meeting, on repeat.</p>
            <p style="margin:6px 0 0;font-family:${SANS};font-size:13px;line-height:20px;color:${c.muted};">A personal AI agent for everyone in the meeting: role-aware notes, questions in the moment, follow-ups that land.</p>
            <p style="margin:18px 0 0;font-family:${SANS};font-size:12px;line-height:18px;color:${c.muted};">${why}</p>
            <p style="margin:8px 0 0;font-family:${MONO};font-size:10.5px;line-height:16px;letter-spacing:1.4px;color:${c.muted};">
              &copy; {{current_year}} MYTHEUS &middot; <a href="${APP}" target="_blank" style="color:${c.muted};text-decoration:underline;">DASHBOARD.MYTHEUS.CLOUD</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>
`;
}

/* ---------- the emails ---------- */

const ACCOUNT = "You're getting this because it's about your Mytheus account.";
const SECURITY = "This is a security notice about your Mytheus account. We send these even if you've turned other emails off.";

const SIGN_IN_ASIDE = aside(
  "Didn't ask for this?",
  `${requestedFrom}If it wasn't you, ignore this email. Nothing changes without the code.`,
);
const LINK_ASIDE = aside(
  "Didn't ask for this?",
  `${requestedFrom}If it wasn't you, ignore this email. Nothing happens unless the link is opened.`,
);
const CHANGE_ASIDE = (what) =>
  aside(
    "Wasn't you?",
    `If you didn't ${what}, someone else may have access to your account. <a href="${APP}/sign-in" target="_blank" style="color:${c.signalDeep};">Sign in</a>, reset your password, and tell your workspace admin.`,
  );

const PRODUCT = perks([
  ["Notes tuned to your role.", "Your agent writes up what matters to you, not a generic summary."],
  ["Questions in the moment.", "It suggests what to ask while the conversation is still going."],
  ["Follow-ups that land.", "Decisions and action items are tracked until they're done."],
]);

export const templates = {
  verification_code: {
    name: "Verification code",
    art: "access",
    subject: "{{otp_code}} is your Mytheus code",
    title: "Your Mytheus code",
    preheader: "Enter {{otp_code}} in Mytheus to continue.",
    eyebrow: "Verify it's you",
    heading: "Here's your code",
    content: [
      p("Enter this code in Mytheus to continue. It works once and expires in a few minutes.", { top: 14 }),
      code("{{otp_code}}"),
      muted("Keep it to yourself. Mytheus will never ask you for this code."),
      SIGN_IN_ASIDE,
    ],
    why: ACCOUNT,
  },

  reset_password_code: {
    name: "Reset password code",
    art: "access",
    subject: "{{otp_code}} is your Mytheus password reset code",
    title: "Reset your Mytheus password",
    preheader: "Enter {{otp_code}} to choose a new password.",
    eyebrow: "Password reset",
    heading: "Reset your password",
    content: [
      p("Enter this code in Mytheus, then choose a new password.", { top: 14 }),
      code("{{otp_code}}"),
      muted("Keep it to yourself. Mytheus will never ask you for this code."),
      aside("Didn't ask for this?", `${requestedFrom}If it wasn't you, ignore this email. Your password stays as it is.`),
    ],
    why: ACCOUNT,
  },

  magic_link_sign_in: {
    name: "Email link, sign in",
    art: "access",
    subject: "Your Mytheus sign-in link",
    title: "Sign in to Mytheus",
    preheader: "One tap and you're in. The link expires in {{ttl_minutes}} minutes.",
    eyebrow: "Sign in",
    heading: "Sign in to Mytheus",
    content: [
      p("Use the button below to sign in. The link works once and expires in {{ttl_minutes}} minutes.", { top: 14 }),
      button("{{magic_link}}", "Sign in to Mytheus"),
      fallbackLink("{{magic_link}}"),
      LINK_ASIDE,
    ],
    why: ACCOUNT,
  },

  magic_link_sign_up: {
    name: "Email link, sign up",
    art: "invite",
    subject: "Finish creating your Mytheus account",
    title: "Confirm your email for Mytheus",
    preheader: "Confirm your email to finish setting up Mytheus.",
    eyebrow: "Welcome",
    heading: "Confirm your email",
    content: [
      p("You're one step from your own meeting agent. Confirm this address to finish creating your account. The link expires in {{ttl_minutes}} minutes.", { top: 14 }),
      PRODUCT,
      button("{{magic_link}}", "Create my account"),
      fallbackLink("{{magic_link}}"),
      LINK_ASIDE,
    ],
    why: "You're getting this because this address was used to sign up for Mytheus.",
  },

  magic_link_user_profile: {
    name: "Email link, verify email",
    art: "access",
    subject: "Verify your email for Mytheus",
    title: "Verify your email for Mytheus",
    preheader: "Confirm this address to add it to your Mytheus account.",
    eyebrow: "Verify email",
    heading: "Verify this address",
    content: [
      p("Confirm this address to add it to your Mytheus account. The link expires in {{ttl_minutes}} minutes.", { top: 14 }),
      button("{{magic_link}}", "Verify email"),
      fallbackLink("{{magic_link}}"),
      LINK_ASIDE,
    ],
    why: ACCOUNT,
  },

  invitation: {
    name: "Invitation",
    art: "invite",
    subject: "You're invited to Mytheus",
    title: "You're invited to Mytheus",
    preheader: "Every person in the meeting gets their own AI agent. Here's your seat.",
    eyebrow: "Invitation",
    heading: "You're invited to Mytheus",
    content: [
      p(
        "{{#if inviter_name}}{{escapeURIs inviter_name}} invited you{{else}}You've been invited{{/if}} to Mytheus, where everyone in a meeting gets their own AI agent: notes tuned to your role, questions as the conversation moves, and follow-ups that don't slip.",
        { top: 14 },
      ),
      PRODUCT,
      button("{{action_url}}", "Accept invitation"),
      muted("This invitation expires in {{invitation.expires_in_days}} days."),
      fallbackLink("{{action_url}}"),
    ],
    why: "You're getting this because someone invited this address to Mytheus. If you weren't expecting it, you can ignore it.",
  },

  organization_invitation: {
    name: "Organization invitation",
    art: "invite",
    subject: "Join {{org.name}} on Mytheus",
    title: "Join your team on Mytheus",
    preheader: "You've been invited to a Mytheus workspace.",
    eyebrow: "Workspace invitation",
    heading: "Join {{escapeURIs org.name}} on Mytheus",
    content: [
      p(
        "{{#if inviter_name}}<b>{{escapeURIs inviter_name}}</b> invited you{{else}}You've been invited{{/if}} to the <b>{{escapeURIs org.name}}</b> workspace. Join to see its meetings, get your own agent in each one, and keep up with the decisions and follow-ups.",
        { top: 14 },
      ),
      PRODUCT,
      button("{{action_url}}", "Join the workspace"),
      muted("{{#if invitation.expires_in_days}}This invitation expires in {{invitation.expires_in_days}} days. {{/if}}Already use Mytheus? The workspace appears in your switcher once you accept."),
      fallbackLink("{{action_url}}"),
    ],
    why: "You're getting this because a member of this workspace invited this address. If you weren't expecting it, you can ignore it.",
  },

  organization_invitation_accepted: {
    name: "Organization invitation accepted",
    art: "team",
    subject: "{{email_address}} joined {{org.name}}",
    title: "A new member joined your workspace",
    preheader: "{{email_address}} accepted their invitation.",
    eyebrow: "Workspace",
    heading: "Someone new joined {{escapeURIs org.name}}",
    content: [
      p("<b>{{email_address}}</b> accepted their invitation and is now a member. You can invite them to meetings or add them to a team.", { top: 14 }),
      button(`${APP}/tenant`, "See workspace members"),
    ],
    why: "You're getting this because you invited this person to the workspace.",
  },

  new_device_sign_in: {
    name: "Sign in from new device",
    art: "security",
    subject: "New sign-in to your Mytheus account",
    title: "New sign-in to Mytheus",
    preheader: "A new device just signed in to your account.",
    eyebrow: "Security",
    heading: "New sign-in to your account",
    content: [
      p("A device we haven't seen before just signed in to your Mytheus account. If this was you, there's nothing to do.", { top: 14 }),
      details([
        ["Device", "{{browser_name}} on {{operating_system}}"],
        ["Sign-in", "{{sign_in_method}}", "sign_in_method"],
        ["Location", "{{location}}", "location"],
        ["IP address", "{{ip_address}}", "ip_address"],
        ["Time", "{{session_created_at}}"],
      ]),
      `{{#if revoke_session_url}}${p("<b>Not you?</b> Sign that device out now, then change your password.", { top: 28, color: c.ink })}${button("{{revoke_session_url}}", "Sign out that device")}{{/if}}`,
      `{{#if support_email}}${muted('Questions? Write to <a href="mailto:{{support_email}}" style="color:' + c.signalDeep + ';">{{support_email}}</a>.', 24)}{{/if}}`,
    ],
    why: SECURITY,
  },

  account_locked: {
    name: "Account locked",
    art: "security",
    subject: "Your Mytheus account is locked for now",
    title: "Your Mytheus account is locked",
    preheader: "Too many failed sign-in attempts. It unlocks on its own.",
    eyebrow: "Security",
    heading: "Your account is locked for now",
    content: [
      p("After several failed sign-in attempts, we paused access to keep your account safe.", { top: 14 }),
      details([
        ["Locked", "{{locked_date}}"],
        ["Attempts", "{{failed_attempts}} failed"],
        ["Unlocks", "{{unlock_time}}"],
      ]),
      p("It unlocks on its own after {{lockout_duration}}. A workspace admin can unlock it sooner."),
      aside("Wasn't you?", "Someone may be trying to get into your account. Once it unlocks, sign in and change your password."),
    ],
    why: SECURITY,
  },

  password_changed: {
    name: "Password changed",
    art: "security",
    subject: "Your Mytheus password was changed",
    title: "Your Mytheus password was changed",
    preheader: "The password on your account was just changed.",
    eyebrow: "Security",
    heading: "Your password was changed",
    content: [greeting(), p("The password for <b>{{primary_email_address}}</b> was just changed. If that was you, you're all set."), CHANGE_ASIDE("change it")],
    why: SECURITY,
  },

  password_removed: {
    name: "Password removed",
    art: "security",
    subject: "Your Mytheus password was removed",
    title: "Your Mytheus password was removed",
    preheader: "Your account no longer has a password.",
    eyebrow: "Security",
    heading: "Your password was removed",
    content: [
      greeting(),
      p("The password for <b>{{primary_email_address}}</b> was removed. You'll sign in with a code, a link, a passkey or Google instead."),
      CHANGE_ASIDE("remove it"),
    ],
    why: SECURITY,
  },

  primary_email_address_changed: {
    name: "Primary email address changed",
    art: "security",
    subject: "Your Mytheus email address was updated",
    title: "Your Mytheus email address was updated",
    preheader: "Your account's main email address changed.",
    eyebrow: "Security",
    heading: "Your email address changed",
    content: [
      p("Your account's main email is now <b>{{new_email_address}}</b>. Sign-in codes, invitations and notices go there from now on.", { top: 14 }),
      CHANGE_ASIDE("make this change"),
    ],
    why: "This is a security notice, sent to your previous address so you know about the change.",
  },

  mfa_enabled: {
    name: "MFA enabled",
    art: "security",
    subject: "Two-step verification is on for Mytheus",
    title: "Two-step verification is on",
    preheader: "Your Mytheus account now asks for a second step at sign-in.",
    eyebrow: "Security",
    heading: "Two-step verification is on",
    content: [
      greeting(),
      p("Your account <b>{{primary_email_address}}</b> now asks for a second step each time you sign in. Keep your backup codes somewhere safe."),
      CHANGE_ASIDE("turn this on"),
    ],
    why: SECURITY,
  },

  passkey_added: {
    name: "Passkey added",
    art: "security",
    subject: "A passkey was added to your Mytheus account",
    title: "A passkey was added",
    preheader: "A new passkey can now sign in to your account.",
    eyebrow: "Security",
    heading: "A passkey was added",
    content: [
      greeting(),
      p("The passkey <b>{{escapeURIs passkey_name}}</b> can now sign in to <b>{{primary_email_address}}</b>."),
      CHANGE_ASIDE("add it"),
    ],
    why: SECURITY,
  },

  passkey_removed: {
    name: "Passkey removed",
    art: "security",
    subject: "A passkey was removed from your Mytheus account",
    title: "A passkey was removed",
    preheader: "A passkey can no longer sign in to your account.",
    eyebrow: "Security",
    heading: "A passkey was removed",
    content: [
      greeting(),
      p("The passkey <b>{{escapeURIs passkey_name}}</b> can no longer sign in to <b>{{primary_email_address}}</b>."),
      CHANGE_ASIDE("remove it"),
    ],
    why: SECURITY,
  },

  waitlist_confirmation: {
    name: "Waitlist confirmation",
    art: "team",
    subject: "You're on the Mytheus waitlist",
    title: "You're on the Mytheus waitlist",
    preheader: "We'll email you as soon as your spot opens.",
    eyebrow: "Waitlist",
    heading: "You're on the list",
    content: [
      p("Thanks for your interest in Mytheus. We're letting people in a few at a time, and we'll email this address as soon as your spot opens.", { top: 14 }),
      muted("Nothing else to do for now."),
    ],
    why: "You're getting this because this address joined the Mytheus waitlist.",
  },

  waitlist_invitation: {
    name: "Waitlist invitation",
    art: "invite",
    subject: "Your spot on Mytheus is ready",
    title: "Your spot on Mytheus is ready",
    preheader: "Create your account and bring an agent to your next meeting.",
    eyebrow: "You're in",
    heading: "Your spot is ready",
    content: [
      p("Thanks for waiting. Create your account and your agent will be ready for your next meeting.", { top: 14 }),
      PRODUCT,
      button("{{action_url}}", "Create your account"),
      muted("This invitation expires in {{invitation.expires_in_days}} days."),
      fallbackLink("{{action_url}}"),
    ],
    why: "You're getting this because this address joined the Mytheus waitlist.",
  },
};

export function render(slug) {
  const t = templates[slug];
  return layout({ ...t, content: t.content.join("\n") });
}

/* ---------- preview: a tiny Handlebars subset with sample data ---------- */

const SAMPLE = {
  otp_code: "482915",
  requested_from: "Chrome, macOS",
  requested_at: "9 November 2026, 11:42 IST",
  ttl_minutes: "10",
  magic_link: `${APP}/sign-in#sample-link`,
  action_url: `${APP}/onboarding/organization?switch=1`,
  inviter_name: "Sushan Shetty",
  "org.name": "Cybersprinters",
  "invitation.expires_in_days": "30",
  email_address: "yash@example.com",
  greeting_name: "Sushan",
  primary_email_address: "sushan@example.com",
  new_email_address: "sushan@mytheus.cloud",
  passkey_name: "MacBook Touch ID",
  browser_name: "Chrome 142",
  operating_system: "macOS",
  sign_in_method: "Email code",
  location: "Mangaluru, India",
  ip_address: "203.0.113.24",
  session_created_at: "9 November 2026, 11:42 IST",
  revoke_session_url: `${APP}/sign-in#revoke`,
  support_email: "support@mytheus.cloud",
  locked_date: "9 November 2026, 11:42 IST",
  failed_attempts: "10",
  lockout_duration: "60 minutes",
  unlock_time: "9 November 2026, 12:42 IST",
  current_year: "2026",
};

function fill(src) {
  let out = src;
  // Innermost {{#if}} blocks first, until none are left.
  const block = /{{#if ([\w.]+)}}((?:(?!{{#if )[\s\S])*?){{\/if}}/;
  for (let m = out.match(block); m; m = out.match(block)) {
    const [yes, no = ""] = m[2].split("{{else}}");
    out = out.replace(m[0], SAMPLE[m[1]] ? yes : no);
  }
  return out.replace(/{{(?:escapeURIs )?([\w.]+)}}/g, (_, k) => SAMPLE[k] ?? `[${k}]`);
}

/* ---------- commands ---------- */

const [cmd = "build", ...args] = process.argv.slice(2);

if (cmd === "assets") {
  const chrome = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const work = join(tmpdir(), "mytheus-email-art");
  const out = join(ROOT, "public", "email");
  mkdirSync(work, { recursive: true });
  mkdirSync(out, { recursive: true });
  const url = (p) => `file://${join(ROOT, p)}`;
  for (const kind of ART_KINDS) {
    const page = join(work, `${kind}.html`);
    writeFileSync(
      page,
      artPage(kind, {
        mark: url("public/logo-mark-512.png"),
        fonts: {
          refinity: url("src/app/fonts/Refinity-Regular.woff"),
          geist: url("src/app/fonts/GeistVF.woff"),
          geistMono: url("src/app/fonts/GeistMonoVF.woff"),
        },
      }),
    );
    execFileSync(chrome, [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--allow-file-access-from-files",
      "--force-device-scale-factor=2",
      "--window-size=560,200",
      "--virtual-time-budget=2000",
      `--screenshot=${join(out, `header-${kind}.png`)}`,
      `file://${page}`,
    ], { stdio: "ignore" });
  }
  console.log(`Rendered ${ART_KINDS.length} headers to public/email/`);
} else if (cmd === "build") {
  mkdirSync(OUT, { recursive: true });
  for (const slug of Object.keys(templates)) writeFileSync(join(OUT, `${slug}.html`), render(slug));
  writeFileSync(
    join(OUT, "subjects.json"),
    JSON.stringify(Object.fromEntries(Object.entries(templates).map(([s, t]) => [s, t.subject])), null, 2) + "\n",
  );
  console.log(`Wrote ${Object.keys(templates).length} templates to emails/clerk/`);
} else if (cmd === "preview") {
  const dir = resolve(args[0] ?? join(ROOT, ".email-preview"));
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(dir, "email"), { recursive: true });
  for (const f of readdirSync(join(ROOT, "public", "email"))) copyFileSync(join(ROOT, "public", "email", f), join(dir, "email", f));
  const cards = [];
  for (const [slug, t] of Object.entries(templates)) {
    writeFileSync(join(dir, `${slug}.html`), fill(render(slug)).replaceAll(`${ASSETS}/`, "email/"));
    cards.push(
      `<section><h2>${t.name}</h2><p class="subj">Subject: ${fill(t.subject)}</p><iframe src="${slug}.html" loading="lazy" title="${t.name}"></iframe></section>`,
    );
  }
  writeFileSync(
    join(dir, "index.html"),
    `<!doctype html><meta charset="utf-8"><title>Mytheus emails</title>
<style>body{margin:0;padding:32px;background:#e9e5da;font:14px -apple-system,sans-serif;color:#1c1a15}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:28px}
h2{margin:0;font-size:15px}.subj{margin:4px 0 10px;color:#6f6a5f}
iframe{width:100%;height:760px;border:1px solid #d8d2c3;border-radius:12px;background:#fff}</style>
<h1 style="margin:0 0 24px;font-size:22px">Mytheus emails (sample data)</h1><main>${cards.join("")}</main>`,
  );
  console.log(`Preview: ${join(dir, "index.html")}`);
} else if (cmd === "apply") {
  const key = process.env.CLERK_SECRET_KEY;
  if (!key) throw new Error("Set CLERK_SECRET_KEY (the instance whose emails to change).");
  const slugs = args.length ? args : Object.keys(templates);
  let failed = 0;
  for (const slug of slugs) {
    const t = templates[slug];
    if (!t) throw new Error(`Unknown template: ${slug}`);
    const res = await fetch(`https://api.clerk.com/v1/templates/email/${slug}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: t.name, subject: t.subject, body: render(slug), markup: "", delivered_by_clerk: true }),
    });
    const text = await res.text();
    console.log(`${res.ok ? "ok  " : "FAIL"} ${slug}${res.ok ? "" : ` ${res.status} ${text.slice(0, 300)}`}`);
    if (!res.ok) failed++;
  }
  if (failed) process.exit(1);
} else {
  console.error(readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(0, 8).join("\n"));
  process.exit(1);
}
