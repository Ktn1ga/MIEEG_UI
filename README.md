# 脑机接口演示平台

## 项目简介
这是一个交互式脑机接口演示平台，旨在展示脑电信号的采集、处理和应用。通过直观的界面和丰富的演示案例，帮助用户了解脑机接口技术的基本原理和应用场景。

## 主要功能

### 1. 脑控赛车游戏
![赛车游戏演示](images/demo/demo1.png)
- 使用运动想象脑电信号控制赛车移动
- 多种难度级别
- 实时分数统计
- 直观的视觉反馈

### 2. 脑电信号可视化
![脑电API解码](images/demo/demo4.png)
- 实时数据可视化
- 多通道信号显示
- 频谱分析工具
- 特征提取展示

### 3. 模型性能监控
![脑机接口演示](images/demo/demo3.png)
- 实时性能监控
- 准确率统计
- 资源使用分析
- 性能优化建议

## 技术栈
- 前端：HTML5, CSS3, JavaScript
- 可视化：Canvas
- 实时数据处理：WebSocket

## 快速开始

### 环境要求
- 现代浏览器（Chrome, Firefox, Safari等）
- Node.js（可选，用于本地开发）

### 安装步骤
1. 克隆项目到本地
```bash
git clone [项目地址]
cd UITEST
```

2. 使用浏览器打开
```bash
# 如果有Node.js环境，可以使用http-server等工具启动本地服务器
npm install -g http-server
http-server
```

3. 访问演示页面
- 打开浏览器访问 `index.html`
- 点击相应的演示案例进行体验

## 项目结构
```
├── images/          # 图片资源
│   ├── demo/       # 演示截图
│   └── game/       # 游戏素材
├── scripts/        # JavaScript文件
├── styles/         # CSS样式文件
├── index.html      # 主页面
└── game.html       # 游戏页面
```

## 使用说明
1. 在主页面选择想要体验的演示案例
2. 对于脑控赛车游戏：
   - 点击"开始体验"进入游戏
   - 使用脑电设备连接（如有）
   - 按照屏幕提示进行操作

## 贡献指南
欢迎贡献代码或提出建议！请遵循以下步骤：
1. Fork 项目
2. 创建新的分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 许可证
MIT License

## 联系方式
如有问题或建议，欢迎提出 Issue 或联系项目维护者。