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
