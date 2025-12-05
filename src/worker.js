// src/worker.js - 支持 puppeteer-core 的版本
import workerpool from 'workerpool'
import path from 'path'
import fs from 'fs'

// 自动检测使用 puppeteer 还是 puppeteer-core
let puppeteer
let usePuppeteerCore = false
try {
  const puppeteerCore = await import('puppeteer-core')
  puppeteer = puppeteerCore.default
  usePuppeteerCore = true
  console.log('使用 puppeteer-core')
} catch (e) {
  const puppeteerModule = await import('puppeteer')
  puppeteer = puppeteerModule.default
  console.log('使用 puppeteer')
}

// 自动检测 Chrome 路径
function getChromePath() {
  const platform = process.platform

  // 可能的 Chrome 路径
  const possiblePaths = {
    linux: [
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/snap/bin/chromium',
    ],
    darwin: [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ],
    win32: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
    ],
  }

  const paths = possiblePaths[platform] || []

  // 尝试找到第一个存在的路径
  for (const chromePath of paths) {
    if (fs.existsSync(chromePath)) {
      return chromePath
    }
  }

  // 如果找不到，返回 null（让 puppeteer 使用默认路径）
  return null
}

// 模块级别缓存 Chrome 路径，避免重复检测
const chromePath = usePuppeteerCore ? process.env.CHROME_PATH || getChromePath() : null

// Worker中的下载函数
async function downloadArticle(url, outputDir, filename, config) {
  let browser = null

  try {
    // 使用配置文件中的Chrome参数，如果有的话
    const defaultArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-blink-features=AutomationControlled',
    ]

    const launchOptions = {
      args: config?.chrome?.args || defaultArgs,
    }

    // Chrome路径优先级：配置文件 > 环境变量 > 自动检测
    let finalChromePath = chromePath

    if (usePuppeteerCore) {
      if (config?.chrome?.path) {
        finalChromePath = config.chrome.path
        console.log(`使用配置文件中的Chrome路径: ${finalChromePath}`)
      } else if (chromePath) {
        console.log(`使用检测到的Chrome路径: ${chromePath}`)
      }

      if (finalChromePath) {
        launchOptions.executablePath = finalChromePath
      } else {
        // 如果找不到 Chrome，尝试使用系统安装的 Chrome
        try {
          launchOptions.channel = 'chrome'
          console.log('尝试使用系统安装的 Chrome')
        } catch (fallbackError) {
          throw new Error(
            'puppeteer-core 需要指定 Chrome 路径。\n' +
              '请在配置文件中设置 chrome.path\n' +
              '或设置环境变量: export CHROME_PATH=/path/to/chrome\n' +
              '或安装 Chrome: npx puppeteer browsers install chrome\n' +
              '或者降级使用 puppeteer 替代 puppeteer-core',
          )
        }
      }
    }

    // 启动浏览器
    browser = await puppeteer.launch(launchOptions)

    const page = await browser.newPage()

    // 设置用户代理和视口
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    )
    await page.setViewport({ width: 1920, height: 1080 })

    // 访问文章
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    })

    // 等待文章内容加载
    await page.waitForSelector('#js_content, .rich_media_content', {
      timeout: 10000,
    })
    // 加载所有图片 防止图片懒加载生成pdf没有图片
    await loadAllImages(page)

    // 获取标题
    const title = await page.evaluate(() => {
      const titleElem = document.querySelector('#activity-name, .rich_media_title')
      return titleElem ? titleElem.textContent.trim() : 'untitled'
    })

    // 生成PDF
    const safeFilename = sanitizeFilename(filename || title)
    const pdfPath = path.join(outputDir, `${safeFilename}.pdf`)

    // 使用配置文件中的PDF参数，如果有的话
    const defaultPdfOptions = {
      format: 'A4',
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px',
      },
      printBackground: true,
    }

    const pdfOptions = {
      path: pdfPath,
      format: config?.pdf?.format || defaultPdfOptions.format,
      margin: config?.pdf?.margin || defaultPdfOptions.margin,
      printBackground:
        config?.pdf?.printBackground !== undefined
          ? config.pdf.printBackground
          : defaultPdfOptions.printBackground,
    }

    await page.pdf(pdfOptions)

    await page.close()

    return {
      success: true,
      path: pdfPath,
      title,
      url,
      filename: `${safeFilename}.pdf`,
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      url,
    }
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

// 加载所有懒加载图片
async function loadAllImages(page) {
  // 1. 滚动页面触发懒加载
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0
      const distance = 100
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight
        window.scrollBy(0, distance)
        totalHeight += distance

        if (totalHeight >= scrollHeight) {
          clearInterval(timer)
          window.scrollTo(0, 0)
          resolve()
        }
      }, 100)
    })
  })

  // 2. 处理微信特有的 data-src 属性
  await page.evaluate(() => {
    const images = document.querySelectorAll('img[data-src], img[data-original]')
    images.forEach((img) => {
      const dataSrc = img.getAttribute('data-src') || img.getAttribute('data-original')
      if (dataSrc && !img.src) {
        img.src = dataSrc
      }
      img.classList.remove('lazy')
    })
  })

  // 3. 等待所有图片加载完成
  await page.evaluate(() => {
    return Promise.all(
      Array.from(document.images)
        .filter((img) => !img.complete)
        .map(
          (img) =>
            new Promise((resolve) => {
              img.onload = img.onerror = resolve
              setTimeout(resolve, 5000)
            }),
        ),
    )
  })

  // 4. 额外等待确保渲染
  // await page.waitForTimeout(2000);
  await new Promise((resolve) => setTimeout(resolve, 2000))
}

// 清理文件名，移除非法字符
function sanitizeFilename(name) {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^\x00-\x7F]/g, (char) => {
      // 保留中文字符
      return /[\u4e00-\u9fa5]/.test(char) ? char : '_'
    })
    .slice(0, 100)
}

// 注册Worker方法
workerpool.worker({
  downloadArticle: downloadArticle,
})
