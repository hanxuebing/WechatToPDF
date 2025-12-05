// examples/basic.js
import WeChatArticleDownloader from '../src/index.js'
import { loadConfig } from '../src/config.js'

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

async function example4() {
  console.log('\n=== 示例4: 使用配置文件 ===\n')

  // 检查命令行参数中是否指定了配置文件
  const configArg = process.argv.find((arg, index) => {
    return (arg === '-c' || arg === '--config') && process.argv[index + 1]
  })
  const configPath = configArg ? process.argv[process.argv.indexOf(configArg) + 1] : null

  try {
    // 加载配置文件
    const { config } = await loadConfig(configPath)

    // 使用配置文件中的参数
    const outputDir = config?.download?.outputDir || './output/example4'
    const maxWorkers = config?.download?.maxWorkers || 4

    const downloader = new WeChatArticleDownloader(outputDir, {
      maxWorkers,
      config,
    })

    await downloader.init()
    const urls = [
      'https://mp.weixin.qq.com/s/6JzGDxqWpr2SY_TJX0SebQ',
      'https://mp.weixin.qq.com/s/TItl1XzfxFOOJWSSkczDXw',
    ]
    await downloader.downloadArticles(urls)
  } catch (error) {
    console.error('配置文件示例失败:', error.message)
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
    case '4':
      await example4()
      break
    default:
      console.log('用法: node examples/basic.js [1-4]')
      console.log('示例:')
      console.log('  node examples/basic.js 1           # 基础用法')
      console.log('  node examples/basic.js 2           # 从文件读取')
      console.log('  node examples/basic.js 3           # 从HTML提取')
      console.log('  node examples/basic.js 4           # 使用配置文件')
      console.log('  node examples/basic.js 4 -c config.json  # 指定配置文件')
  }
}

main().catch(console.error)
