import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function clickWrongPositionAndContinue(page: Page): Promise<void> {
  await page.locator('g[aria-label="播放 5 弦 1 品"]').click();
  await page.getByRole('button', { name: '下一题' }).click();
}

async function partiallyAnswerBPositionQuestion(page: Page): Promise<void> {
  await page.locator('g[aria-label="播放 2 弦 0 品"]').click();
  await page.locator('g[aria-label="播放 5 弦 2 品"]').click();
  await page.locator('g[aria-label="播放 5 弦 1 品"]').click();
  await expect(page.getByText('再记一次')).toBeVisible();
  await page.getByRole('button', { name: '下一题' }).click();
}

test('MVP 练习页可见并能完成一道音名题', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: '位置、音名、唱名反应训练' })).toBeVisible();
  await expect(page.getByText('v0.0.8')).toBeVisible();
  await expect(page.getByRole('button', { name: 'G 大调' })).toBeVisible();
  await expect(page.getByRole('button', { name: '综合练习' })).toBeVisible();
  await expect(page.getByText('第 1 / 20 题')).toBeVisible();
  await expect(page.getByText('指板上高亮的位置是什么音名？')).toBeVisible();
  await expect(page.getByRole('img', { name: '吉他指板' })).toBeVisible();
  await page.getByRole('img', { name: '吉他指板' }).locator('g[aria-label^="播放"]').first().click();

  await page.getByRole('button', { name: 'C', exact: true }).click();

  await expect(page.getByText('正确答案：')).toBeVisible();
  await expect(page.getByText('位置：')).toBeVisible();
  await expect(page.getByText('音名：')).toBeVisible();
  await expect(page.getByText('G 大调唱名：')).toBeVisible();
  await expect(page.getByText('反应链：')).toBeVisible();
  await expect(page.getByRole('button', { name: '重播音高' })).toBeVisible();
  await expect(page.getByRole('button', { name: '下一题' })).toBeVisible();
});

test('音名定位题点对会即时标记并在全对后自动进入下一题', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: '音名定位' }).click();

  await expect(page.getByText('在空指板上找出所有这个音名的位置')).toBeVisible();
  await expect(page.getByText('G 大调 · 0-4 品 · 音名定位')).toBeVisible();
  await expect(page.getByText('选择所有位置')).toBeVisible();
  await expect(page.getByText('空指板', { exact: true })).toBeVisible();
  await expect(page.getByText('已找到 0 / 3')).toBeVisible();
  await expect(page.getByRole('button', { name: '提交答案' })).toHaveCount(0);

  await page.locator('g[aria-label="播放 2 弦 0 品"]').click();
  await expect(page.getByText('已找到 1 / 3')).toBeVisible();
  await expect(page.locator('g[aria-label="播放 2 弦 0 品"] text')).toHaveText('✓');

  await page.locator('g[aria-label="播放 3 弦 4 品"]').click();
  await page.locator('g[aria-label="播放 5 弦 2 品"]').click();

  await expect(page.locator('g[aria-label="播放 5 弦 2 品"] text')).toHaveText('✓');
  await expect(page.getByText('答对了')).toBeVisible();
  await expect(page.getByText('第 2 / 20 题')).toBeVisible();
  await expect(page.getByRole('button', { name: '下一题' })).toHaveCount(0);
});

test('音名定位题点错会立即结束并保留下一题按钮', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: '音名定位' }).click();
  await page.locator('g[aria-label="播放 1 弦 0 品"]').click();

  await expect(page.getByText('再记一次')).toBeVisible();
  await expect(page.getByText('误点：1 弦 0 品')).toBeVisible();
  await expect(page.getByText('漏点：2 弦 0 品、3 弦 4 品、5 弦 2 品')).toBeVisible();
  await expect(page.locator('g[aria-label="播放 1 弦 0 品"] text')).toHaveText('×');
  await expect(page.getByRole('button', { name: '下一题' })).toBeVisible();
});

