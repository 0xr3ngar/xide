import { expect, test } from "bun:test";
import { collectHits } from "./harvest";

test("timeline payload", () => {
  const json = {
    data: {
      home: {
        home_timeline_urt: {
          instructions: [
            {
              entries: [
                {
                  content: {
                    itemContent: {
                      tweet_results: {
                        result: {
                          core: {
                            user_results: {
                              result: {
                                legacy: { screen_name: "_Meshak", location: "Mumbai, India" },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              ],
            },
          ],
        },
      },
    },
  };
  const hits = collectHits(json);
  expect(hits).toEqual([{ handle: "_Meshak", location: "Mumbai, India", basedIn: null }]);
});

test("about account payload", () => {
  const json = {
    data: {
      user_result_by_screen_name: {
        result: {
          about_profile: { account_based_in: "India" },
          legacy: { screen_name: "SomeHandle", location: "Bengaluru" },
        },
      },
    },
  };
  const hits = collectHits(json);
  expect(hits).toEqual([{ handle: "SomeHandle", location: "Bengaluru", basedIn: "India" }]);
});

test("nested recursion does not re-visit shared nodes", () => {
  const shared = { legacy: { screen_name: "Dup", location: "Lagos" } };
  const json = { a: shared, b: [shared, { c: shared }] };
  const hits = collectHits(json);
  expect(hits).toEqual([{ handle: "Dup", location: "Lagos", basedIn: null }]);
});

test("empty location dropped to null", () => {
  const json = { result: { legacy: { screen_name: "NoPlace" } } };
  const hits = collectHits(json);
  expect(hits).toEqual([{ handle: "NoPlace", location: null, basedIn: null }]);
});

test("missing screen_name skipped", () => {
  const json = { result: { legacy: { location: "Paris" } } };
  expect(collectHits(json)).toEqual([]);
});
