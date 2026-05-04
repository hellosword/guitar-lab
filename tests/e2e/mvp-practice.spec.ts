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

async function answerCurrentSolfeggioQuestion(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Do', exact: true }).click();
  const nextButton = page.getByRole('button', { name: '下一题' });

  if (await nextButton.isVisible().catch(() => false)) {
    await nextButton.click();
    return;
  }

  await expect(page.getByText('答对了')).toHaveCount(0, { timeout: 4_000 });
}

async function answerCurrentSolfeggioQuestionWrongAndContinue(page: Page): Promise<void> {
  const noteNames = ['G', 'A', 'B', 'C', 'D', 'E', 'F#'];
  const currentNote = await Promise.all(noteNames.map(async (noteName) => (
    (await page.getByText(noteName, { exact: true }).isVisible().catch(() => false)) ? noteName : null
  ))).then((results) => results.find((noteName): noteName is string => noteName !== null));

  if (currentNote === undefined) {
    throw new Error('没有找到当前音名唱名题的音名');
  }

  await page.getByRole('button', { name: currentNote === 'G' ? 'Re' : 'Do', exact: true }).click();
  await expect(page.getByText('再记一次')).toBeVisible();
  await page.getByRole('button', { name: /下一题|查看总结/ }).click();
}

async function selectDirection(page: Page, groupName: string, directionName: string): Promise<void> {
  await page.getByRole('button', { name: groupName, exact: true }).click();
  await page.getByRole('button', { name: directionName, exact: true }).click();
}

test('MVP 练习页可见并能完成一道音名题', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: '位置、音名、唱名反应训练' })).toBeVisible();
  const hasHorizontalPageOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(hasHorizontalPageOverflow).toBe(false);
  await expect(page.getByText('v0.0.36')).toBeVisible();
  await expect(page.getByRole('button', { name: 'G 大调' })).toBeVisible();
  await expect(page.getByRole('button', { name: '速查' })).toBeVisible();
  await expect(page.getByRole('button', { name: '综合' })).toBeVisible();
  await expect(page.getByRole('button', { name: '指板记忆' })).toBeVisible();
  await expect(page.getByRole('button', { name: '位置唱名' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '图选' })).toBeVisible();
  await expect(page.getByRole('tab', { name: '练习' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('当前通路：综合练习')).toHaveCount(0);
  await page.getByRole('button', { name: '指板记忆' }).click();
  await expect(page.getByText('音名', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('唱名', { exact: true }).first()).toBeVisible();
  await expect(page.getByLabel('选择当前调')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '位置 -> 唱名' })).toBeVisible();
  await expect(page.getByRole('button', { name: '唱名 -> 位置' })).toBeVisible();
  await expect(page.getByRole('button', { name: '音名 -> 位置' })).toHaveAttribute('title', '看到音名后，在空指板上找出当前范围内的所有位置。');
  await page.getByRole('button', { name: '图选' }).click();
  const pathDialog = page.getByRole('dialog', { name: '练习通路图' });
  await expect(pathDialog).toBeVisible();
  const graphMetrics = await pathDialog.getByTestId('practice-path-graph-scroll').evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(graphMetrics.scrollWidth).toBeGreaterThanOrEqual(graphMetrics.clientWidth);
  await expect(pathDialog.getByText('Current Path')).toHaveCount(0);
  await expect(pathDialog.getByRole('button', { name: '综合练习' })).toBeVisible();
  await expect(pathDialog.getByText('指板位置')).toBeVisible();
  await expect(pathDialog.getByText('六线谱', { exact: true })).toBeVisible();
  await expect(pathDialog.getByText('音名', { exact: true })).toBeVisible();
  await expect(pathDialog.getByText('唱名', { exact: true })).toBeVisible();
  await pathDialog.getByRole('button', { name: '关闭' }).click();
  await expect(pathDialog).toHaveCount(0);
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

test('单选题会把作答区放在题面下方并保留右侧详情', async ({ page }) => {
  await page.goto('/');

  const fretboardBox = await page.getByRole('img', { name: '吉他指板' }).first().boundingBox();
  const answerHeadingBox = await page.getByRole('heading', { name: '选择音名' }).boundingBox();
  expect(fretboardBox).not.toBeNull();
  expect(answerHeadingBox).not.toBeNull();
  if (fretboardBox !== null && answerHeadingBox !== null) {
    expect(answerHeadingBox.y).toBeGreaterThan(fretboardBox.y + fretboardBox.height);
  }

  await expect(page.getByText('练习详情')).toBeVisible();
  await expect(page.getByRole('button', { name: '播放音高' })).toBeVisible();

  await selectDirection(page, '音名唱名', '音名 -> 唱名');
  await expect(page.getByRole('heading', { name: '选择唱名' })).toBeVisible();
  await expect(page.getByText('在下方作答区选择当前调唱名')).toBeVisible();
});

test('单选题答对后会短暂停顿并自动进入下一题', async ({ page }) => {
  await page.goto('/');

  await selectDirection(page, '音名唱名', '音名 -> 唱名');
  await page.getByRole('button', { name: 'Mi', exact: true }).click();

  await expect(page.getByText('答对了')).toBeVisible();
  await expect(page.getByText('第 2 / 20 题')).toBeVisible();
  await expect(page.getByText('B', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '下一题' })).toHaveCount(0);
});

