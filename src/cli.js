#!/usr/bin/env node
// src/cli.js
const WeChatArticleDownloader = require('./index')
const path = require('path')

function parseArgs() {
  const args = process.argv.slice(2)
  const options = { urls: [], file: null, output: './output', workers: 4, help: false }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    switch (arg) {
      case '-h':
      case '--help':
        options.help = true
        break
      case '-f':
      case '--file':
        options.file = args[++i]
        break
      case '-o':
      case '--output':
        options.output = args[++i]
        break
      case '-w':
      case '--workers':
        options.workers = parseInt(args[++i]) || 4
        break
      case '-u':
      case '--url':
        options.urls.push(args[++i])
        break
      default:
        if (arg.startsWith('http')) options.urls.push(arg)
    }
  }
  return options
}

function showHelp() {
  console.log(`
微信公众号文章批量下载器

用法:
  wechat-downloader [选项]

选项:
  -h, --help              显示帮助信息
  -u, --url <url>         下载单个文章URL
  -f, --file <path>       从文件读取URL列表
  -o, --output <dir>      输出目录（默认: ./output）
  -w, --workers <num>     最大并发数（默认: 4）

示例:
  wechat-downloader -u "https://mp.weixin.qq.com/s/xxxxx"
  wechat-downloader -f urls.txt -o ./pdfs -w 6
  `)
}

async function main() {
  const options = parseArgs()

  if (options.help) {
    showHelp()
    process.exit(0)
  }

  let urls = [...options.urls]

  if (options.file) {
    const downloader = new WeChatArticleDownloader()
    const fileUrls = await downloader.loadUrlsFromFile(options.file)
    urls.push(...fileUrls)
  }

  if (urls.length === 0) {
    console.error('错误: 未提供任何URL')
    console.log('使用 -h 或 --help 查看帮助信息\n')
    process.exit(1)
  }

  const downloader = new WeChatArticleDownloader(options.output, { maxWorkers: options.workers })

  try {
    await downloader.init()
    await downloader.downloadArticles(urls)
    console.log(`\n所有文件已保存到: ${path.resolve(options.output)}\n`)
  } catch (error) {
    console.error('\n程序执行失败:', error.message)
    process.exit(1)
  } finally {
    await downloader.close()
  }
}

process.on('unhandledRejection', (error) => {
  console.error('未处理的Promise错误:', error)
  process.exit(1)
})

process.on('SIGINT', async () => {
  console.log('\n\n收到中断信号，正在清理资源...')
  process.exit(0)
})

if (require.main === module) {
  main().catch(console.error)
}

module.exports = main
