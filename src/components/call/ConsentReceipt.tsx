import type { ConsentReceiptRow } from "@/app/actions/off-record";

/* A person's own consent receipt for one meeting (polish program wave 3): whether they agreed,
   when, to which version of the notice, and what that version said. Rendered in the room's "What
   is recorded" dialog and on the meeting's "What is recorded" page. No hooks and no icons, so it
   renders on the server and in the client alike. */

const when = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function receiptSummary(r: ConsentReceiptRow): string {
  if (r.consented && r.consented_at) {
    return `You agreed on ${when.format(new Date(r.consented_at))}${r.consent_version ? `, to notice ${r.consent_version}` : ""}.`;
  }
  if (r.consent_required) return "You have not agreed yet. The call asks you before you join.";
  return "Your workspace does not ask for agreement before joining, so there is no agreement on record. This is what the meeting keeps.";
}

export function ConsentReceiptView({
  receipt,
  fallback,
}: {
  receipt: ConsentReceiptRow;
  /** What to show when there are no stored clauses (not agreed, or an unknown version): the notice
   *  as it reads today. */
  fallback?: React.ReactNode;
}) {
  const outdated = receipt.consented && receipt.consent_version && receipt.consent_version !== receipt.current_version;
  return (
    <div className="receipt">
      <p className="receipt-summary">{receiptSummary(receipt)}</p>
      {outdated ? (
        <p className="receipt-note">
          The notice has changed since you agreed (now {receipt.current_version}). Below are the words you agreed to.
        </p>
      ) : null}
      {receipt.clauses ? (
        <ul className="receipt-clauses">
          {receipt.clauses.map((c) => (
            <li key={c.key}>
              <strong>{c.title}</strong>
              <span>{c.body}</span>
            </li>
          ))}
        </ul>
      ) : receipt.consented ? (
        <>
          <p className="receipt-note">
            The wording of notice {receipt.consent_version ?? "you agreed to"} is not on this server any more. This is what
            the meeting keeps today:
          </p>
          {fallback}
        </>
      ) : (
        fallback
      )}
    </div>
  );
}
