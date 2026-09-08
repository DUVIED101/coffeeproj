import { describe, it, expect } from "@jest/globals";
import { backTarget } from "./backTarget";

describe(backTarget, () => {
  it.each([
    ["/", null],
    ["/jobs", null],
    ["/applications", null],
    ["/chats", null],
    ["/profile", null],
    ["/dashboard", null],
    ["/baristas", null],
  ])("%s is a tab root and gets no back target", (pathname, expected) => {
    expect(backTarget(pathname)).toBe(expected);
  });

  it.each([
    ["/jobs/abc", "/jobs"],
    ["/jobs/abc/apply", "/jobs/abc"],
    ["/jobs/abc/applicants", "/jobs/abc"],
    ["/jobs/abc/edit", "/jobs/abc"],
    ["/jobs/new", "/jobs"],
    ["/applications/app-1", "/applications"],
    ["/baristas/b-1", "/baristas"],
    ["/baristas/b-1/offer", "/baristas/b-1"],
    ["/chats/c-1", "/chats"],
    ["/profile/edit", "/profile"],
    ["/settings/password", "/settings"],
    ["/disputes/new", "/disputes"],
    ["/disputes/d-1", "/disputes"],
    ["/businesses/o-1/jobs", "/businesses/o-1"],
  ])(
    "%s goes up one segment when the parent is a page",
    (pathname, expected) => {
      expect(backTarget(pathname)).toBe(expected);
    },
  );

  it.each([
    ["/businesses/o-1", "/jobs"],
    ["/reviews/u-1", "/profile"],
    ["/offers/of-1", "/applications"],
  ])("%s skips a parent that has no index page", (pathname, expected) => {
    expect(backTarget(pathname)).toBe(expected);
  });

  it.each([
    ["/settings", "/profile"],
    ["/notifications", "/"],
    ["/push", "/notifications"],
    ["/disputes", "/profile"],
    ["/shifts", "/profile"],
    ["/branches", "/profile"],
    ["/shift-alerts", "/shifts"],
  ])(
    "%s is a section root reached from a tab and returns there",
    (pathname, expected) => {
      expect(backTarget(pathname)).toBe(expected);
    },
  );

  it("ignores a trailing slash and a query string", () => {
    expect(backTarget("/jobs/abc/?x=1")).toBe("/jobs");
  });

  it("sends an unknown single-segment route home", () => {
    expect(backTarget("/whatever")).toBe("/");
  });
});
