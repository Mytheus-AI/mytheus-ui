import { skeletonSuite } from "./skeletons/run";
import { INBOX_IDS } from "./skeletons/ids-inbox";
import { InboxPair } from "./skeletons/InboxPairs";

/* Skeleton pairs: Inbox. See skeletons/run.ts. */
skeletonSuite("inbox", INBOX_IDS, (mount, id, mode, theme) => mount(<InboxPair id={id} mode={mode} theme={theme} />));
