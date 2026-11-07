"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { pendingDoodle, saveDoodle } from "@/lib/doodle-client";
import { refreshMyProfile } from "@/app/actions/profile";

/* Gives every account its doodle for real, once, quietly, on a signed-in page load:
   - a doodle chosen at sign-up is stored as a seed before the account has a session, so its
     picture could not be uploaded then;
   - an account from before doodles existed has no seed at all, and gets the default doodle for
     its email (the face the app was already drawing for it).
   The upload is what puts that face in `users.avatar_url` for every surface that reads the
   database. A failure is retried on a later visit. */
export function DoodleImageSync() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const tried = useRef(false);

  useEffect(() => {
    if (!isLoaded || !user || tried.current) return;
    const seed = pendingDoodle(user.unsafeMetadata, user.primaryEmailAddress?.emailAddress || user.id);
    if (!seed) return;
    tried.current = true;
    void saveDoodle(user, seed)
      .then(() => refreshMyProfile())
      .then(() => router.refresh())
      .catch(() => {
        // Not worth interrupting anyone over; the next page load tries again.
      });
  }, [isLoaded, user, router]);

  return null;
}