test('音名定位题点对会即时标记并在全对后自动进入下一题', async ({ page }) => {
  await page.goto('/');

  await selectDirection(page, '指板记忆', '音名 -> 位置');

  await expect(page.getByText('在空指板上找出所有这个音名的位置')).toBeVisible();
  await expect(page.getByText('G 大调 · 0-4 品 · 音名 -> 位置')).toBeVisible();
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
  await page.waitForTimeout(700);
  await expect(page.getByText('第 1 / 20 题')).toBeVisible();
  await expect(page.getByText('第 2 / 20 题')).toBeVisible();
  await expect(page.getByRole('button', { name: '下一题' })).toHaveCount(0);
});

test('音名定位题点错会立即结束并保留下一题按钮', async ({ page }) => {
  await page.goto('/');

  await selectDirection(page, '指板记忆', '音名 -> 位置');
  await page.locator('g[aria-label="播放 1 弦 0 品"]').click();

  await expect(page.getByText('再记一次')).toBeVisible();
  await expect(page.getByText('误点：1 弦 0 品')).toBeVisible();
  await expect(page.getByText('漏点：2 弦 0 品、3 弦 4 品、5 弦 2 品')).toBeVisible();
  await expect(page.locator('g[aria-label="播放 1 弦 0 品"] text')).toHaveText('×');
  await expect(page.getByRole('button', { name: '下一题' })).toBeVisible();
});

test('练习记忆会按版本写入本地并跨刷新保留', async ({ page }) => {
  await page.goto('/');

  await selectDirection(page, '指板记忆', '音名 -> 位置');
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
  expect(parsedBeforeReload.appVersion).toBe('0.0.36');
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

test('弱点地图可以随时查看音名定位弱点', async ({ page }) => {
  await page.goto('/');

  await selectDirection(page, '指板记忆', '音名 -> 位置');
  await page.locator('g[aria-label="播放 1 弦 1 品"]').click();
  await page.getByRole('tab', { name: '查看弱点' }).click();
  await expect(page.getByRole('tab', { name: '查看弱点' })).toHaveAttribute('aria-selected', 'true');

  await expect(page.getByRole('heading', { name: '随时查看的弱点地图' })).toBeVisible();
  await expect(page.getByText('G 大调 · 0-4 品 · 音名 -> 位置')).toBeVisible();
  await expect(page.getByText('Top 5 弱点位置')).toBeVisible();
  await expect(page.getByText('按近期压力排序。远期历史会逐步淡出颜色判断，但仍保留在详情里。')).toBeVisible();
  await expect(page.getByText('2 弦 0 品 · B/Mi')).toBeVisible();
  await expect(page.getByText('调外误触记录')).toBeVisible();

  await page.locator('g[aria-label="播放 2 弦 0 品"]').click();
  await expect(page.getByText('当前点击')).toBeVisible();
  await expect(page.getByText('音名/唱名：B / Mi')).toBeVisible();
});

test('音名唱名会记录映射粒度并显示对应弱点地图', async ({ page }) => {
  await page.goto('/');

  await selectDirection(page, '音名唱名', '音名 -> 唱名');
  await expect(page.getByText('B', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Do', exact: true }).click();

  const storedMemory = await page.evaluate(() => (
    window.localStorage.getItem('guitarLab.practiceMemory.v1')
  ));
  expect(storedMemory).not.toBeNull();

  const parsedMemory = JSON.parse(storedMemory ?? '{}') as {
    recentEvents?: Array<{
      mappingKind?: string;
      itemKey?: string;
      outcome?: string;
      questionType?: string;
    }>;
    masteryMap?: Record<string, {
      mappingKind?: string;
      noteName?: string;
      solfeggio?: string;
      positionId?: string;
      wrongCount?: number;
    }>;
  };
  const itemKey = 'note-to-solfeggio|G major|B|Mi|';

  expect(parsedMemory.recentEvents).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        mappingKind: 'note-to-solfeggio',
        itemKey,
        outcome: 'wrong',
        questionType: 'note-to-solfeggio',
      }),
    ]),
  );
  expect(parsedMemory.masteryMap?.[itemKey]).toEqual(
    expect.objectContaining({
      mappingKind: 'note-to-solfeggio',
      noteName: 'B',
      solfeggio: 'Mi',
      wrongCount: 1,
    }),
  );

  await page.getByRole('tab', { name: '查看弱点' }).click();
  await expect(page.getByRole('heading', { name: '音名唱名弱点地图' })).toBeVisible();
  await expect(page.getByText('G 大调 · 音名 -> 唱名')).toBeVisible();
  await expect(page.getByText('Top 5 弱点映射')).toBeVisible();
  await expect(page.getByText('B -> Mi').first()).toBeVisible();
  await expect(page.getByText('映射：B -> Mi')).toBeVisible();
});

