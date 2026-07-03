import { redirect } from "next/navigation";

/* Auth bypass (4-July Part 4a): accounts aren't wired yet, so logging in
   drops you straight into the app. */
// TODO(auth): replace with the real Clerk <SignIn /> screen once keys land.
export default function Page() {
  redirect("/dashboard");
}
