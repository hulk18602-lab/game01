import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ids = ["grunt", "runner", "tank", "armored", "regenerator", "boss"];

const pngDimensions = (buffer) => ({
  width: buffer.readUInt32BE(16),
  height: buffer.readUInt32BE(20),
});

test("every monster atlas has an exact integer padded grid", () => {
  for (const id of ids) {
    const directory = new URL(`../public/assets/monsters/${id}/`, import.meta.url);
    const metadata = JSON.parse(readFileSync(new URL("atlas.json", directory), "utf8"));
    const image = pngDimensions(readFileSync(new URL("atlas-placeholder.png", directory)));
    const atlas = metadata.atlas;
    assert.equal(metadata.schemaVersion, 2);
    for (const value of [
      atlas.width, atlas.height, atlas.columns, atlas.rows, atlas.frameWidth,
      atlas.frameHeight, atlas.contentWidth, atlas.contentHeight, atlas.padding,
    ]) assert.equal(Number.isInteger(value), true, `${id} geometry must be integer`);
    assert.equal(atlas.padding, 2);
    assert.equal(atlas.width, atlas.columns * atlas.frameWidth);
    assert.equal(atlas.height, atlas.rows * atlas.frameHeight);
    assert.equal(image.width, atlas.width);
    assert.equal(image.height, atlas.height);
    assert.ok(atlas.contentWidth + atlas.padding * 2 <= atlas.frameWidth);
    assert.ok(atlas.contentHeight + atlas.padding * 2 <= atlas.frameHeight);
    for (const frames of Object.values(metadata.animations)) {
      assert.ok(frames.every((frame) => frame >= 0 && frame < atlas.columns * atlas.rows));
    }
  }
});
