import { tokenStore } from "../auth";

test("save then get returns the tokens", async () => {
  await tokenStore.save({ access: "a1", refresh: "r1" });
  expect(await tokenStore.get()).toEqual({ access: "a1", refresh: "r1" });
});

test("clear removes the tokens", async () => {
  await tokenStore.save({ access: "a1", refresh: "r1" });
  await tokenStore.clear();
  expect(await tokenStore.get()).toBeNull();
});