test('唱名反向题型会出题并写入独立历史记录', async ({ page }) => {
  await page.goto('/');

  await selectDirection(page, '音名唱名', '唱名 -> 音名');
  await expect(page.getByText('在当前调里，这个唱名对应什么音名？')).toBeVisible();
  await expect(page.getByText('Mi', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'C', exact: true }).click();
  await expect(page.getByText('正确答案：B')).toBeVisible();

  let storedMemory = await page.evaluate(() => (
    window.localStorage.getItem('guitarLab.practiceMemory.v1')
  ));
  let parsedMemory = JSON.parse(storedMemory ?? '{}') as {
    recentEvents?: Array<{
      mappingKind?: string;
      itemKey?: string;
      questionType?: string;
    }>;
  };

  expect(parsedMemory.recentEvents).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        mappingKind: 'solfeggio-to-note',
        itemKey: 'solfeggio-to-note|G major|B|Mi|',
        questionType: 'solfeggio-to-note',
      }),
    ]),
  );

  await selectDirection(page, '指板记忆', '唱名 -> 位置');
  await expect(page.getByText('在空指板上找出所有这个唱名的位置')).toBeVisible();
  await expect(page.getByText('在0-4 品内找出所有 Mi')).toBeVisible();
  await page.locator('g[aria-label="播放 1 弦 0 品"]').click();
  await expect(page.getByText('再记一次')).toBeVisible();

  storedMemory = await page.evaluate(() => (
    window.localStorage.getItem('guitarLab.practiceMemory.v1')
  ));
  parsedMemory = JSON.parse(storedMemory ?? '{}') as {
    recentEvents?: Array<{
      mappingKind?: string;
      itemKey?: string;
      questionType?: string;
    }>;
  };

  expect(parsedMemory.recentEvents).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        mappingKind: 'solfeggio-to-position',
        itemKey: 'solfeggio-to-position|G major|B|Mi|2-0',
        questionType: 'solfeggio-to-positions',
      }),
    ]),
  );
});

test('组内混合不会抽到组外题型且六线谱不提供混合', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: '音名唱名', exact: true }).click();
  await page.getByRole('button', { name: '混合', exact: true }).click();
  await expect(page.getByText(/在当前调里，这个(音名唱什么|唱名对应什么音名)？/)).toBeVisible();
  await expect(page.getByRole('img', { name: '吉他指板' })).toHaveCount(0);
  await expect(page.getByRole('img', { name: '单音六线谱' })).toHaveCount(0);

  await page.getByRole('button', { name: '六线谱', exact: true }).click();
  await expect(page.getByRole('button', { name: '混合', exact: true })).toHaveCount(0);
  await expect(page.getByText('六线谱上的这个位置是什么音名？')).toBeVisible();
  await expect(page.getByRole('img', { name: '单音六线谱' })).toBeVisible();
  await expect(page.getByRole('img', { name: '吉他指板' })).toHaveCount(0);
});

test('音名唱名题使用当前调性的连续首调八度播放音高', async ({ page }) => {
  const expectedPositions = new Map([
    ['G', '3 弦 0 品'],
    ['C', '2 弦 1 品'],
    ['E', '1 弦 0 品'],
  ]);

  await page.goto('/');
  await selectDirection(page, '音名唱名', '音名 -> 唱名');

  for (let step = 0; step < 20 && expectedPositions.size > 0; step += 1) {
    let matchedCurrentQuestion = false;

    for (const [noteName, expectedPosition] of expectedPositions) {
      if (!(await page.getByText(noteName, { exact: true }).isVisible().catch(() => false))) {
        continue;
      }

      const wrongAnswer = noteName === 'G' ? 'Re' : 'Do';
      await page.getByRole('button', { name: wrongAnswer, exact: true }).click();
      await expect(page.getByRole('button', { name: '重播音高' })).toHaveAttribute('title', `重播音高：${expectedPosition}`);
      expectedPositions.delete(noteName);

      if (expectedPositions.size > 0) {
        await page.getByRole('button', { name: '下一题' }).click();
      }

      matchedCurrentQuestion = true;
      break;
    }

    if (!matchedCurrentQuestion) {
      await answerCurrentSolfeggioQuestion(page);
    }
  }

  expect([...expectedPositions.keys()]).toEqual([]);
});

