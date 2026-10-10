import { expect, test } from "@playwright/test";
for (const difficulty of ["初級", "中級", "上級"]) {
  for (const mode of ["練習", "テスト"])
    test(`${difficulty} / ${mode}: 10 questions and persistent result`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "聴くほどに",
      );
      if (difficulty === "初級" && mode === "練習")
        await page.screenshot({
          path: `test-results/home-${test.info().project.name}.png`,
          fullPage: true,
        });
      await page.getByRole("button", { name: new RegExp(difficulty) }).click();
      await page.getByRole("button", { name: new RegExp(`^${mode}`) }).click();
      await page.getByRole("button", { name: /スタート/ }).click();
      await expect(page.getByText(/構成音/)).toHaveCount(0);
      await page.getByRole("button", { name: "▶ コードを再生" }).click();
      await expect(page.getByRole("status")).toContainText(
        "コードを再生しました",
      );
      await page.getByRole("button", { name: /再生停止/ }).click();
      if (mode === "練習") {
        await page.getByRole("button", { name: /低い音/ }).click();
        await expect(
          page.getByRole("button", { name: /低い音/ }),
        ).toContainText("✓");
        await page.getByRole("button", { name: /基準音/ }).click();
        await expect(
          page.getByRole("button", { name: /基準音/ }),
        ).toContainText("✓");
      } else
        await expect(
          page.getByRole("button", { name: /ヒント|基準音/ }),
        ).toHaveCount(0);
      if (difficulty === "初級" && mode === "練習")
        await page.screenshot({
          path: `test-results/quiz-${test.info().project.name}.png`,
          fullPage: true,
        });
      let correct = 0;
      for (let i = 0; i < 10; i++) {
        const options = page.locator(".answer");
        expect(
          new Set(await options.locator("strong").allTextContents()).size,
        ).toBe(4);
        await options.first().click();
        if (
          await page
            .locator(".feedback")
            .textContent()
            .then((text) => text?.startsWith("✓ 正解"))
        )
          correct++;
        await expect(options.first()).toBeDisabled();
        await expect(page.getByText(/構成音/)).toBeVisible();
        await page
          .getByRole("button", { name: i === 9 ? /結果を見る/ : /次の問題へ/ })
          .click();
      }
      await expect(page.getByText(`正答率 ${correct * 10}%`)).toBeVisible();
      if (difficulty === "初級" && mode === "練習")
        await page.screenshot({
          path: `test-results/result-${test.info().project.name}.png`,
          fullPage: true,
        });
      await page.reload();
      await expect(page.locator(".history li")).toHaveCount(1);
      await expect(page.locator(".history li")).toContainText(
        `${difficulty} · ${mode}`,
      );
      const saved = await page.evaluate(() =>
        JSON.parse(localStorage.getItem("chord-notes.sessions.v1")!),
      );
      expect(saved[0]).toMatchObject({
        total: 10,
        correctCount: correct,
        hintCount: mode === "練習" ? 1 : 0,
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(errors).toEqual([]);
    });
}
test("keyboard shortcuts and result retry", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /スタート/ }).click();
  await page.keyboard.press("Space");
  await expect(page.getByRole("status")).toContainText("コードを再生しました");
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("1");
    await page
      .getByRole("button", { name: i === 9 ? /結果を見る/ : /次の問題へ/ })
      .click();
  }
  await page.getByRole("button", { name: "もう一度" }).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "0",
  );
  await expect(page.getByText(/構成音/)).toHaveCount(0);
});
