// examples/basic.js
import WeChatArticleDownloader from '../src/index.js'

async function example1() {
  console.log('\n=== 示例1: 基础用法 ===\n')
  const downloader = new WeChatArticleDownloader('./output/example1', { maxWorkers: 4 })
  try {
    await downloader.init()
    const urls = [
      'https://mp.weixin.qq.com/s/6JzGDxqWpr2SY_TJX0SebQ',
      'https://mp.weixin.qq.com/s/TItl1XzfxFOOJWSSkczDXw',
      'https://mp.weixin.qq.com/s/FcbM07S_BiiSvFnsgXBWxQ',
      'https://mp.weixin.qq.com/s/z60mDj1KrnKwE96RnZHQnw',
      'https://mp.weixin.qq.com/s/GGH6EnnkkTpWqG0A3i4r9g',
    ]
    await downloader.downloadArticles(urls)
  } finally {
    await downloader.close()
  }
}

async function example2() {
  console.log('\n=== 示例2: 从文件读取 ===\n')
  const downloader = new WeChatArticleDownloader('./output/example2', { maxWorkers: 4 })
  try {
    await downloader.init()
    const urls = await downloader.loadUrlsFromFile('./urls.txt')
    if (urls.length > 0) await downloader.downloadArticles(urls)
  } finally {
    await downloader.close()
  }
}

async function example3() {
  console.log('\n=== 示例3: 从HTML提取 ===\n')
  const downloader = new WeChatArticleDownloader('./output/example3', { maxWorkers: 4 })
  try {
    await downloader.init()
    const links = await downloader.extractArticleLinks('./article_list.html')
    if (links.length > 0) await downloader.downloadArticles(links)
  } finally {
    await downloader.close()
  }
}

async function main() {
  const exampleNumber = process.argv[2] || '1'
  switch (exampleNumber) {
    case '1':
      await example1()
      break
    case '2':
      await example2()
      break
    case '3':
      await example3()
      break
    default:
      console.log('用法: node examples/basic.js [1-3]')
  }
}

main().catch(console.error)
