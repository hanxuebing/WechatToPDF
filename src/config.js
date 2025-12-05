// src/config.js - 配置管理模块
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'

// 默认配置
const DEFAULT_CONFIG = {
  chrome: {
    path: null, // null表示自动检测
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-blink-features=AutomationControlled',
    ],
  },
  download: {
    outputDir: './output',
    maxWorkers: 4,
    timeout: 30000,
  },
  pdf: {
    format: 'A4',
    margin: {
      top: '20px',
      right: '20px',
      bottom: '20px',
      left: '20px',
    },
    printBackground: true,
  },
}

// 配置文件可能的路径
function getConfigPaths() {
  const homeDir = os.homedir()
  return ['config.json', '.wechat-downloader.json', path.join(homeDir, '.wechat-downloader.json')]
}

// 检查文件是否存在
async function fileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

// 加载配置文件
async function loadConfigFile(configPath = null) {
  let configContent = null
  let usedConfigPath = null

  if (configPath) {
    // 使用指定的配置文件路径
    if (await fileExists(configPath)) {
      try {
        const content = await fs.readFile(configPath, 'utf-8')
        configContent = JSON.parse(content)
        usedConfigPath = configPath
        console.log(`✓ 使用配置文件: ${configPath}`)
      } catch (error) {
        console.warn(`⚠ 配置文件解析失败 ${configPath}: ${error.message}`)
      }
    } else {
      console.warn(`⚠ 配置文件不存在: ${configPath}`)
    }
  } else {
    // 按优先级查找配置文件
    const possiblePaths = getConfigPaths()
    for (const configFile of possiblePaths) {
      if (await fileExists(configFile)) {
        try {
          const content = await fs.readFile(configFile, 'utf-8')
          configContent = JSON.parse(content)
          usedConfigPath = configFile
          console.log(`✓ 使用配置文件: ${configFile}`)
          break
        } catch (error) {
          console.warn(`⚠ 配置文件解析失败 ${configFile}: ${error.message}`)
          continue
        }
      }
    }

    // 如果没有找到用户配置文件，尝试使用示例配置
    if (!configContent && (await fileExists('config.example.json'))) {
      try {
        const content = await fs.readFile('config.example.json', 'utf-8')
        configContent = JSON.parse(content)
        usedConfigPath = 'config.example.json'
        console.log(`✓ 使用示例配置文件: config.example.json`)
        console.log(`提示: 建议复制 config.example.json 为 config.json 并根据需要修改`)
      } catch (error) {
        console.warn(`⚠ 示例配置文件解析失败: ${error.message}`)
      }
    }
  }

  return { config: configContent, path: usedConfigPath }
}

// 深度合并配置对象
function mergeConfig(defaultConfig, userConfig) {
  const result = { ...defaultConfig }

  for (const key in userConfig) {
    if (userConfig[key] && typeof userConfig[key] === 'object' && !Array.isArray(userConfig[key])) {
      result[key] = mergeConfig(defaultConfig[key] || {}, userConfig[key])
    } else {
      result[key] = userConfig[key]
    }
  }

  return result
}

// 验证Chrome路径
async function validateChromePath(chromePath) {
  if (!chromePath) return true // null/undefined 表示自动检测，这是有效的

  try {
    await fs.access(chromePath)
    return true
  } catch {
    return false
  }
}

// 自动检测Chrome路径（从worker.js移过来）
function detectChromePath() {
  const platform = process.platform

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
    ].filter((path) => path && !path.includes('null')), // 过滤掉可能的null路径
  }

  const paths = possiblePaths[platform] || []

  // 同步检查文件存在性
  for (const chromePath of paths) {
    try {
      require('fs').accessSync(chromePath)
      return chromePath
    } catch {
      continue
    }
  }

  return null
}

// 加载和处理配置
export async function loadConfig(configPath = null) {
  const { config: userConfig, path: usedPath } = await loadConfigFile(configPath)

  // 合并配置
  const config = userConfig ? mergeConfig(DEFAULT_CONFIG, userConfig) : { ...DEFAULT_CONFIG }

  // 处理Chrome路径优先级：环境变量 > 配置文件 > 自动检测
  if (process.env.CHROME_PATH) {
    config.chrome.path = process.env.CHROME_PATH
    console.log(`✓ 使用环境变量中的Chrome路径: ${process.env.CHROME_PATH}`)
  } else if (!config.chrome.path) {
    // 如果配置文件中没有指定路径，进行自动检测
    const detectedPath = detectChromePath()
    if (detectedPath) {
      config.chrome.path = detectedPath
      console.log(`✓ 自动检测到Chrome路径: ${detectedPath}`)
    } else {
      console.log(`! 未找到Chrome，将尝试使用系统默认设置`)
    }
  }

  // 验证Chrome路径
  if (config.chrome.path) {
    const isValid = await validateChromePath(config.chrome.path)
    if (!isValid) {
      console.warn(`⚠ Chrome路径无效: ${config.chrome.path}`)
      console.warn(`请检查配置文件或设置正确的CHROME_PATH环境变量`)
    }
  }

  return {
    config,
    configPath: usedPath,
    isUsingDefault: !userConfig,
  }
}

// 生成配置文件模板
export async function generateConfigTemplate(outputPath = 'config.json') {
  const template = {
    _comment: '微信公众号文章下载器配置文件',
    _usage: '根据您的系统环境修改以下配置',

    chrome: {
      _comment: 'Chrome浏览器配置',
      path: '',
      _examples: {
        windows: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        macos: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        linux: '/usr/bin/google-chrome-stable',
      },
      args: DEFAULT_CONFIG.chrome.args,
    },

    download: {
      _comment: '下载配置',
      outputDir: DEFAULT_CONFIG.download.outputDir,
      maxWorkers: DEFAULT_CONFIG.download.maxWorkers,
      timeout: DEFAULT_CONFIG.download.timeout,
    },

    pdf: {
      _comment: 'PDF生成配置',
      format: DEFAULT_CONFIG.pdf.format,
      margin: DEFAULT_CONFIG.pdf.margin,
      printBackground: DEFAULT_CONFIG.pdf.printBackground,
    },
  }

  await fs.writeFile(outputPath, JSON.stringify(template, null, 2), 'utf-8')
  console.log(`✓ 配置文件模板已生成: ${outputPath}`)
}

export default { loadConfig, generateConfigTemplate }
