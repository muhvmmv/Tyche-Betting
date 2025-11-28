import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

Deno.test("insufficient balance check", () => {
  const balance = 20;
  const stake = 50;

  const isAllowed = balance >= stake;

  assertEquals(isAllowed, false);
});
