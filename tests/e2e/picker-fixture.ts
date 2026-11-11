import type { PickableMember } from "../../src/components/meetings/MemberPicker";

/* A workspace big enough to overflow the picker's cluster of faces (more than eight picked). */
export const MANY: PickableMember[] = [
  "Raj Patel",
  "Priya Nair",
  "Sarah Okafor",
  "Diego Alvarez",
  "Aiko Tanaka",
  "Tomas Ferreira",
  "Daniel Okafor",
  "Sushan Shetty",
  "Yash Maurya",
  "Samar Rihan",
  "Shaun Marvell Rodrigues",
  "Maya Lin",
].map((name) => {
  const slug = name.toLowerCase().split(" ")[0];
  return { id: `u-${slug}`, name, email: `${slug}@example.com` };
});
