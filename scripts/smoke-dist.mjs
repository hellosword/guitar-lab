import { existsSync, readFileSync } from 'node:fs';
import { createStaticServer } from './static-preview.mjs';

const host = '127.0.0.1';
const port = 4183;
const baseUrl = `http://${host}:${port}`;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function fetchText(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`);
  assert(response.ok, `${pathname} 请求失败：${response.status}`);
  return response.text();
}

async function postJson(pathname, body) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  assert(response.ok, `${pathname} POST 请求失败：${response.status}`);
}

async function main() {
  assert(existsSync('dist/index.html'), 'dist/index.html 不存在，请先运行 npm run build');

  const server = createStaticServer();
  await new Promise((resolve) => {
    server.listen(port, host, resolve);
  });

  try {
    const indexHtml = await fetchText('/');
    assert(indexHtml.includes('<div id="root"></div>'), '首页缺少 React root 节点');
    assert(indexHtml.includes('manifest.webmanifest'), '首页缺少 PWA manifest 引用');

    const assetMatches = [...indexHtml.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((match) => match[1]);
    assert(assetMatches.length > 0, '首页没有引用构建后的 JS/CSS 资源');

    for (const assetPath of assetMatches) {
      const body = await fetchText(assetPath);
      assert(body.length > 0, `${assetPath} 内容为空`);
    }

    const manifest = await fetchText('/manifest.webmanifest');
    assert(manifest.includes('Guitar Lab'), 'manifest 内容不符合预期');

    const htmlOnDisk = readFileSync('dist/index.html', 'utf8');
    assert(htmlOnDisk.includes('assets/'), 'dist/index.html 未引用 assets 目录');

    const devPracticeData = {
      schemaVersion: 1,
      appVersion: 'smoke',
      masteryMap: {},
      recentEvents: [],
    };
    await postJson('/__dev/practice-data', devPracticeData);
    const devPracticeDataText = await fetchText('/__dev/practice-data');
    assert(devPracticeDataText.includes('"appVersion":"smoke"'), '开发期练习数据接口未能正常读写');

    console.log('Smoke test passed: dist 可静态访问，首页、资源、manifest 和开发期数据接口均正常。');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
