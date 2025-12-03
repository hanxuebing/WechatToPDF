// src/index.js
import { promises as fs } from 'fs'
import path from 'path'
import workerpool from 'workerpool'
import os from 'os'
import * as cheerio from 'cheerio'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

class WeChatArticleDownloader {
  constructor(outputDir = './output', options = {}) {
    this.outputDir = outputDir
    this.maxWorkers = options.maxWorkers || Math.min(os.cpus().length, 4)
    this.pool = null
  }

  async init() {
    await fs.mkdir(this.outputDir, { recursive: true })
    this.pool = workerpool.pool(path.join(__dirname, 'worker.js'), {
      minWorkers: 1,
      maxWorkers: this.maxWorkers,
      workerType: 'thread',
    })
    console.log(`✓ 线程池已初始化 (最大并发: ${this.maxWorkers})`)
  }

  async downloadArticles(urls) {
    const startTime = Date.now()
    if (!this.pool) await this.init()

    console.log(`\n开始下载 ${urls.length} 篇文章...`)
    console.log(`并发数: ${this.maxWorkers}\n`)

    try {
      const tasks = urls.map((url, index) => {
        return this.pool
          .exec('downloadArticle', [url, this.outputDir])
          .then((result) => {
            if (result.success) {
              console.log(`✓ [${index + 1}/${urls.length}] ${result.title}`)
            } else {
              console.error(`✗ [${index + 1}/${urls.length}] 失败: ${url}`)
            }
            return result
          })
          .catch((error) => {
            console.error(`✗ [${index + 1}/${urls.length}] 错误: ${error.message}`)
            return { success: false, error: error.message, url }
          })
      })

      const results = await Promise.all(tasks)
      const duration = ((Date.now() - startTime) / 1000).toFixed(2)
      const successCount = results.filter((r) => r.success).length

      console.log(`\n${'='.repeat(50)}`)
      console.log(`下载完成！`)
      console.log(`成功: ${successCount}/${results.length}`)
      console.log(`总耗时: ${duration}秒`)
      console.log(`平均速度: ${(results.length / duration).toFixed(2)} 篇/秒`)
      console.log(`${'='.repeat(50)}\n`)

      const failures = results.filter((r) => !r.success)
      if (failures.length > 0) {
        console.log('失败的任务:')
        failures.forEach((f, i) => {
          console.log(`  ${i + 1}. ${f.url}`)
          console.log(`     原因: ${f.error}\n`)
        })
      }

      return results
    } catch (error) {
      console.error('下载过程出错:', error)
      throw error
    }
  }

  async extractArticleLinks(htmlFilePath) {
    try {
      const html = await fs.readFile(htmlFilePath, 'utf-8')
      const $ = cheerio.load(html)
      const links = []

      $('a[href*="mp.weixin.qq.com"]').each((i, elem) => {
        const href = $(elem).attr('href')
        if (href && href.includes('mp.weixin.qq.com/s')) {
          links.push(href)
        }
      })

      const uniqueLinks = [...new Set(links)]
      console.log(`从 ${htmlFilePath} 中提取到 ${uniqueLinks.length} 个链接`)
      return uniqueLinks
    } catch (error) {
      console.error(`读取HTML文件失败: ${error.message}`)
      return []
    }
  }

  async loadUrlsFromFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const urls = content
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && line.startsWith('http'))
      console.log(`从 ${filePath} 中加载了 ${urls.length} 个链接`)
      return urls
    } catch (error) {
      console.error(`读取文件失败: ${error.message}`)
      return []
    }
  }

  getPoolStats() {
    return this.pool ? this.pool.stats() : null
  }

  async close() {
    if (this.pool) {
      await this.pool.terminate()
      this.pool = null
      console.log('✓ 线程池已关闭')
    }
  }
}

export default WeChatArticleDownloader