test('音名唱名总结页不会显示内部播放位置', async ({ page }) => {
  const positionItemKey = 'position-to-note|G major|A|Re|5-0';
  const noteSolfeggioItemKey = 'note-to-solfeggio|G major|B|Mi|';
  const memory = {
    schemaVersion: 1,
    appVersion: '0.0.36',
    createdAt: '2026-05-04T00:00:00.000Z',
    updatedAt: '2026-05-04T00:00:00.000Z',
    profile: { id: 'test-profile' },
    configSnapshot: {
      schemaVersion: 1,
      recentWindowSize: 50,
      minSamplesForRelativeSlow: 10,
      slowPercentile: 0.7,
      slowMedianMultiplier: 1.35,
      maxValidResponseMs: 60000,
    },
    masteryMap: {
      [positionItemKey]: {
        itemKey: positionItemKey,
        mappingKind: 'position-to-note',
        key: 'G major',
        noteName: 'A',
        solfeggio: 'Re',
        positionId: '5-0',
        attempts: 4,
        correctCount: 0,
        wrongCount: 4,
        slowCount: 0,
        ignoredCount: 0,
        averageMs: 3800,
        lastMs: 3800,
        recentResponseMs: [3800],
        lastSeenAt: '2026-05-04T00:00:00.000Z',
        weaknessScore: 99,
        fastCorrectStreak: 0,
      },
      [noteSolfeggioItemKey]: {
        itemKey: noteSolfeggioItemKey,
        mappingKind: 'note-to-solfeggio',
        key: 'G major',
        noteName: 'B',
        solfeggio: 'Mi',
        attempts: 2,
        correctCount: 0,
        wrongCount: 2,
        slowCount: 0,
        ignoredCount: 0,
        averageMs: 2600,
        lastMs: 2600,
        recentResponseMs: [2600],
        lastSeenAt: '2026-05-04T00:00:00.000Z',
        weaknessScore: 4,
        fastCorrectStreak: 0,
      },
    },
    responseGroups: {},
    recentEvents: [],
  };

  await page.addInitScript((storedMemory) => {
    window.localStorage.setItem('guitarLab.practiceMemory.v1', JSON.stringify(storedMemory));
  }, memory);
  await page.goto('/');
  await selectDirection(page, '音名唱名', '音名 -> 唱名');

  for (let index = 0; index < 20; index += 1) {
    await answerCurrentSolfeggioQuestionWrongAndContinue(page);
  }

  await expect(page.getByRole('heading', { name: '本轮总结' })).toBeVisible();
  const weakestPanel = page.getByText('最需要巩固').locator('..');
  const memoryFocusPanel = page.getByText('本轮重点').locator('..');

  await expect(weakestPanel).toContainText('G 大调:');
  await expect(weakestPanel).not.toContainText('弦');
  await expect(memoryFocusPanel).toContainText('->');
  await expect(memoryFocusPanel).not.toContainText('弦');
  await expect(memoryFocusPanel).not.toContainText('@');
});

test('位置输入类练习会共享位置级自适应记录并显示弱点地图', async ({ page }) => {
  const positionNoteItemKey = 'position-to-note|G major|B|Mi|2-0';
  const positionSolfeggioItemKey = 'position-to-solfeggio|G major|D|Sol|4-0';
  const createEntry = (
    itemKey: string,
    mappingKind: string,
    noteName: string,
    solfeggio: string,
    positionId: string,
  ) => ({
    itemKey,
    mappingKind,
    key: 'G major',
    noteName,
    solfeggio,
    positionId,
    attempts: 2,
    correctCount: 0,
    wrongCount: 2,
    slowCount: 0,
    ignoredCount: 0,
    averageMs: 2600,
    lastMs: 2600,
    recentResponseMs: [2600],
    lastSeenAt: '2026-05-03T00:00:00.000Z',
    weaknessScore: 4,
    fastCorrectStreak: 0,
  });
  const createEvent = (id: string, questionType: string, mappingKind: string, itemKey: string) => ({
    id,
    createdAt: '2026-05-03T00:00:00.000Z',
    questionId: id,
    questionType,
    key: 'G major',
    mappingKind,
    itemKey,
    outcome: 'wrong',
    responseMs: 2600,
  });
  const memory = {
    schemaVersion: 1,
    appVersion: '0.0.28',
    createdAt: '2026-05-03T00:00:00.000Z',
    updatedAt: '2026-05-03T00:00:00.000Z',
    profile: { id: 'test-profile' },
    configSnapshot: {
      schemaVersion: 1,
      recentWindowSize: 50,
      minSamplesForRelativeSlow: 10,
      slowPercentile: 0.7,
      slowMedianMultiplier: 1.35,
      maxValidResponseMs: 60000,
    },
    masteryMap: {
      [positionNoteItemKey]: createEntry(positionNoteItemKey, 'position-to-note', 'B', 'Mi', '2-0'),
      [positionSolfeggioItemKey]: createEntry(positionSolfeggioItemKey, 'position-to-solfeggio', 'D', 'Sol', '4-0'),
    },
    responseGroups: {},
    recentEvents: [
      createEvent('event-position-note-1', 'board-to-note', 'position-to-note', positionNoteItemKey),
      createEvent('event-position-solfeggio-1', 'tab-to-solfeggio', 'position-to-solfeggio', positionSolfeggioItemKey),
    ],
  };

  await page.addInitScript((storedMemory) => {
    window.localStorage.setItem('guitarLab.practiceMemory.v1', JSON.stringify(storedMemory));
  }, memory);
  await page.goto('/');

  await selectDirection(page, '指板记忆', '位置 -> 音名');
  await page.getByRole('tab', { name: '查看弱点' }).click();
  await expect(page.getByRole('heading', { name: '位置音名弱点地图' })).toBeVisible();
  await expect(page.getByText('G 大调 · 0-4 品 · 位置 -> 音名')).toBeVisible();
  await expect(page.getByText('2 弦 0 品 · B/Mi')).toBeVisible();

  await page.locator('g[aria-label="播放 2 弦 0 品"]').click();
  await expect(page.getByText('音名/唱名：B / Mi')).toBeVisible();

  await selectDirection(page, '六线谱', '六线谱 -> 唱名');
  await expect(page.getByRole('heading', { name: '位置唱名弱点地图' })).toBeVisible();
  await expect(page.getByText('G 大调 · 0-4 品 · 六线谱 -> 唱名')).toBeVisible();
  await expect(page.getByText('4 弦 0 品 · D/Sol')).toBeVisible();

  await selectDirection(page, '六线谱', '六线谱 -> 音名');
  await expect(page.getByRole('heading', { name: '位置音名弱点地图' })).toBeVisible();
  await selectDirection(page, '指板记忆', '位置 -> 唱名');
  await expect(page.getByRole('heading', { name: '位置唱名弱点地图' })).toBeVisible();
});

