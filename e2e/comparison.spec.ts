import { expect, test, type Page } from "@playwright/test";
import { deflateSync } from "node:zlib";

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

// A valid 1×1 RGBA PNG keeps the tests independent of the public tile service.
const header = Buffer.alloc(13);
header.writeUInt32BE(1, 0);
header.writeUInt32BE(1, 4);
header[8] = 8;
header[9] = 6;
const tile = Buffer.concat([
  Buffer.from("89504e470d0a1a0a", "hex"),
  chunk("IHDR", header),
  chunk("IDAT", deflateSync(Buffer.from([0, 240, 240, 240, 255]))),
  chunk("IEND", Buffer.alloc(0)),
]);

async function openDemo(page: Page) {
  await page.route("https://gibs.earthdata.nasa.gov/wmts/**", (route) => route.fulfill({
    status: 200,
    contentType: "image/png",
    body: tile,
  }));
  await page.goto("/");
  await expect(page.getByText("Loading maps…")).toBeHidden();
  await expect(page.getByRole("alert")).toHaveCount(0);
}

test("loads two dated imagery sources and exports only display metadata", async ({ page }) => {
  const requestedDates = new Set<string>();
  page.on("request", (request) => {
    const match = request.url().match(/\/default\/(2005-07-15|2023-07-15)\/GoogleMapsCompatible_Level9\//);
    if (match) requestedDates.add(match[1]);
  });
  await openDemo(page);
  await expect.poll(() => [...requestedDates].sort()).toEqual(["2005-07-15", "2023-07-15"]);
  await expect(page.getByText("NASA GIBS · MODIS/Terra daily composite")).toHaveCount(2);
  const snapshot = await exportedState(page);
  expect(snapshot.before.acquiredAt).toBe("2005-07-15");
  expect(snapshot.after.acquiredAt).toBe("2023-07-15");
  expect(JSON.stringify(snapshot)).not.toContain("gibs.earthdata.nasa.gov");
});

test("retries failed imagery without losing the comparison state", async ({ page }) => {
  let failing = true;
  let requests = 0;
  await page.route("https://gibs.earthdata.nasa.gov/wmts/**", (route) => {
    requests += 1;
    return failing
      ? route.fulfill({ status: 503, contentType: "text/plain", body: "Service unavailable" })
      : route.fulfill({ status: 200, contentType: "image/png", body: tile });
  });
  await page.goto("/");
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Side by side" }).click();
  const beforeRetry = await exportedState(page);
  const failedRequests = requests;
  failing = false;
  await page.getByRole("button", { name: "Retry loading" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByText("Loading maps…")).toBeHidden();
  await expect.poll(() => requests).toBeGreaterThan(failedRequests);
  const afterRetry = await exportedState(page);
  expect(afterRetry.mode).toBe("side-by-side");
  expect(afterRetry.view.center).toEqual(beforeRetry.view.center);
  expect(afterRetry.view.zoom).toBeCloseTo(beforeRetry.view.zoom);
  await expect(page.locator(".geocompare-map canvas")).toHaveCount(2);
});

async function exportedState(page: Page) {
  await page.getByRole("button", { name: "Export JSON" }).click();
  return JSON.parse(await page.getByRole("textbox", { name: "Comparison JSON" }).inputValue());
}

test("drags the swipe divider and restores its state", async ({ page }) => {
  await openDemo(page);
  const divider = page.getByRole("slider", { name: "Comparison position" });
  const root = page.locator(".geocompare");
  await divider.scrollIntoViewIfNeeded();
  const sliderBox = await divider.boundingBox();
  const rootBox = await root.boundingBox();
  expect(sliderBox).not.toBeNull();
  expect(rootBox).not.toBeNull();

  await page.mouse.move(sliderBox!.x + sliderBox!.width / 2, sliderBox!.y + sliderBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(rootBox!.x + rootBox!.width * 0.75, rootBox!.y + rootBox!.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(divider).toHaveAttribute("aria-valuenow", "75");

  await page.getByRole("button", { name: "Side by side" }).click();
  await expect(page.getByRole("button", { name: "Side by side" })).toHaveAttribute("aria-pressed", "true");
  const snapshot = await exportedState(page);
  expect(snapshot.mode).toBe("side-by-side");
  expect(snapshot.position).toBeCloseTo(0.75, 2);
  expect(snapshot.before.style).toBeUndefined();

  await page.getByRole("button", { name: "Restore JSON" }).click();
  await expect(page.getByText("Loading maps…")).toBeHidden();
  await expect(page.getByRole("button", { name: "Side by side" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Swipe" }).click();
  await expect(page.getByRole("slider", { name: "Comparison position" })).toHaveAttribute("aria-valuenow", "75");
});

test("supports precise and large keyboard steps with readable slider values", async ({ page }) => {
  await openDemo(page);
  const divider = page.getByRole("slider", { name: "Comparison position" });
  await divider.focus();
  await expect(divider).toHaveAttribute("aria-orientation", "horizontal");
  await expect(divider).toHaveAttribute("aria-valuetext", "50% earlier imagery, 50% later imagery");

  await divider.press("ArrowRight");
  await expect(divider).toHaveAttribute("aria-valuenow", "51");
  await divider.press("PageUp");
  await expect(divider).toHaveAttribute("aria-valuenow", "61");
  await divider.press("PageDown");
  await expect(divider).toHaveAttribute("aria-valuenow", "51");
  await divider.press("Home");
  await expect(divider).toHaveAttribute("aria-valuenow", "0");
  await divider.press("ArrowLeft");
  await expect(divider).toHaveAttribute("aria-valuenow", "0");
  await divider.press("End");
  await expect(divider).toHaveAttribute("aria-valuetext", "100% earlier imagery, 0% later imagery");
  await divider.press("ArrowRight");
  await expect(divider).toHaveAttribute("aria-valuenow", "100");
  expect((await exportedState(page)).position).toBe(1);
});

test("keeps both map canvases through resize and repeated Strict Mode mounts", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openDemo(page);
  const beforeCanvas = page.locator(".geocompare-map--before canvas");
  const afterCanvas = page.locator(".geocompare-map--after canvas");
  await expect(beforeCanvas).toHaveCount(1);
  await expect(afterCanvas).toHaveCount(1);

  await page.getByRole("button", { name: "Side by side" }).click();
  const before = page.locator(".geocompare-map--before");
  const after = page.locator(".geocompare-map--after");
  const desktopBefore = await before.boundingBox();
  const desktopAfter = await after.boundingBox();
  expect(desktopBefore).not.toBeNull();
  expect(desktopAfter).not.toBeNull();
  expect(desktopBefore!.x + desktopBefore!.width).toBeCloseTo(desktopAfter!.x, 0);

  await page.setViewportSize({ width: 480, height: 900 });
  const mobileBefore = await before.boundingBox();
  const mobileAfter = await after.boundingBox();
  expect(mobileBefore).not.toBeNull();
  expect(mobileAfter).not.toBeNull();
  expect(mobileBefore!.y + mobileBefore!.height).toBeCloseTo(mobileAfter!.y, 0);
  const laterLabel = await page.locator(".geocompare-label--after").boundingBox();
  expect(laterLabel).not.toBeNull();
  expect(laterLabel!.y).toBeGreaterThanOrEqual(mobileAfter!.y);

  for (let count = 0; count < 3; count += 1) {
    await exportedState(page);
    await page.getByRole("button", { name: "Restore JSON" }).click();
    await expect(page.getByText("Loading maps…")).toBeHidden();
    await expect(beforeCanvas).toHaveCount(1);
    await expect(afterCanvas).toHaveCount(1);
  }
  expect(errors).toEqual([]);
});

test("synchronizes the camera when the after map is panned", async ({ page }) => {
  await openDemo(page);
  await page.getByRole("button", { name: "Side by side" }).click();
  const initial = await exportedState(page);
  const afterCanvas = page.locator(".geocompare-map--after canvas");
  await afterCanvas.scrollIntoViewIfNeeded();
  const bounds = await afterCanvas.boundingBox();
  expect(bounds).not.toBeNull();
  const x = bounds!.x + bounds!.width / 2;
  const y = bounds!.y + bounds!.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 100, y + 30, { steps: 10 });
  await page.mouse.up();

  // Export reads the before map, so a changed center proves the after map drove synchronization.
  await expect.poll(async () => {
    const current = await exportedState(page);
    return Math.abs(current.view.center[0] - initial.view.center[0]);
  }).toBeGreaterThan(0.01);
  await expect(page.getByRole("alert")).toHaveCount(0);
});