test('练习记忆会按版本写入本地并跨刷新保留', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: '音名定位' }).click();
  await page.locator('g[aria-label="播放 1 弦 0 品"]').click();

  const storedBeforeReload = await page.evaluate(() => (
    window.localStorage.getItem('guitarLab.practiceMemory.v1')
  ));
  expect(storedBeforeReload).not.toBeNull();

  const parsedBeforeReload = JSON.parse(storedBeforeReload ?? '{}') as {
    schemaVersion?: number;
    appVersion?: string;
    recentEvents?: unknown[];
    masteryMap?: Record<string, unknown>;
  };

  expect(parsedBeforeReload.schemaVersion).toBe(1);
  expect(parsedBeforeReload.appVersion).toBe('0.0.8');
  expect(parsedBeforeReload.recentEvents?.length).toBeGreaterThan(0);
  expect(Object.keys(parsedBeforeReload.masteryMap ?? {}).length).toBeGreaterThan(0);
  expect(parsedBeforeReload.recentEvents).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ outcome: 'extra-position' }),
      expect.objectContaining({ outcome: 'missed-position' }),
    ]),
  );

  await page.reload();

  const storedAfterReload = await page.evaluate(() => (
    window.localStorage.getItem('guitarLab.practiceMemory.v1')
  ));
  expect(storedAfterReload).toBe(storedBeforeReload);
});

test('音名定位会把本轮已掌握位置预标成音名提示', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: '音名定位' }).click();
  await partiallyAnswerBPositionQuestion(page);

  for (let index = 0; index < 6; index += 1) {
    await clickWrongPositionAndContinue(page);
  }

  await partiallyAnswerBPositionQuestion(page);

  for (let index = 0; index < 6; index += 1) {
    await clickWrongPositionAndContinue(page);
  }

  await expect(page.getByText('已找到 0 / 1')).toBeVisible();
  await expect(page.getByText('已掌握的 2 个位置已用音名圆点提示。')).toBeVisible();
  await expect(page.locator('g[aria-label="播放 2 弦 0 品"] text')).toHaveText('B');
  await expect(page.locator('g[aria-label="播放 5 弦 2 品"] text')).toHaveText('B');

  await page.locator('g[aria-label="播放 3 弦 4 品"]').click();
  await expect(page.locator('g[aria-label="播放 3 弦 4 品"] text')).toHaveText('✓');
  await expect(page.getByText('答对了')).toBeVisible();
  await expect(page.getByText('答对了')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '下一题' })).toHaveCount(0);
});

test('练习模式切换会立即重开对应题型并保留到调性切换', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: '六线谱唱名' }).click();
  await expect(page.getByText('第 1 / 20 题')).toBeVisible();
  await expect(page.getByText('在当前调里，六线谱上的这个位置唱什么？')).toBeVisible();
  await expect(page.getByText('G 大调 · 0-4 品 · 六线谱唱名')).toBeVisible();

  await page.getByRole('button', { name: '音名定位' }).click();
  await expect(page.getByText('在空指板上找出所有这个音名的位置')).toBeVisible();

  await page.getByRole('button', { name: 'C 大调' }).click();
  await expect(page.getByText('第 1 / 20 题')).toBeVisible();
  await expect(page.getByText('C 大调 · 0-3 品 · 音名定位')).toBeVisible();
  await expect(page.getByText('在空指板上找出所有这个音名的位置')).toBeVisible();
});

test('指板记忆页可以切换标记并点击位置查看映射', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: '指板记忆' }).click();

  await expect(page.getByRole('heading', { name: '随时打开的指板记忆' })).toBeVisible();
  await expect(page.getByText('G 大调音名 / 唱名映射')).toBeVisible();
  await expect(page.getByText('音名', { exact: true })).toBeVisible();
  await expect(page.getByText('唱名', { exact: true })).toBeVisible();
  await expect(page.getByLabel('显示非当前大调内音')).not.toBeChecked();

  await page.getByRole('button', { name: '播放 3 弦 2 品' }).click();
  await expect(page.getByText('位置：3 弦 2 品')).toBeVisible();
  await expect(page.getByText('音名：A')).toBeVisible();
  await expect(page.getByText('G 大调唱名：Re')).toBeVisible();

  const fretboard = page.getByRole('img', { name: '吉他指板' });
  const box = await fretboard.boundingBox();
  expect(box).not.toBeNull();
  if (box !== null) {
    await page.mouse.click(box.x + box.width * 0.42, box.y + box.height * 0.5);
  }
  await expect(page.getByText(/^位置：/)).toBeVisible();

  await expect(page.getByText('G#')).toHaveCount(0);
  await page.getByLabel('显示非当前大调内音').check();
  await expect(page.getByText('G#').first()).toBeVisible();

  await page.getByRole('button', { name: '聚焦 D' }).first().hover();
  await expect(page.locator('g[aria-label="播放 3 弦 2 品"] text')).toHaveAttribute('fill', '#94a3b8');
  await expect(page.locator('g[aria-label="播放 4 弦 0 品"] text')).toHaveAttribute('fill', '#ffffff');

  await page.getByRole('button', { name: '唱名标记' }).click();
  await expect(page.getByRole('button', { name: '唱名标记' })).toBeVisible();
});
