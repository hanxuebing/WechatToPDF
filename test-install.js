// test-install.js
import os from 'os'

async function checkEnvironment() {
  console.log('='.repeat(60))
  console.log('环境检查')
  console.log('='.repeat(60))

  console.log('\nNode.js:', process.version)
  console.log('平台:', process.platform)
  console.log('CPU核心:', os.cpus().length)
  console.log('内存:', (os.totalmem() / 1024 / 1024 / 1024).toFixed(2), 'GB')

  console.log('\n检查依赖:')
  const deps = ['puppeteer', 'workerpool', 'cheerio', 'axios']
  for (const dep of deps) {
    try {
      await import(dep)
      console.log(`✅ ${dep}`)
    } catch (error) {
      console.log(`❌ ${dep} - 未安装`)
    }
  }

  console.log('\n测试 Puppeteer:')
  try {
    const puppeteerModule = await import('puppeteer')
    const puppeteer = puppeteerModule.default
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
    const page = await browser.newPage()
    await page.goto('https://example.com', { timeout: 10000 })
    await browser.close()
    console.log('✅ Puppeteer 测试通过')
  } catch (error) {
    console.log('❌ Puppeteer 测试失败:', error.message)
  }

  console.log('\n测试 Workerpool:')
  try {
    const workerpoolModule = await import('workerpool')
    const workerpool = workerpoolModule.default
    const pool = workerpool.pool()
    await pool.terminate()
    console.log('✅ Workerpool 测试通过')
  } catch (error) {
    console.log('❌ Workerpool 测试失败:', error.message)
  }

  console.log('\n' + '='.repeat(60))
  console.log('检查完成')
  console.log('='.repeat(60))
}

checkEnvironment().catch(console.error)
