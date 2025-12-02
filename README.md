# 微信公众号文章批量下载器

批量下载微信公众号文章并转换为PDF，支持多线程并发。

## 安装

```bash
# 1. 安装依赖
npm install

# 2. 验证安装
node test-install.js
```

## 使用

### 命令行

```bash
# 下载单篇
node src/cli.js -u "https://mp.weixin.qq.com/s/xxxxx"

# 批量下载
node src/cli.js -f urls.txt -o ./pdfs -w 6

# 帮助
node src/cli.js -h
```

### 代码调用

```javascript
const WeChatArticleDownloader = require('./src/index');

async function main() {
  const downloader = new WeChatArticleDownloader('./output', { maxWorkers: 4 });
  await downloader.init();
  const urls = ['https://mp.weixin.qq.com/s/xxxxx'];
  await downloader.downloadArticles(urls);
  await downloader.close();
}

main();
```

### URL文件格式

创建 `urls.txt`:
```
https://mp.weixin.qq.com/s/article1
https://mp.weixin.qq.com/s/article2
```

## 参数

- `-u, --url` - 单个URL
- `-f, --file` - URL列表文件
- `-o, --output` - 输出目录（默认: ./output）
- `-w, --workers` - 并发数（默认: 4）

## 示例

```bash
npm run example
```

## 项目结构

```
wechat-article-downloader/
├── src/
│   ├── index.js     # 主程序
│   ├── worker.js    # Worker线程
│   └── cli.js       # 命令行工具
├── examples/
│   └── basic.js     # 示例代码
├── test-install.js  # 环境验证
└── package.json
```

## 切换到 puppeteer-core

```bash
npm uninstall puppeteer
npm install puppeteer-core
npx puppeteer browsers install chrome
```

代码自动兼容两种模式。

## 故障排除

### Chromium 下载失败
```bash
npm config set puppeteer_download_host https://registry.npmmirror.com/-/binary/chromium-browser-snapshots
npm install puppeteer --force
```

### Linux 缺少依赖
```bash
sudo apt-get install -y libx11-xcb1 libxcomposite1 libxcursor1 libxdamage1 libxi6 libxtst6 libnss3 libcups2 libxrandr2 libasound2 libpangocairo-1.0-0 libatk1.0-0 libatk-bridge2.0-0 libgtk-3-0
```

## License

MIT