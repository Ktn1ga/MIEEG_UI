const messages = [];

// 引入Markdown渲染器
const markdownRendererScript = document.createElement('script');
markdownRendererScript.src = './scripts/markdown-renderer.js';
document.head.appendChild(markdownRendererScript);

document.addEventListener('DOMContentLoaded', () => {
    const aiChatWidget = document.querySelector('.ai-chat-widget');
    const chatToggle = aiChatWidget.querySelector('.ai-chat-toggle');
    const chatContainer = aiChatWidget.querySelector('.ai-chat-container');
    const chatClose = aiChatWidget.querySelector('.ai-chat-close');
    const chatInput = aiChatWidget.querySelector('.ai-chat-input');
    const chatSend = aiChatWidget.querySelector('.ai-chat-send');
    const chatMessages = aiChatWidget.querySelector('.ai-chat-messages');

    // 打开/关闭聊天窗口
    chatToggle.addEventListener('click', () => {
        chatContainer.classList.add('active');
        chatInput.focus();
    });

    chatClose.addEventListener('click', () => {
        chatContainer.classList.remove('active');
    });

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

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let aiMessage = '';
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('ai-chat-message', 'bot');
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
                            messageDiv.innerHTML = renderMarkdown(aiMessage);
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
            addMessage('抱歉，我现在无法回答。请稍后再试。', 'bot');
        } finally {
            // 重新启用输入和发送按钮
            chatInput.disabled = false;
            chatSend.disabled = false;
            chatInput.focus();
        }
    }

    // 添加消息到聊天界面
    function addMessage(text, type) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('ai-chat-message', type);
        messageDiv.innerHTML = type === 'bot' ? renderMarkdown(text) : text;
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