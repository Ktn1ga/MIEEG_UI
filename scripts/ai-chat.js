import { AI_ASSISTANT_CONFIG } from './config/ai-assistant.js';
import OpenAI from './openai.js';

const openai = new OpenAI({
    apiKey: AI_ASSISTANT_CONFIG.apiKey,
    baseURL: AI_ASSISTANT_CONFIG.baseURL
});

const messages = [
    { role: 'system', content: AI_ASSISTANT_CONFIG.systemPrompt }
];

const AI_CHAT_CONFIG = {
    systemPrompt: `你是这个网站的专业助手，熟悉网站的所有功能和脑机接口技术。本平台主要功能包括：
1. 实时脑电信号采集与处理：提供高精度的信号采集和实时处理能力
2. 多种信号处理算法支持：集成多种先进的信号处理算法
3. 可视化数据分析工具：提供直观的数据可视化界面
4. 交互式应用开发接口：支持快速开发和集成自定义应用
5. 脑控赛车游戏演示：支持简单/普通/困难三种难度模式，通过脑电信号控制赛车移动收集能量得分

你可以帮助用户了解这些具体功能、解答脑机接口相关问题，但对于超出这些范围的问题，你会礼貌地表示这不是你的专业领域。请用简洁友好的方式交流，避免过于机械化的回答。`
};

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

            // 调用API获取回复
            const response = await openai.chat.completions.create({
                model: 'deepseek-chat',
                messages: messages,
                stream: false
            });

            // 获取AI回复
            const aiMessage = response.choices[0].message.content;
            
            // 添加AI回复到消息历史
            messages.push({ role: 'assistant', content: aiMessage });
            
            // 显示AI回复
            addMessage(aiMessage, 'bot');
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
        messageDiv.textContent = text;
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