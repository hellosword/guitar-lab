import { expect, test } from '@playwright/test';

test('MVP 练习页可见并能完成一道音名题', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: '位置、音名、唱名反应训练' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'G 大调' })).toBeVisible();
  await expect(page.getByText('第 1 / 20 题')).toBeVisible();
  await expect(page.getByText('指板上高亮的位置是什么音名？')).toBeVisible();
  await expect(page.getByRole('button', { name: '播放 3 弦 2 品' })).toBeVisible();
  await page.getByRole('button', { name: '播放 3 弦 2 品' }).click();

  await page.getByRole('button', { name: 'C', exact: true }).click();

  await expect(page.getByText('正确答案：')).toBeVisible();
  await expect(page.getByText('位置：')).toBeVisible();
  await expect(page.getByText('音名：')).toBeVisible();
  await expect(page.getByText('G 大调唱名：')).toBeVisible();
  await expect(page.getByText('反应链：')).toBeVisible();
  await expect(page.getByRole('button', { name: '重播音高' })).toBeVisible();
  await expect(page.getByRole('button', { name: '下一题' })).toBeVisible();
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
