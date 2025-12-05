#!/usr/bin/env node
// src/cli.js
import WeChatArticleDownloader from './index.js'
import { loadConfig, generateConfigTemplate } from './config.js'
import path from 'path'

function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    urls: [],
    file: null,
    output: './output',
    workers: 4,
    help: false,
    config: null,
    initConfig: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    switch (arg) {
      case '-h':
      case '--help':
        options.help = true
        break
      case '-c':
      case '--config':
        options.config = args[++i]
        break
      case '--init-config':
      case '--generate-config':
        options.initConfig = true
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
  -c, --config <path>     指定配置文件路径
  --init-config           生成配置文件模板
  -u, --url <url>         下载单个文章URL
  -f, --file <path>       从文件读取URL列表
  -o, --output <dir>      输出目录（默认: ./output）
  -w, --workers <num>     最大并发数（默认: 4）

配置文件:
  复制 config.example.json 为 config.json 并修改配置
  或使用 --init-config 生成配置文件模板

示例:
  wechat-downloader -u "https://mp.weixin.qq.com/s/xxxxx"
  wechat-downloader -f urls.txt -o ./pdfs -w 6
  wechat-downloader -c config.json -f urls.txt
  wechat-downloader --init-config
  `)
}

async function main() {
  const options = parseArgs()

  if (options.help) {
    showHelp()
    process.exit(0)
  }

  // 处理配置文件生成
  if (options.initConfig) {
    try {
      await generateConfigTemplate('config.json')
      console.log('\n配置文件已生成: config.json')
      console.log('请编辑该文件并设置Chrome路径等配置')
      process.exit(0)
    } catch (error) {
      console.error('生成配置文件失败:', error.message)
      process.exit(1)
    }
  }

  // 加载配置文件
  let configData
  try {
    configData = await loadConfig(options.config)
  } catch (error) {
    console.warn('配置文件加载失败，使用默认设置:', error.message)
    configData = { config: null, isUsingDefault: true }
  }

  const { config } = configData

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

  // 合并命令行参数和配置文件参数（命令行优先级更高）
  const finalOutput =
    options.output !== './output' ? options.output : config?.download?.outputDir || './output'
  const finalWorkers = options.workers !== 4 ? options.workers : config?.download?.maxWorkers || 4

  const downloader = new WeChatArticleDownloader(finalOutput, {
    maxWorkers: finalWorkers,
    config: config,
  })

  try {
    await downloader.init()
    await downloader.downloadArticles(urls)
    console.log(`\n所有文件已保存到: ${path.resolve(finalOutput)}\n`)
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

main().catch(console.error)

export default main
