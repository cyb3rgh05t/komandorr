import assert from "node:assert/strict";
import test from "node:test";
import { getPlexActivityCategory } from "./plexActivities.js";

test("subscription and maintenance tasks are hidden, not scans or streams", () => {
  for (const activity of [
    { type: "library.subscriptions", title: "Processing subscriptions" },
    { type: "butler", title: "Scheduled maintenance" },
    { type: "media.generate", title: "Generating media" },
    { type: "background", title: "Processing subscriptions" },
    { title: "Processing subscriptions" },
    { type: "background", subtitle: "Butler maintenance" },
  ]) {
    assert.equal(getPlexActivityCategory(activity), "background");
  }
});

test("actual library scans remain visible", () => {
  for (const activity of [
    { type: "library.scanner", title: "Movies" },
    { type: "library.update.section", title: "TV Shows" },
    { type: "scan" },
    { title: "Scanning Movies" },
  ]) {
    assert.equal(getPlexActivityCategory(activity), "scan");
  }
});

test("media titles do not turn playback or downloads into scans or background tasks", () => {
  for (const type of ["stream", "transcode", "pause", "download", "media.download"]) {
    for (const title of ["Processing subscriptions", "Scan", "Butler", "Scanners"]) {
      assert.equal(getPlexActivityCategory({ type, title }), "stream");
    }
  }
});

test("hidden tasks are excluded from both displayed lists and peak counts", () => {
  const activities = [
    ...Array.from({ length: 22 }, () => ({
      type: "library.subscriptions",
      title: "Processing subscriptions",
    })),
    { type: "library.scanner", title: "Movies" },
    { type: "stream", title: "Movie" },
    { type: "media.download", title: "Episode" },
  ];
  const visible = activities.filter(
    (activity) => getPlexActivityCategory(activity) !== "background",
  );
  const scans = visible.filter(
    (activity) => getPlexActivityCategory(activity) === "scan",
  );
  const streams = visible.filter(
    (activity) => getPlexActivityCategory(activity) === "stream",
  );
  assert.equal(visible.length, 3);
  assert.equal(scans.length, 1);
  assert.equal(streams.length, 2);
});