test('指板音名调度会用本轮覆盖权重打散高弱点和 F# 固定偏置', async ({ page }) => {
  const weakBItemKey = 'position-to-note|G major|B|Mi|3-4';
  const memory = {
    schemaVersion: 1,
    appVersion: '0.0.28',
    createdAt: '2026-05-03T00:00:00.000Z',
    updatedAt: '2026-05-03T00:00:00.000Z',
    profile: { id: 'test-profile' },
    configSnapshot: {
      schemaVersion: 1,
      recentWindowSize: 50,
      minSamplesForRelativeSlow: 10,
      slowPercentile: 0.7,
      slowMedianMultiplier: 1.35,
      maxValidResponseMs: 60000,
    },
    masteryMap: {
      [weakBItemKey]: {
        itemKey: weakBItemKey,
        mappingKind: 'position-to-note',
        key: 'G major',
        noteName: 'B',
        solfeggio: 'Mi',
        positionId: '3-4',
        attempts: 4,
        correctCount: 0,
        wrongCount: 4,
        slowCount: 0,
        ignoredCount: 0,
        averageMs: 4800,
        lastMs: 4800,
        recentResponseMs: [4800],
        lastSeenAt: '2026-05-03T00:00:00.000Z',
        weaknessScore: 12,
        fastCorrectStreak: 0,
      },
    },
    responseGroups: {},
    recentEvents: [],
  };
  const answers = ['B', 'B', 'C', 'E', 'G', 'F#', 'E', 'B', 'D'];

  await page.addInitScript((storedMemory) => {
    window.localStorage.setItem('guitarLab.practiceMemory.v1', JSON.stringify(storedMemory));
  }, memory);
  await page.goto('/');
  await selectDirection(page, '指板记忆', '位置 -> 音名');

  for (const [index, answer] of answers.entries()) {
    await page.getByRole('button', { name: answer, exact: true }).click();
    if (index < answers.length - 1) {
      await expect(page.getByText(`第 ${index + 2} / 20 题`)).toBeVisible();
    }
  }

  const storedMemory = await page.evaluate(() => (
    window.localStorage.getItem('guitarLab.practiceMemory.v1')
  ));
  const parsedMemory = JSON.parse(storedMemory ?? '{}') as {
    recentEvents?: Array<{
      questionType?: string;
      itemKey?: string;
    }>;
  };
  const practicedNotes = (parsedMemory.recentEvents ?? [])
    .filter((event) => event.questionType === 'board-to-note')
    .slice(-answers.length)
    .map((event) => event.itemKey?.split('|')[2]);

  expect(practicedNotes).toEqual(answers);
  expect(practicedNotes.filter((noteName) => noteName === 'F#')).toHaveLength(1);
  expect(new Set(practicedNotes).has('D')).toBe(true);
});

