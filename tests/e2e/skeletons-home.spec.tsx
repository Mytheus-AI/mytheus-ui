import { skeletonSuite } from "./skeletons/run";
import { HOME_IDS } from "./skeletons/ids-home";
import { HomePair } from "./skeletons/HomePairs";

/* Skeleton pairs: Home, digest, Ask, welcome, agent, Capture and briefings. See skeletons/run.ts. */
skeletonSuite("home", HOME_IDS, (mount, id, mode, theme) => mount(<HomePair id={id} mode={mode} theme={theme} />));
