/* People wear ink doodles; only agents wear plush characters.

     npm run test:a11y -- faces-a11y */

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/experimental-ct-react";
import { FacesHarness } from "./FacesHarness";

test.describe.configure({ timeout: 90_000 });

for (const theme of ["light", "dark"] as const) {
  test(`people are doodles, agents are plush (${theme})`, async ({ mount, page }) => {
    await mount(<FacesHarness theme={theme} />);
    const people = page.getByRole("region", { name: "People" });
    await expect(people.getByRole("img", { name: "Maya Chen" })).toBeVisible();
    await expect(people.getByRole("img", { name: "Raj Patel" })).toBeVisible();
    // the ink doodle is an inline SVG drawing, never a plush picture or canvas
    await expect(people.locator("svg")).toHaveCount(2);
    await expect(people.locator("[data-plush]")).toHaveCount(0);
    const agents = page.getByRole("region", { name: "Agents" });
    await expect(agents.locator("[data-plush]")).toHaveCount(1);
    await expect(agents.getByRole("img", { name: "Maya's Myte" })).toBeVisible();
    // the person's face picker deals doodles
    const picker = page.getByRole("region", { name: "Picker" });
    await expect(picker.getByRole("radio")).not.toHaveCount(0);
    await expect(picker.locator("[data-plush]")).toHaveCount(0);
    await expect(picker.getByRole("img", { name: "Your doodle" })).toBeVisible();
    await expect(page.locator("[data-plush]:not([data-ready])")).toHaveCount(0, { timeout: 60_000 });
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(axe.violations.map((v) => v.id)).toEqual([]);
  });
}
