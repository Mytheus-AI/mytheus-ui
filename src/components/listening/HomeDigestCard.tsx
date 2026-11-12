import { Card, CardBody, CardHead } from "@/components/ui/Card";
import { TextLink } from "@/components/ui/TextLink";
import { fetchLatestEveningDigest } from "@/lib/api/listening";
import { EveningDigestBody } from "./EveningDigestView";

/* Home's evening digest (In every meeting at once): the latest paragraph about what your Myte
   heard in the meetings it listened to for you, or today's so far. A quiet day with nothing to
   say shows nothing at all (Home stays calm); a failed read says so in one line. Streamed under
   Suspense so it never holds the rest of Home. */

export async function HomeDigestCard() {
  const res = await fetchLatestEveningDigest();
  if (res.ok && res.data.status === "quiet") return null;
  return (
    <Card as="section" flush aria-labelledby="home-digest-h">
      <CardHead
        id="home-digest-h"
        title="Your evening digest"
        caption="While you were elsewhere"
        right={<TextLink href="/meetings/listening">See your week</TextLink>}
      />
      <CardBody>
        {res.ok ? (
          <EveningDigestBody digest={res.data} />
        ) : (
          <p className="text-[14px] text-ink-3">Your evening digest did not load. It is also on Meetings, Listening.</p>
        )}
      </CardBody>
    </Card>
  );
}
