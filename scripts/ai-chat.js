const messages = [];

// 引入Markdown渲染器
const markdownRendererScript = document.createElement('script');
markdownRendererScript.src = './scripts/markdown-renderer.js';
document.head.appendChild(markdownRendererScript);

// 加载表情SVG
document.addEventListener('DOMContentLoaded', () => {
    // 加载表情SVG
    fetch('./images/emotions/emotions.svg')
        .then(response => response.text())
        .then(svgData => {
            const div = document.createElement('div');
            div.style.display = 'none';
            div.innerHTML = svgData;
            document.body.appendChild(div);
        })
        .catch(error => console.error('加载表情SVG失败:', error));

    const aiChatWidget = document.querySelector('.ai-chat-widget');
    const chatToggle = aiChatWidget.querySelector('.ai-chat-toggle');
    const chatContainer = aiChatWidget.querySelector('.ai-chat-container');
    const chatClose = aiChatWidget.querySelector('.ai-chat-close');
    const chatInput = aiChatWidget.querySelector('.ai-chat-input');
    const chatSend = aiChatWidget.querySelector('.ai-chat-send');
    const chatMessages = aiChatWidget.querySelector('.ai-chat-messages');

    // 创建打字指示器
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    typingIndicator.innerHTML = '<span></span><span></span><span></span>';
    
    // 打开/关闭聊天窗口
    chatToggle.addEventListener('click', () => {
        chatContainer.classList.add('active');
        chatInput.focus();
    });

    chatClose.addEventListener('click', () => {
        chatContainer.classList.remove('active');
    });

    // 获取格式化的时间
    function getFormattedTime() {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    // 发送消息
    async function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        // 添加用户消息
        addMessage(message, 'user');
        chatInput.value = '';
        chatInput.style.height = 'auto';

        // 禁用输入和发送按钮
        chatInput.disabled = true;
        chatSend.disabled = true;

        try {
            // 添加用户消息到消息历史
            messages.push({ role: 'user', content: message });

            // 显示打字指示器
            chatMessages.appendChild(typingIndicator);
            typingIndicator.classList.add('active');
            chatMessages.scrollTop = chatMessages.scrollHeight;

            // 调用后端API获取流式回复
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ messages })
            });

            // 检查响应状态
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '请求失败');
            }

            // 移除打字指示器
            typingIndicator.classList.remove('active');
            if (typingIndicator.parentNode) {
                typingIndicator.parentNode.removeChild(typingIndicator);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let aiMessage = '';
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('ai-chat-message', 'bot');
            
            // 创建AI头像元素
            const avatarDiv = document.createElement('div');
            avatarDiv.classList.add('ai-avatar');
            messageDiv.appendChild(avatarDiv);
            
            // 添加时间戳
            const timestamp = document.createElement('div');
            timestamp.className = 'message-timestamp';
            timestamp.textContent = getFormattedTime();
            messageDiv.appendChild(timestamp);
            
            chatMessages.appendChild(messageDiv);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                // 处理SSE格式数据
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const jsonData = JSON.parse(line.slice(6));
                            if (!jsonData.success) {
                                const errorMessage = jsonData.error || '请求失败';
                                messageDiv.innerHTML = renderMarkdown(`❌ ${errorMessage}`);
                                throw new Error(errorMessage);
                            }
                            const newText = jsonData.message;
                            aiMessage += newText;
                            
                            // 解析情绪分数和真实回答
                            const { emotionScore, realAnswer } = parseEmotionAndAnswer(aiMessage);
                            
                            // 更新头像表情
                            if (emotionScore !== null) {
                                updateAvatarEmotion(avatarDiv, emotionScore);
                            }
                            
                            // 创建内容容器（如果不存在）
                            let contentDiv = messageDiv.querySelector('.message-content');
                            if (!contentDiv) {
                                contentDiv = document.createElement('div');
                                contentDiv.className = 'message-content';
                                messageDiv.appendChild(contentDiv);
                            }
                            
                            // 显示消息内容（不包含情绪分数和方括号）
                            const cleanAnswer = realAnswer.replace(/^\[|\]$/g, '').trim();
                            contentDiv.innerHTML = renderMarkdown(cleanAnswer);
                            
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                        } catch (e) {
                            console.error('解析响应数据出错:', e);
                            messageDiv.innerHTML = renderMarkdown(`❌ ${e.message}`)
                        }
                    }
                }
            }
            // 添加AI回复到消息历史
            messages.push({ role: 'assistant', content: aiMessage });
        } catch (error) {
            console.error('AI回复出错:', error);
            // 移除打字指示器
            typingIndicator.classList.remove('active');
            if (typingIndicator.parentNode) {
                typingIndicator.parentNode.removeChild(typingIndicator);
            }
            addMessage('抱歉，我现在无法回答。请稍后再试。', 'bot');
        } finally {
            // 重新启用输入和发送按钮
            chatInput.disabled = false;
            chatSend.disabled = false;
            chatInput.focus();
        }
    }

    // 解析情绪分数和真实回答
    function parseEmotionAndAnswer(text) {
        // 匹配格式：[数字]+[文本内容]，或者 [数字]+文本内容
        const regex = /^\[(\d+)\]\+(?:\[)?(.*)(?:\])?$/s;
        const match = text.match(regex);
        
        if (match) {
            const emotionScore = parseInt(match[1]);
            // 移除可能存在的剩余方括号
            const realAnswer = match[2].replace(/^\[|\]$/g, '').trim();
            return { emotionScore, realAnswer };
        }
        
        // 如果没有匹配到情绪分数格式，直接返回原文本
        return { emotionScore: null, realAnswer: text };
    }
    
    // 更新头像表情
    function updateAvatarEmotion(avatarDiv, score) {
        // 根据分数确定表情档位
        const emotionLevel = Math.floor(score / 10) * 10;
        const validLevel = Math.max(0, Math.min(90, emotionLevel));
        
        // 创建SVG图标
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("width", "40");
        svg.setAttribute("height", "40");
        svg.setAttribute("viewBox", "0 0 100 100");
        
        // 使用use元素引用SVG符号
        const use = document.createElementNS(svgNS, "use");
        use.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", `#emotion-${validLevel}`);
        svg.appendChild(use);
        
        // 添加特殊效果
        if (validLevel === 0) {
            // 最低分添加抖动动画
            svg.style.animation = "shake 0.5s ease-in-out infinite";
            if (!document.querySelector('#shake-keyframes')) {
                const style = document.createElement('style');
                style.id = 'shake-keyframes';
                style.textContent = `
                    @keyframes shake {
                        0%, 100% { transform: translateX(0); }
                        25% { transform: translateX(-2px) rotate(-2deg); }
                        75% { transform: translateX(2px) rotate(2deg); }
                    }
                `;
                document.head.appendChild(style);
            }
            
            // 添加全屏愤怒效果
            showFullscreenAnger();
        } else if (validLevel === 90) {
            // 最高分添加旋转动画
            svg.style.animation = "rotate 3s linear infinite";
            if (!document.querySelector('#rotate-keyframes')) {
                const style = document.createElement('style');
                style.id = 'rotate-keyframes';
                style.textContent = `
                    @keyframes rotate {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(style);
            }
            
            // 添加全屏烟花效果
            showFullscreenFireworks();
        }
        
        // 清空头像并添加新表情
        avatarDiv.innerHTML = '';
        avatarDiv.appendChild(svg);
        
        // 根据情绪分数调整头像边框颜色
        if (score < 30) {
            avatarDiv.style.borderColor = '#FF6B6B';
        } else if (score < 60) {
            avatarDiv.style.borderColor = '#FFD166';
        } else {
            avatarDiv.style.borderColor = '#95E1D3';
        }
    }

    // 显示全屏愤怒效果
    function showFullscreenAnger() {
        // 检查是否已经存在愤怒效果
        if (document.querySelector('.fullscreen-anger')) {
            return;
        }
        
        // 创建全屏愤怒效果容器
        const angerContainer = document.createElement('div');
        angerContainer.className = 'fullscreen-anger';
        
        // 创建愤怒表情
        const angerFace = document.createElement('div');
        angerFace.className = 'anger-face';
        
        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .fullscreen-anger {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(255, 0, 0, 0.2);
                z-index: 9999;
                display: flex;
                justify-content: center;
                align-items: center;
                animation: anger-pulse 0.5s ease-in-out infinite alternate;
                pointer-events: none;
            }
            
            .anger-face {
                width: 300px;
                height: 300px;
                background-color: #FF4040;
                border-radius: 50%;
                position: relative;
                animation: anger-shake 0.2s ease-in-out infinite;
                opacity: 0.9;
            }
            
            .anger-face::before, .anger-face::after {
                content: '';
                position: absolute;
                width: 60px;
                height: 20px;
                background-color: white;
                top: 80px;
                border-radius: 10px;
                transform: rotate(-45deg);
            }
            
            .anger-face::before {
                left: 60px;
            }
            
            .anger-face::after {
                right: 60px;
                transform: rotate(45deg);
            }
            
            .anger-face .mouth {
                position: absolute;
                width: 150px;
                height: 60px;
                border-radius: 0 0 75px 75px;
                border: 15px solid white;
                border-top: none;
                bottom: 60px;
                left: 75px;
            }
            
            @keyframes anger-pulse {
                from { background-color: rgba(255, 0, 0, 0.2); }
                to { background-color: rgba(255, 0, 0, 0.4); }
            }
            
            @keyframes anger-shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-10px); }
                75% { transform: translateX(10px); }
            }
        `;
        document.head.appendChild(style);
        
        // 创建嘴巴
        const mouth = document.createElement('div');
        mouth.className = 'mouth';
        angerFace.appendChild(mouth);
        
        angerContainer.appendChild(angerFace);
        document.body.appendChild(angerContainer);
        
        // 3秒后移除效果
        setTimeout(() => {
            if (angerContainer.parentNode) {
                angerContainer.parentNode.removeChild(angerContainer);
            }
        }, 3000);
    }

    // 显示全屏烟花效果
    function showFullscreenFireworks() {
        // 检查是否已经存在烟花效果
        if (document.querySelector('.fireworks-container')) {
            return;
        }
        
        // 创建烟花容器
        const fireworksContainer = document.createElement('div');
        fireworksContainer.className = 'fireworks-container';
        
        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .fireworks-container {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 9999;
                pointer-events: none;
                overflow: hidden;
            }
            
            .firework {
                position: absolute;
                width: 5px;
                height: 5px;
                border-radius: 50%;
                animation: firework-explode 1s ease-out forwards;
            }
            
            .particle {
                position: absolute;
                width: 4px;
                height: 4px;
                border-radius: 50%;
                animation: particle-fade 1s ease-out forwards;
            }
            
            @keyframes firework-explode {
                0% { transform: translateY(100vh); opacity: 1; }
                50% { transform: translateY(30vh); opacity: 1; }
                100% { transform: translateY(30vh); opacity: 0; }
            }
            
            @keyframes particle-fade {
                0% { transform: translate(0, 0); opacity: 1; }
                100% { transform: translate(var(--tx), var(--ty)); opacity: 0; }
            }
            
            .celebration-text {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 48px;
                font-weight: bold;
                color: gold;
                text-shadow: 0 0 10px rgba(255, 215, 0, 0.7);
                animation: celebration-pulse 1s ease-in-out infinite alternate;
                opacity: 0.9;
            }
            
            @keyframes celebration-pulse {
                from { transform: translate(-50%, -50%) scale(1); }
                to { transform: translate(-50%, -50%) scale(1.1); }
            }
        `;
        document.head.appendChild(style);
        
        // 添加庆祝文字
        const celebrationText = document.createElement('div');
        celebrationText.className = 'celebration-text';
        celebrationText.textContent = '🎉';
        fireworksContainer.appendChild(celebrationText);
        
        document.body.appendChild(fireworksContainer);
        
        // 创建多个烟花
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                createFirework(fireworksContainer);
            }, i * 300);
        }
        
        // 3秒后移除效果
        setTimeout(() => {
            if (fireworksContainer.parentNode) {
                fireworksContainer.parentNode.removeChild(fireworksContainer);
            }
        }, 3000);
    }

    // 创建单个烟花
    function createFirework(container) {
        const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF', '#FFA500'];
        const firework = document.createElement('div');
        firework.className = 'firework';
        firework.style.left = Math.random() * 100 + '%';
        firework.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        
        container.appendChild(firework);
        
        // 烟花爆炸
        setTimeout(() => {
            // 移除发射的烟花
            if (firework.parentNode) {
                const position = firework.getBoundingClientRect();
                const x = position.left;
                const y = position.top;
                firework.parentNode.removeChild(firework);
                
                // 创建粒子
                for (let i = 0; i < 30; i++) {
                    const particle = document.createElement('div');
                    particle.className = 'particle';
                    particle.style.left = x + 'px';
                    particle.style.top = y + 'px';
                    particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                    
                    // 随机方向
                    const angle = Math.random() * Math.PI * 2;
                    const distance = 50 + Math.random() * 100;
                    const tx = Math.cos(angle) * distance;
                    const ty = Math.sin(angle) * distance;
                    
                    particle.style.setProperty('--tx', tx + 'px');
                    particle.style.setProperty('--ty', ty + 'px');
                    
                    container.appendChild(particle);
                    
                    // 1秒后移除粒子
                    setTimeout(() => {
                        if (particle.parentNode) {
                            particle.parentNode.removeChild(particle);
                        }
                    }, 1000);
                }
            }
        }, 500);
    }

    // 添加消息到聊天界面
    function addMessage(text, type) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('ai-chat-message', type);
        
        // 添加时间戳
        const timestamp = document.createElement('div');
        timestamp.className = 'message-timestamp';
        timestamp.textContent = getFormattedTime();
        
        if (type === 'bot') {
            // 创建AI头像元素
            const avatarDiv = document.createElement('div');
            avatarDiv.classList.add('ai-avatar');
            messageDiv.appendChild(avatarDiv);
            
            // 解析情绪分数和真实回答
            const { emotionScore, realAnswer } = parseEmotionAndAnswer(text);
            
            // 创建内容容器
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            
            // 更新头像表情并显示消息内容（不包含情绪分数和方括号）
            if (emotionScore !== null) {
                updateAvatarEmotion(avatarDiv, emotionScore);
            }
            const cleanAnswer = realAnswer.replace(/^\[|\]$/g, '').trim();
            contentDiv.innerHTML = renderMarkdown(cleanAnswer);
            
            messageDiv.appendChild(contentDiv);
        } else {
            // 创建内容容器
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            contentDiv.textContent = text;
            messageDiv.appendChild(contentDiv);
        }
        
        messageDiv.appendChild(timestamp);
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // 发送消息事件
    chatSend.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // 自动调整输入框高度
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = chatInput.scrollHeight + 'px';
    });
});