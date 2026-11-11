import { skeletonSuite } from "./skeletons/run";
import { WORK_IDS } from "./skeletons/ids-work";
import { WorkPair } from "./skeletons/WorkPairs";

/* Skeleton pairs: People, My work and Settings. See skeletons/run.ts. */
skeletonSuite("work", WORK_IDS, (mount, id, mode, theme) => mount(<WorkPair id={id} mode={mode} theme={theme} />));
