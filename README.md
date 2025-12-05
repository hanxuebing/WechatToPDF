# 微信公众号文章批量下载器

批量下载微信公众号文章并转换为PDF，支持多线程并发和配置文件。

## 安装

```bash
# 1. 安装依赖
npm install

# 2. 验证安装
node test-install.js
```

## 配置文件

### 快速开始

1. 生成配置文件模板：

   ```bash
   node src/cli.js --init-config
   ```

   或复制示例配置：

   ```bash
   cp config.example.json config.json
   ```

2. 编辑 `config.json`，设置Chrome路径等配置

3. 使用配置文件运行：

   ```bash
   node src/cli.js -c config.json -u "文章URL"
   ```

### 配置文件格式

```json
{
  "chrome": {
    "path": "Chrome浏览器路径",
    "args": ["Chrome启动参数"]
  },
  "download": {
    "outputDir": "./output",
    "maxWorkers": 4,
    "timeout": 30000
  },
  "pdf": {
    "format": "A4",
    "margin": {
      "top": "20px",
      "right": "20px",
      "bottom": "20px",
      "left": "20px"
    },
    "printBackground": true
  }
}
```

### Chrome路径配置

#### Windows

```json
{
  "chrome": {
    "path": "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
  }
}
```

#### macOS

```json
{
  "chrome": {
    "path": "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  }
}
```

#### Linux

```json
{
  "chrome": {
    "path": "/usr/bin/google-chrome-stable"
  }
}
```

### 配置优先级

1. 命令行参数（最高优先级）
2. 环境变量（如 CHROME_PATH）
3. 配置文件
4. 自动检测（最低优先级）

## 使用

### 命令行

```bash
# 基础用法
node src/cli.js -u "https://mp.weixin.qq.com/s/xxxxx"

# 批量下载
node src/cli.js -f urls.txt -o ./pdfs -w 6

# 使用配置文件
node src/cli.js -c config.json -f urls.txt

# 生成配置文件
node src/cli.js --init-config

# 帮助信息
node src/cli.js -h
```

### 代码调用

```javascript
import WeChatArticleDownloader from './src/index.js'
import { loadConfig } from './src/config.js'

async function main() {
  // 加载配置文件
  const { config } = await loadConfig('config.json')
  
  const downloader = new WeChatArticleDownloader('./output', { 
    maxWorkers: 4, 
    config 
  })
  
  await downloader.init()
  const urls = ['https://mp.weixin.qq.com/s/xxxxx']
  await downloader.downloadArticles(urls)
  await downloader.close()
}

main()
```

### URL文件格式

创建 `urls.txt`:

```
https://mp.weixin.qq.com/s/article1
https://mp.weixin.qq.com/s/article2
```

## 命令行参数

- `-h, --help` - 显示帮助信息
- `-c, --config <path>` - 指定配置文件路径
- `--init-config` - 生成配置文件模板
- `-u, --url <url>` - 下载单个文章URL
- `-f, --file <path>` - 从文件读取URL列表
- `-o, --output <dir>` - 输出目录（默认: ./output）
- `-w, --workers <num>` - 最大并发数（默认: 4）

## 示例

```bash
# 运行基础示例
npm run example

# 运行配置文件示例
node examples/basic.js 4

# 使用指定配置文件
node examples/basic.js 4 -c config.json
```

## 项目结构

```
wechat-article-downloader/
├── src/
│   ├── index.js       # 主程序
│   ├── worker.js      # Worker线程
│   ├── cli.js         # 命令行工具
│   └── config.js      # 配置管理
├── examples/
│   └── basic.js       # 示例代码
├── config.example.json # 配置文件模板
├── test-install.js    # 环境验证
└── package.json
```

## 切换到 puppeteer-core

```bash
npm uninstall puppeteer
npm install puppeteer-core
npx puppeteer browsers install chrome
```

代码自动兼容两种模式。使用 puppeteer-core 时，需要在配置文件中指定Chrome路径。

## 故障排除

### Chrome路径问题

如果遇到Chrome路径问题：

1. **使用配置文件指定路径**：

   ```json
   {
     "chrome": {
       "path": "/your/chrome/path"
     }
   }
   ```

2. **设置环境变量**：

   ```bash
   export CHROME_PATH=/path/to/chrome
   ```

3. **常见Chrome路径**：
   - Windows: `C:\Program Files\Google\Chrome\Application\chrome.exe`
   - macOS: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
   - Linux: `/usr/bin/google-chrome-stable`

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
