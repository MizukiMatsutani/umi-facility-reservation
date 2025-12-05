import { describe, expect, it } from "vitest";

describe("Vitestセットアップ確認", () => {
  it("基本的な算術演算のテスト", () => {
    expect(1 + 1).toBe(2);
  });

  it("文字列の比較テスト", () => {
    const greeting = "こんにちは";
    expect(greeting).toBe("こんにちは");
  });

  it("配列の長さテスト", () => {
    const numbers = [1, 2, 3];
    expect(numbers).toHaveLength(3);
  });
});
