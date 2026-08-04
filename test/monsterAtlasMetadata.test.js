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
    assert.deepEqual(metadata.anchor, { x: 0.5, y: 0.9 }, `${id} foot anchor must remain unchanged`);
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
    const cleanup = metadata.componentCleanup;
    assert.equal(cleanup.connectivity, 8);
    assert.equal(cleanup.alphaThreshold, 8);
    assert.equal(cleanup.frameReports.length, atlas.columns * atlas.rows);
    assert.match(cleanup.mainComponentSelection, /area.*center.*body.*anchor/i);
    let removedComponents = 0;
    for (let frame = 0; frame < cleanup.frameReports.length; frame += 1) {
      const report = cleanup.frameReports[frame];
      assert.equal(report.frame, frame);
      assert.equal(report.mainComponent, 0);
      assert.ok(report.mainAlphaShare > 0.8, `${id}:${frame} must retain a dominant silhouette`);
      assert.ok(report.kept.length > 0, `${id}:${frame} must retain its monster`);
      assert.deepEqual(report.kept[0].bounds.length, 4);
      for (const component of [...report.kept, ...report.removed]) {
        const [minX, minY, maxX, maxY] = component.bounds;
        assert.ok(minX >= 0 && minY >= 0 && maxX < atlas.contentWidth && maxY < atlas.contentHeight);
        assert.ok(component.area > 0 && component.alphaArea > 0);
        assert.ok(component.gapToMain >= 0);
      }
      removedComponents += report.removed.length;
    }
    assert.ok(removedComponents > 0, `${id} must record removed source-sheet fragments`);
  }
});
