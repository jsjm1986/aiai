# AI虚拟城市 (AI Virtual City)

一个基于大语言模型的虚拟城市模拟系统，通过AI代理模拟城市居民的日常生活、社交互动和决策行为。

## 主要特点

- 🤖 **智能AI代理**
  - 独立的决策系统
  - 完整的状态系统(体力、情绪、社交需求等)
  - 个性化特征(性格、职业、兴趣等)
  - 记忆系统(短期记忆、长期记忆、关系记忆)

- 🌆 **城市环境**
  - 多样化的建筑类型(住宅、商业、教育、娱乐等)
  - 动态的建筑服务状态
  - 完整的道路网络系统
  - 24小时营业时间系统

- 🤝 **社交系统**
  - 代理间的自然对话
  - 社交关系网络
  - 情感影响系统
  - 互动记忆系统

- ⚙️ **系统功能**
  - 实时状态监控
  - 可调节的时间流速
  - 暂停/继续功能
  - 详细的数据统计

## 技术栈

- **前端**: 原生JavaScript + HTML5 Canvas
- **AI对话**: 支持多个大语言模型API
  - DeepSeek
  - OpenAI
  - Anthropic
  - Step
- **数据存储**: LocalStorage + 内存数据结构
- **渲染**: Canvas 2D实时渲染

## 系统架构

├── js/
│ ├── agent.js # AI代理核心逻辑
│ ├── aiService.js # AI服务接口
│ ├── behaviorSystem.js # 行为系统
│ ├── city.js # 城市管理器
│ ├── config.js # 配置文件
│ ├── main.js # 主程序
│ └── uiManager.js # UI管理器
├── css/
│ └── style.css # 样式文件
└── index.html # 主页面


## 主要功能

### 1. AI代理系统
- 独立的决策系统
- 完整的状态管理
- 个性化特征
- 记忆系统
- 社交互动

### 2. 城市管理
- 建筑物生成和管理
- 道路网络规划
- 时间系统
- 服务状态管理

### 3. 数据统计
- 人口统计
- 建筑使用率
- 社交活动统计
- API使用统计

## 开发指南

### 添加新的建筑类型

## 系统特性

### 1. 代理行为系统
- 基于大语言模型的决策
- 完整的行为历史记录
- 动态的状态变化
- 社交互动系统

### 2. 建筑管理系统
- 多样化的建筑类型
- 动态的营业时间
- 容量管理
- 服务质量评估

### 3. 时间系统
- 可调节的时间流速
- 24小时营业周期
- 建筑物时间表
- 代理作息时间

### 4. 社交系统
- 自然语言对话
- 关系网络构建
- 情感影响计算
- 社交记忆存储

## 开源协议

MIT License

Copyright (c) 2024 [jsjm]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## 免责声明

1. 本项目仅供学习和研究使用，不得用于商业用途。
2. 使用本项目所产生的任何后果由使用者自行承担。
3. 本项目使用的第三方API服务（如DeepSeek、OpenAI等）的使用需遵守各自的服务条款。
4. 项目维护者保留对项目进行更新、修改或终止的权利。

## 贡献指南

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

## 联系方式

- 项目维护者: [jsjm]
- 邮箱: [jsjm@live.cn]
- 项目主页: [项目URL]

## 致谢

感谢以下开源项目和服务的支持：

- DeepSeek
- Anthropic
- Step
- Three.js
- Chart.js

特别感谢所有为这个项目做出贡献的开发者。
