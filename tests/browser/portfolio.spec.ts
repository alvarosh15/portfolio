import { expect, test } from "@playwright/test";

declare global {
  interface Window { frameCallbacks: number }
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api.open-meteo.com/**", (route) => route.fulfill({
    json: { current: { weather_code: 0, temperature_2m: 24 } },
  }));
  await page.route("**/_vercel/**", (route) => route.fulfill({ body: "" }));
  await page.addInitScript(() => {
    window.frameCallbacks = 0;
    const request = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => request((t) => {
      window.frameCallbacks++;
      callback(t);
    });
  });
});

test("navigation preserves the park and clock, and remounts the clock after the 404", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/404.html");
  await page.getByRole("link", { name: "home", exact: true }).click();
  await expect(page.locator("[data-clock]")).toContainText("24°C");
  await page.locator("malaga-clock").evaluate((el) => el.setAttribute("data-test-persist", "yes"));
  await page.getByRole("link", { name: "Writing", exact: true }).click();
  await expect(page.locator("[data-park]")).toHaveAttribute("data-park", "reading");
  await expect(page.locator("malaga-clock")).toHaveAttribute("data-test-persist", "yes");
  await page.getByRole("link", { name: "Alvaro Sanchez", exact: true }).click();
  await expect(page.locator("[data-park]")).toHaveAttribute("data-park", "home");
  await expect(page).toHaveURL("/");
  await expect(page.locator("[data-people-zone] button")).toHaveCount(5);
  // Back through blog and home to the initial 404 removes the persisted footer.
  await page.goBack();
  await expect(page.locator("[data-park]")).toHaveAttribute("data-park", "reading");
  await page.goBack();
  await expect(page.locator("[data-park]")).toHaveAttribute("data-park", "home");
  await page.goBack();
  await expect(page.locator("[data-park]")).toHaveAttribute("data-park", "lost");
  await expect(page.locator("footer")).toHaveCount(0);
  await page.getByRole("link", { name: "home", exact: true }).click();
  await expect(page.locator("[data-clock]")).toContainText("24°C");
  await expect(page.locator("[data-sky] svg")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("reduced motion stops idle frames and responds to preference changes and scenes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("[data-clock]")).toContainText("24°C");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const before = await page.evaluate(() => window.frameCallbacks);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.frameCallbacks)).toBe(before);
  await page.getByRole("button", { name: "Google", exact: true }).click();
  await expect(page.locator("[data-people-layer] > div")).toHaveCount(1);
  await page.waitForTimeout(300);
  const sceneFrame = await page.evaluate(() => window.frameCallbacks);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.frameCallbacks)).toBe(sceneFrame);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect.poll(() => page.evaluate(() => window.frameCallbacks)).toBeGreaterThan(sceneFrame + 2);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(300);
  const stopped = await page.evaluate(() => window.frameCallbacks);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.frameCallbacks)).toBe(stopped);
});

test("scenes restart and navigation clears their sprites without duplicating actors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  for (const name of ["Google", "Google", "Artificial Intelligence", "Mathematics", "Indra Espacio", "reverse engineering", "Computer Science"]) {
    await page.getByRole("button", { name, exact: true }).click();
  }
  await expect(page.locator("[data-people-layer] > div")).not.toHaveCount(0);
  await page.getByRole("link", { name: "Writing", exact: true }).click();
  await expect(page.locator("[data-people-layer] > div")).toHaveCount(0);
  await expect(page.locator("[data-people-zone] button")).toHaveCount(5);
  for (const actor of await page.locator("[data-people-zone] button").all()) {
    expect(await actor.evaluate((el) => el.style.opacity)).not.toBe("0");
  }
  expect(errors).toEqual([]);
});

test("images, disabled sorting, landmarks and drafts have the expected production output", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator("#projects img[loading=lazy]")).toHaveCount(2);
  const html = await (await request.get("/")).text();
  expect(html).not.toContain("bubble sort");
  expect(html).not.toContain("Sorting.astro_astro_type_script");
  for (const route of ["/blog/", "/404.html"]) {
    await page.goto(route);
    await expect(page.getByRole("main")).toHaveCount(1);
  }
  for (const route of ["/blog/", "/rss.xml", "/sitemap.xml"]) {
    const body = await (await request.get(route)).text();
    expect(body).not.toContain("building-a-pixel-park");
  }
});

test("malformed paths and weather failures leave the page usable", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // Supply the static 404 as a host would; Astro preview itself rejects malformed URLs.
  const notFound = await (await request.get("/404.html")).text();
  await page.route("**/%E0%A4%A", (route) => route.fulfill({ status: 404, contentType: "text/html", body: notFound }));
  await page.route("**/api.open-meteo.com/**", (route) => route.fulfill({ status: 503, body: "unavailable" }));
  await page.goto("/%E0%A4%A");
  await expect(page.locator("[data-path]").first()).toHaveText("/%E0%A4%A");
  await page.getByRole("link", { name: "home", exact: true }).click();
  await expect(page.locator("[data-clock]")).toContainText("in Málaga");
  await expect(page.locator("[data-clock]")).not.toContainText("NaN");
  expect(errors).toEqual([]);
});

test("a sunny footer is static and weather refreshes after fifteen minutes", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-09-26T10:00:00Z") });
  let requests = 0;
  await page.route("**/api.open-meteo.com/**", (route) => {
    requests++;
    return route.fulfill({ json: { current: { weather_code: 0, temperature_2m: 23 + requests } } });
  });
  await page.goto("/");
  await expect(page.locator("[data-clock]")).toContainText("24°C");
  await page.locator("footer").scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  const before = await page.evaluate(() => window.frameCallbacks);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.frameCallbacks)).toBe(before);
  expect(requests).toBe(1);
  await page.clock.fastForward(15 * 60_000);
  await expect(page.locator("[data-clock]")).toContainText("25°C");
  expect(requests).toBe(2);
});

test("normal-motion scenes run and the reboot restores the cast", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  for (const name of ["Google", "VirusTotal", "Mathematics", "Indra Espacio", "Artificial Intelligence", "reverse engineering"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await page.waitForTimeout(200);
  }
  await page.getByRole("button", { name: "Computer Science", exact: true }).click();
  await expect(page.locator("[data-people-layer] > div")).toHaveCount(0, { timeout: 10_000 });
  for (const actor of await page.locator("[data-people-zone] button").all()) {
    expect(await actor.evaluate((el) => el.style.opacity)).not.toBe("0");
  }
  expect(errors).toEqual([]);
});
