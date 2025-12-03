// test/test.js
import WeChatArticleDownloader from '../src/index.js'

async function test() {
  console.log('开始测试...\n')
  const downloader = new WeChatArticleDownloader('./test_output', { maxWorkers: 2 })

  try {
    await downloader.init()
    const testUrls = ['https://mp.weixin.qq.com/s/test1', 'https://mp.weixin.qq.com/s/test2']
    const results = await downloader.downloadArticles(testUrls)
    console.log('\n测试结果:')
    console.log('成功:', results.filter((r) => r.success).length)
    console.log('失败:', results.filter((r) => !r.success).length)
  } catch (error) {
    console.error('测试失败:', error)
  } finally {
    await downloader.close()
  }
}

test()