test('全局唱名显示模式会同步影响练习、指板记忆和弱点地图', async ({ page }) => {
  const bItemKey = 'note-to-position|G major|B|Mi|2-0';
  const memory = {
    schemaVersion: 1,
    appVersion: '0.0.28',
    createdAt: '2026-05-03T00:00:00.000Z',
    updatedAt: '2026-05-03T00:00:00.000Z',
    profile: { id: 'test-profile' },
    configSnapshot: {
      schemaVersion: 1,
      recentWindowSize: 50,
      minSamplesForRelativeSlow: 10,
      slowPercentile: 0.7,
      slowMedianMultiplier: 1.35,
      maxValidResponseMs: 60000,
    },
    masteryMap: {
      [bItemKey]: {
        itemKey: bItemKey,
        mappingKind: 'note-to-position',
        key: 'G major',
        noteName: 'B',
        solfeggio: 'Mi',
        positionId: '2-0',
        attempts: 2,
        correctCount: 0,
        wrongCount: 2,
        slowCount: 0,
        ignoredCount: 0,
        averageMs: 2200,
        lastMs: 2200,
        recentResponseMs: [2200],
        lastSeenAt: '2026-05-03T00:00:00.000Z',
        weaknessScore: 4,
        fastCorrectStreak: 0,
      },
    },
    responseGroups: {},
    recentEvents: [{
      id: 'event-b-1',
      createdAt: '2026-05-03T00:00:00.000Z',
      questionId: 'event-b-1',
      questionType: 'note-to-positions',
      key: 'G major',
      mappingKind: 'note-to-position',
      itemKey: bItemKey,
      outcome: 'extra-position',
      responseMs: 2200,
    }],
  };

  await page.addInitScript((storedMemory) => {
    window.localStorage.setItem('guitarLab.practiceMemory.v1', JSON.stringify(storedMemory));
  }, memory);
  await page.goto('/');

  await page.getByRole('button', { name: '1 2 3' }).click();
  await selectDirection(page, '音名唱名', '音名 -> 唱名');
  await expect(page.getByRole('button', { name: '1', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '5', exact: true })).toBeVisible();

  await page.getByRole('button', { name: '速查' }).click();
  await page.getByRole('button', { name: '播放 3 弦 2 品' }).click();
  await expect(page.getByText('G 大调唱名：2')).toBeVisible();

  await page.getByRole('button', { name: '唱名标记' }).click();
  await expect(page.locator('g[aria-label="播放 3 弦 2 品"] text')).toHaveText('2');

  await page.getByRole('button', { name: '练习' }).click();
  await selectDirection(page, '指板记忆', '音名 -> 位置');
  await page.getByRole('tab', { name: '查看弱点' }).click();
  await expect(page.getByText('2 弦 0 品 · B/3')).toBeVisible();
  await page.locator('g[aria-label="播放 2 弦 0 品"]').click();
  await expect(page.getByText('音名/唱名：B / 3')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: '1 2 3' })).toHaveAttribute('aria-pressed', 'true');
});

test('弱点地图会让远期历史慢错淡出颜色判断', async ({ page }) => {
  const createEntry = (
    noteName: string,
    solfeggio: string,
    positionId: string,
    wrongCount: number,
    slowCount: number,
    fastCorrectStreak: number,
  ) => ({
    itemKey: `note-to-position|G major|${noteName}|${solfeggio}|${positionId}`,
    mappingKind: 'note-to-position',
    key: 'G major',
    noteName,
    solfeggio,
    positionId,
    attempts: 10,
    correctCount: 10 - wrongCount,
    wrongCount,
    slowCount,
    ignoredCount: 0,
    averageMs: 1600,
    lastMs: 900,
    recentResponseMs: [1200, 1000, 900],
    lastSeenAt: '2026-05-03T00:00:00.000Z',
    weaknessScore: 0,
    fastCorrectStreak,
  });
  const createEvent = (id: string, itemKey: string, outcome: string, responseMs: number) => ({
    id,
    createdAt: '2026-05-03T00:00:00.000Z',
    questionId: id,
    questionType: 'note-to-positions',
    key: 'G major',
    mappingKind: 'note-to-position',
    itemKey,
    outcome,
    responseMs,
  });
  const bItemKey = 'note-to-position|G major|B|Mi|2-0';
  const dItemKey = 'note-to-position|G major|D|Sol|4-0';
  const aItemKey = 'note-to-position|G major|A|Re|5-0';
  const memory = {
    schemaVersion: 1,
    appVersion: '0.0.13',
    createdAt: '2026-05-03T00:00:00.000Z',
    updatedAt: '2026-05-03T00:00:00.000Z',
    profile: { id: 'test-profile' },
    configSnapshot: {
      schemaVersion: 1,
      recentWindowSize: 50,
      minSamplesForRelativeSlow: 10,
      slowPercentile: 0.7,
      slowMedianMultiplier: 1.35,
      maxValidResponseMs: 60000,
    },
    masteryMap: {
      [bItemKey]: createEntry('B', 'Mi', '2-0', 3, 4, 5),
      [dItemKey]: createEntry('D', 'Sol', '4-0', 0, 1, 0),
      [aItemKey]: createEntry('A', 'Re', '5-0', 0, 0, 0),
    },
    responseGroups: {},
    recentEvents: [
      createEvent('event-b-1', bItemKey, 'fast-correct', 900),
      createEvent('event-b-2', bItemKey, 'fast-correct', 850),
      createEvent('event-b-3', bItemKey, 'fast-correct', 800),
      createEvent('event-d-1', dItemKey, 'slow-correct', 4200),
      createEvent('event-a-1', aItemKey, 'extra-position', 2800),
    ],
  };

  await page.addInitScript((storedMemory) => {
    window.localStorage.setItem('guitarLab.practiceMemory.v1', JSON.stringify(storedMemory));
  }, memory);
  await page.goto('/');

  await selectDirection(page, '指板记忆', '音名 -> 位置');
  await page.getByRole('tab', { name: '查看弱点' }).click();

  await expect(page.getByText('5 弦 0 品 · A/Re')).toBeVisible();
  await expect(page.getByText('4 弦 0 品 · D/Sol')).toBeVisible();
  await expect(page.getByText('2 弦 0 品 · B/Mi')).toHaveCount(0);

  await page.locator('g[aria-label="播放 2 弦 0 品"]').click();
  await expect(page.getByText('状态：熟练')).toBeVisible();
  await expect(page.getByText('近期压力：-3.0，弱点分 0')).toBeVisible();
  await expect(page.getByText('历史慢速：4')).toBeVisible();
});

