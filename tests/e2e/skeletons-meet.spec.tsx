import { skeletonSuite } from "./skeletons/run";
import { MEET_IDS } from "./skeletons/ids-meet";
import { MeetPair } from "./skeletons/MeetPairs";

/* Skeleton pairs: Meetings and Decisions. See skeletons/run.ts. */
skeletonSuite("meet", MEET_IDS, (mount, id, mode, theme) => mount(<MeetPair id={id} mode={mode} theme={theme} />));
