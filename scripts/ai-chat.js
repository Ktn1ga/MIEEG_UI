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
    function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        // 添加用户消息
        addMessage(message, 'user');
        chatInput.value = '';
        chatInput.style.height = 'auto';

        // TODO: 发送消息到后端API
        // 这里添加与后端API的通信逻辑
        
        // 模拟AI回复
        setTimeout(() => {
            addMessage('我是AI助手，目前是一个演示版本。后续会接入真实的AI对话功能。', 'bot');
        }, 1000);
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