test('音名定位会从位置权重反推音名并纳入未知位置', async ({ page }) => {
  const memory = {
    schemaVersion: 1,
    appVersion: '0.0.13',
    createdAt: '2026-05-03T00:00:00.000Z',
    updatedAt: '2026-05-03T00:00:00.000Z',
    profile: { id: 'test-profile' },
    configSnapshot: {
      schemaVersion: 1,
      recentWindowSize: 50,
      minSamplesForRelativeSlow: 10,
      slowPercentile: 0.7,
      slowMedianMultiplier: 1.35,
      maxValidResponseMs: 60000,
    },
    masteryMap: {
      'note-to-position|G major|B|Mi|5-2': {
        itemKey: 'note-to-position|G major|B|Mi|5-2',
        mappingKind: 'note-to-position',
        key: 'G major',
        noteName: 'B',
        solfeggio: 'Mi',
        positionId: '5-2',
        attempts: 1,
        correctCount: 0,
        wrongCount: 1,
        slowCount: 0,
        ignoredCount: 0,
        averageMs: 3200,
        lastMs: 3200,
        recentResponseMs: [3200],
        lastSeenAt: '2026-05-03T00:00:00.000Z',
        weaknessScore: 3,
        fastCorrectStreak: 0,
      },
    },
    responseGroups: {},
    recentEvents: [],
  };

  await page.addInitScript((storedMemory) => {
    window.localStorage.setItem('guitarLab.practiceMemory.v1', JSON.stringify(storedMemory));
  }, memory);
  await page.goto('/');

  await selectDirection(page, '指板记忆', '音名 -> 位置');

  await expect(page.getByText('在0-4 品内找出所有 B')).toBeVisible();
  await expect(page.getByText('已找到 0 / 3')).toBeVisible();
  await expect(page.getByText('已提示的')).toHaveCount(0);
  await expect(page.locator('g[aria-label="播放 2 弦 0 品"] text')).toHaveCount(0);
  await expect(page.locator('g[aria-label="播放 3 弦 4 品"] text')).toHaveCount(0);
  await expect(page.locator('g[aria-label="播放 5 弦 2 品"] text')).toHaveCount(0);

  await page.locator('g[aria-label="播放 2 弦 0 品"]').click();
  await page.locator('g[aria-label="播放 3 弦 4 品"]').click();
  await page.locator('g[aria-label="播放 5 弦 2 品"]').click();
  await expect(page.locator('g[aria-label="播放 5 弦 2 品"] text')).toHaveText('✓');
});

test('音名定位动态权重会清空已出音名的覆盖压力', async ({ page }) => {
  const memory = {
    schemaVersion: 1,
    appVersion: '0.0.13',
    createdAt: '2026-05-03T00:00:00.000Z',
    updatedAt: '2026-05-03T00:00:00.000Z',
    profile: { id: 'test-profile' },
    configSnapshot: {
      schemaVersion: 1,
      recentWindowSize: 50,
      minSamplesForRelativeSlow: 10,
      slowPercentile: 0.7,
      slowMedianMultiplier: 1.35,
      maxValidResponseMs: 60000,
    },
    masteryMap: {},
    responseGroups: {},
    recentEvents: [],
  };

  await page.addInitScript((storedMemory) => {
    window.localStorage.setItem('guitarLab.practiceMemory.v1', JSON.stringify(storedMemory));
  }, memory);
  await page.goto('/');

  await selectDirection(page, '指板记忆', '音名 -> 位置');
  await expect(page.getByText('在0-4 品内找出所有 B')).toBeVisible();

  await page.locator('g[aria-label="播放 2 弦 0 品"]').click();
  await page.locator('g[aria-label="播放 3 弦 4 品"]').click();
  await page.locator('g[aria-label="播放 5 弦 2 品"]').click();

  await expect(page.getByText('在0-4 品内找出所有 B')).toHaveCount(0);
});

