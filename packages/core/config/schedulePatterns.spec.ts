import { describe, it, expect } from "@jest/globals";
import {
  SCHEDULE_PATTERN_PRESETS,
  isSchedulePattern,
} from "./schedulePatterns";

describe(isSchedulePattern, () => {
  it.each(SCHEDULE_PATTERN_PRESETS)("accepts the preset %s", (pattern) => {
    expect(isSchedulePattern(pattern)).toBe(true);
  });

  it.each([
    ["letters", "a/b"],
    ["missing off days", "5/"],
    ["zero on days", "0/2"],
    ["two-digit part", "10/2"],
    ["spaces", "5 / 2"],
    ["empty", ""],
  ])("rejects %s", (_label, value) => {
    expect(isSchedulePattern(value)).toBe(false);
  });
});
