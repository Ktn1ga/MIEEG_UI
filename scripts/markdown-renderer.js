// 引入marked库的CDN
const markedScript = document.createElement('script');
markedScript.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
document.head.appendChild(markedScript);

// 等待marked库加载完成
markedScript.onload = () => {
    // 配置marked选项
    marked.setOptions({
        breaks: true, // 支持GitHub风格的换行
        gfm: true, // 启用GitHub风格的Markdown
        headerIds: false, // 禁用标题ID以避免冲突
        mangle: false, // 禁用标题ID转义
        sanitize: false // 允许HTML标签
    });
};

// 将Markdown文本转换为HTML
function renderMarkdown(text) {
    try {
        return marked.parse(text);
    } catch (error) {
        console.error('Markdown渲染错误:', error);
        return text; // 如果渲染失败，返回原始文本
    }
}

// 导出渲染函数
window.renderMarkdown = renderMarkdown;