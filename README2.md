# 脑机接口演示平台技术文档

## 1. 系统架构

### 1.1 整体架构
- **前端层**：基于HTML5、CSS3和JavaScript构建的Web应用
- **通信层**：使用WebSocket实现实时数据传输
- **数据处理层**：负责脑电信号的实时处理和解析
- **可视化层**：基于Canvas实现的实时数据可视化

### 1.2 核心模块
1. **游戏引擎模块**
   - 基于Canvas的2D渲染引擎
   - 实时物理碰撞检测系统
   - 游戏状态管理器

2. **数据可视化模块**
   - 实时脑电波形图绘制
   - 频谱分析图表展示
   - 多通道信号同步显示

3. **性能监控模块**
   - 实时性能数据采集
   - 准确率统计分析
   - 系统资源监控

## 2. 技术实现详解

### 2.1 前端技术栈
- **核心框架**：原生JavaScript
- **样式管理**：CSS3 + 响应式设计
- **页面渲染**：HTML5 Canvas
- **实时通信**：WebSocket

### 2.2 关键功能实现

#### 2.2.1 脑控赛车游戏
```javascript
// 游戏主循环示例
class GameLoop {
    constructor() {
        this.lastTime = 0;
        this.running = false;
    }

    start() {
        this.running = true;
        requestAnimationFrame(this.loop.bind(this));
    }

    loop(timestamp) {
        if (!this.running) return;

        const deltaTime = timestamp - this.lastTime;
        this.update(deltaTime);
        this.render();

        this.lastTime = timestamp;
        requestAnimationFrame(this.loop.bind(this));
    }
}
```

#### 2.2.2 实时数据可视化
- 使用Canvas绘制实时波形图
- 实现缓冲区管理，优化渲染性能
- 支持多通道数据同步显示

#### 2.2.3 WebSocket通信
```javascript
// WebSocket连接管理
class WSManager {
    constructor(url) {
        this.url = url;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    connect() {
        this.ws = new WebSocket(this.url);
        this.ws.onmessage = this.handleMessage.bind(this);
        this.ws.onclose = this.handleClose.bind(this);
    }

    handleMessage(event) {
        const data = JSON.parse(event.data);
        // 处理接收到的数据
    }
}
```

## 3. API接口设计

### 3.1 WebSocket API

#### 连接建立
```javascript
ws://localhost:8765
```

#### 数据格式
```json
{
    "type": "eeg_data",
    "timestamp": 1234567890,
    "channels": {
        "C3": [1.2, 2.3, 3.4],
        "C4": [2.1, 3.2, 4.3]
    }
}
```

### 3.2 HTTP API

#### 获取历史数据
- **端点**：`/api/history`
- **方法**：GET
- **参数**：
  - start_time: 开始时间戳
  - end_time: 结束时间戳
  - channels: 通道列表

## 4. 部署指南

### 4.1 环境准备
1. **Node.js环境**
   - 版本要求：>= 12.0.0
   - npm或yarn包管理器

2. **Python环境**（用于模拟器）
   - Python >= 3.7
   - 依赖包：websockets, numpy

### 4.2 开发环境配置
1. 克隆项目
```bash
git clone [项目地址]
cd MIEEG_UI
```

2. 安装依赖
```bash
npm install -g http-server  # 安装HTTP服务器
pip install -r requirements.txt  # 安装Python依赖
```

3. 启动开发服务器
```bash
http-server  # 启动前端服务器
python server.py  # 启动WebSocket服务器
```

### 4.3 生产环境部署
1. **静态资源部署**
   - 将前端文件部署到Web服务器（如Nginx）
   - 配置适当的CORS和WebSocket代理

2. **后端服务部署**
   - 使用supervisor或PM2管理Python进程
   - 配置日志收集和监控

## 5. 性能优化

### 5.1 前端优化
1. **渲染性能**
   - 使用requestAnimationFrame优化动画
   - Canvas离屏渲染
   - 图片资源预加载

2. **内存管理**
   - 及时清理不需要的事件监听器
   - 优化Canvas缓冲区使用
   - 控制WebSocket数据缓存大小

### 5.2 通信优化
1. **数据压缩**
   - 使用二进制数据传输
   - 实现简单的数据压缩算法

2. **连接管理**
   - 自动重连机制
   - 心跳检测
   - 错误处理和恢复

## 6. 测试指南

### 6.1 单元测试
- 使用Jest进行JavaScript单元测试
- Python单元测试使用pytest

### 6.2 性能测试
- WebSocket连接压力测试
- Canvas渲染性能测试
- 内存泄漏检测

## 7. 常见问题解决

### 7.1 WebSocket连接问题
1. 检查服务器地址和端口配置
2. 确认网络防火墙设置
3. 查看浏览器控制台错误信息

### 7.2 游戏性能问题
1. 检查Canvas渲染性能
2. 优化游戏循环逻辑
3. 减少不必要的DOM操作

## 8. 开发规范

### 8.1 代码风格
- 使用ESLint进行代码检查
- 遵循JavaScript Standard Style
- 使用JSDoc添加注释

### 8.2 Git工作流
1. 主分支：main
2. 开发分支：develop
3. 功能分支：feature/*
4. 发布分支：release/*

## 9. 未来规划

### 9.1 功能扩展
1. 添加更多游戏模式
2. 实现多人对战功能
3. 增加数据分析工具

### 9.2 技术改进
1. 迁移到TypeScript
2. 引入WebAssembly优化性能
3. 支持PWA离线功能

## 10. 贡献指南

### 10.1 提交PR流程
1. Fork项目
2. 创建功能分支
3. 提交代码更改
4. 发起Pull Request

### 10.2 代码审查标准
1. 代码风格符合规范
2. 通过所有测试用例
3. 文档更新完整
4. 性能影响可接受

## 11. 许可证

本项目采用MIT许可证。详见LICENSE文件。

## 12. 联系方式

- 项目维护者：[维护者姓名]
- 邮箱：[联系邮箱]
- 问题反馈：请使用GitHub Issues