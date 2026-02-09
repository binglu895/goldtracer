# CME FedWatch 数据更新指南

## 现状评估

经过多种抓取策略测试，CME Group 网站有以下防护机制：
1. ✅ 403 Forbidden on API endpoints
2. ✅ HTML 中不包含直接可解析的 JSON 数据
3. ✅ 可能使用 JavaScript 动态加载数据
4. ✅ 需要浏览器环境或 Selenium

## 推荐方案：半自动+手动混合

### 方案 1：浏览器扩展（推荐）⭐⭐⭐⭐⭐

**优点：** 完全自动化，无需手动操作  
**缺点：** 需要开发浏览器扩展

1. 开发 Chrome/Edge 扩展
2. 扩展在后台每天访问 CME FedWatch 页面
3. 解析页面数据并通过 API 推送到您的服务器
4. 服务器自动更新数据库

### 方案 2：Selenium 定时任务（可行）⭐⭐⭐⭐

**优点：** 完全自动化  
**缺点：** 需要运行 headless Chrome,资源消耗较大

```python
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

options = Options()
options.add_argument('--headless')
driver = webdriver.Chrome(options=options)
driver.get('https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html')
# 等待JS加载完成
time.sleep(5)
# 解析页面数据
```

### 方案 3：手动+API 混合（最实用）⭐⭐⭐⭐⭐

**优点：** 简单可靠，成本低  
**缺点：** 需要定期（每周）手动更新一次

#### 实施步骤：

**1. 创建管理页面（推荐）**
   - 在应用中添加一个 `/admin/fedwatch` 页面
   - 页面有一个表单，可以输入最新的概率值
   - 提交后通过 API 更新数据库

**2. 使用现有的 Sync 按钮**
   - 每周一次手动访问 CME FedWatch Tool
   - 复制最新数值
   - 点击应用中的"全量同步"按钮
   - 在弹窗中输入新数值（需要修改代码添加此功能）

**3. 直接修改数据库（最快）**
   - 每周访问 CME FedWatch
   - 在 Supabase SQL Editor 中运行：
   ```sql
   UPDATE daily_strategy_log
   SET fedwatch = jsonb_set(
     fedwatch,
     '{prob_pause}',
     '84.2'
   )
   WHERE log_date = CURRENT_DATE;
   ```

### 方案 4：第三方数据服务（专业）⭐⭐⭐

**优点：** 完全自动化,数据权威  
**缺点：** 可能需要付费

可选服务：
- Bloomberg API (付费)
- Alpha Vantage (有免费额度)
- Polygon.io (金融市场数据API)

## 本项目当前采用方案

目前代码采用**方案3的变体**：
- ✅ 有 fallback 机制（硬编码值）
- ✅ 有诊断工具（debug_fedwatch.py）
- ⚠️ 需要手动更新代码中的硬编码值

## 建议行动方案

**短期（1-2周内）：**
继续使用硬编码+手动更新，修改文件：
`backend/services/calculator.py` 第148-149行

**中期（1-2月内）：**
实现方案1或方案2（浏览器扩展或Selenium）

**长期（3个月+）：**
考虑订阅专业数据服务

## 如何快速更新当前数值

1. 访问: https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html
2. 查看 3月18日会议的概率
3. 编辑 `backend/services/calculator.py`:
   ```python
   prob_pause = 84.2  # 更新这里
   prob_cut_25 = 15.8  # 更新这里
   ```
4. 运行:
   ```bash
   git add .
   git commit -m "update: FedWatch probabilities to latest CME data"
   git push origin main
   ```
5. Vercel 自动部署（2-3分钟）

## 更新频率建议

- **最低频率**: 每次 FOMC 会议后（每6周）
- **推荐频率**: 每周一次
- **最高频率**: 每日（如果使用自动化方案）
