import { expect, test } from "bun:test";
import { resolveSignal } from "./resolve";

test("based_in exact country name", () => {
  expect(resolveSignal({ basedIn: "India", location: null })).toBe("IN");
});

test("based_in iso code", () => {
  expect(resolveSignal({ basedIn: "IN", location: null })).toBe("IN");
});

test("based_in region falls through to location", () => {
  expect(resolveSignal({ basedIn: "South Asia", location: "Mumbai" })).toBe("IN");
});

test("based_in unknown falls through", () => {
  expect(resolveSignal({ basedIn: "The Internet", location: "Mumbai" })).toBe("IN");
});

test("location city only", () => {
  expect(resolveSignal({ basedIn: null, location: "Mumbai" })).toBe("IN");
});

test("location city with country", () => {
  expect(resolveSignal({ basedIn: null, location: "Bengaluru, India" })).toBe("IN");
});

test("location alias", () => {
  expect(resolveSignal({ basedIn: null, location: "USA" })).toBe("US");
});

test("location the-prefixed country", () => {
  expect(resolveSignal({ basedIn: null, location: "The Netherlands" })).toBe("NL");
});

test("location gibberish", () => {
  expect(resolveSignal({ basedIn: null, location: "Born in the 90s 💜" })).toBeNull();
});

test("region only resolves nothing", () => {
  expect(resolveSignal({ basedIn: "South Asia", location: null })).toBeNull();
});

test("no signals resolves nothing", () => {
  expect(resolveSignal({ basedIn: null, location: null })).toBeNull();
});

test("based_in wins over location", () => {
  expect(resolveSignal({ basedIn: "India", location: "London" })).toBe("IN");
});