test('音名定位会低频复查熟练位置并提示其余熟练位置', async ({ page }) => {
  const memory = {
    schemaVersion: 1,
    appVersion: '0.0.13',
    createdAt: '2026-05-03T00:00:00.000Z',
    updatedAt: '2026-05-03T00:00:00.000Z',
    profile: { id: 'test-profile' },
    configSnapshot: {
      schemaVersion: 1,
      recentWindowSize: 50,
      minSamplesForRelativeSlow: 10,
      slowPercentile: 0.7,
      slowMedianMultiplier: 1.35,
      maxValidResponseMs: 60000,
    },
    masteryMap: {
      'note-to-position|G major|B|Mi|2-0': {
        itemKey: 'note-to-position|G major|B|Mi|2-0',
        mappingKind: 'note-to-position',
        key: 'G major',
        noteName: 'B',
        solfeggio: 'Mi',
        positionId: '2-0',
        attempts: 10,
        correctCount: 10,
        wrongCount: 0,
        slowCount: 0,
        ignoredCount: 0,
        averageMs: 900,
        lastMs: 850,
        recentResponseMs: [950, 850, 900, 880, 870],
        lastSeenAt: '2026-05-03T00:00:00.000Z',
        weaknessScore: 0,
        fastCorrectStreak: 5,
      },
      'note-to-position|G major|B|Mi|5-2': {
        itemKey: 'note-to-position|G major|B|Mi|5-2',
        mappingKind: 'note-to-position',
        key: 'G major',
        noteName: 'B',
        solfeggio: 'Mi',
        positionId: '5-2',
        attempts: 10,
        correctCount: 10,
        wrongCount: 0,
        slowCount: 0,
        ignoredCount: 0,
        averageMs: 1100,
        lastMs: 1000,
        recentResponseMs: [1200, 1000, 980, 960, 940],
        lastSeenAt: '2026-05-03T00:00:00.000Z',
        weaknessScore: 0,
        fastCorrectStreak: 5,
      },
      'note-to-position|G major|B|Mi|3-4': {
        itemKey: 'note-to-position|G major|B|Mi|3-4',
        mappingKind: 'note-to-position',
        key: 'G major',
        noteName: 'B',
        solfeggio: 'Mi',
        positionId: '3-4',
        attempts: 10,
        correctCount: 10,
        wrongCount: 0,
        slowCount: 0,
        ignoredCount: 0,
        averageMs: 950,
        lastMs: 900,
        recentResponseMs: [1100, 1000, 950, 930, 900],
        lastSeenAt: '2026-05-03T00:00:00.000Z',
        weaknessScore: 0,
        fastCorrectStreak: 5,
      },
    },
    responseGroups: {},
    recentEvents: [],
  };

  await page.addInitScript((storedMemory) => {
    window.localStorage.setItem('guitarLab.practiceMemory.v1', JSON.stringify(storedMemory));
  }, memory);
  await page.goto('/');

  await selectDirection(page, '指板记忆', '音名 -> 位置');

  await expect(page.getByText('已找到 0 / 1')).toBeVisible();
  await expect(page.getByText('已提示的 2 个位置已用音名圆点标出。')).toBeVisible();
  await expect(page.locator('g[aria-label="播放 2 弦 0 品"] text')).toHaveCount(0);
  await expect(page.locator('g[aria-label="播放 3 弦 4 品"] text')).toHaveText('B');
  await expect(page.locator('g[aria-label="播放 5 弦 2 品"] text')).toHaveText('B');

  await page.locator('g[aria-label="播放 2 弦 0 品"]').click();
  await expect(page.locator('g[aria-label="播放 2 弦 0 品"] text')).toHaveText('✓');
  await expect(page.getByText('答对了')).toBeVisible();
  await expect(page.getByText('答对了')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '下一题' })).toHaveCount(0);
});

test('练习模式切换会立即重开对应题型并保留到调性切换', async ({ page }) => {
  await page.goto('/');

  await selectDirection(page, '六线谱', '六线谱 -> 唱名');
  await expect(page.getByText('第 1 / 20 题')).toBeVisible();
  await expect(page.getByText('在当前调里，六线谱上的这个位置唱什么？')).toBeVisible();
  await expect(page.getByText('G 大调 · 0-4 品 · 六线谱 -> 唱名')).toBeVisible();
  await expect(page.getByRole('img', { name: '单音六线谱' })).toBeVisible();
  await expect(page.getByText('对应指板位置')).toHaveCount(0);
  await expect(page.getByRole('img', { name: '吉他指板' })).toHaveCount(0);

  await selectDirection(page, '指板记忆', '音名 -> 位置');
  await expect(page.getByText('在空指板上找出所有这个音名的位置')).toBeVisible();

  await page.getByRole('button', { name: 'C 大调' }).click();
  await expect(page.getByText('第 1 / 20 题')).toBeVisible();
  await expect(page.getByText('C 大调 · 0-3 品 · 音名 -> 位置')).toBeVisible();
  await expect(page.getByText('在空指板上找出所有这个音名的位置')).toBeVisible();
});

test('指板记忆页可以切换标记并点击位置查看映射', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: '速查' }).click();

  await expect(page.getByRole('heading', { name: '随时打开的指板速查' })).toBeVisible();
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
