document.addEventListener('DOMContentLoaded', function() {
    const demoCards = document.querySelectorAll('.demo-card');
    let currentExpandedCard = null;

    // 添加滚动提示控制逻辑
    const demoContainer = document.querySelector('.demo-container');
    const scrollHint = document.querySelector('.scroll-hint');

    if (demoContainer && scrollHint) {
        demoContainer.addEventListener('scroll', function() {
            const scrollPercentage = this.scrollLeft / (this.scrollWidth - this.clientWidth);
            if (scrollPercentage > 0.1) { // 当滚动超过10%时隐藏提示
                scrollHint.style.opacity = '0';
                setTimeout(() => {
                    scrollHint.style.display = 'none';
                }, 800); // 等待淡出动画完成后隐藏元素
            }
        });
    }

    demoCards.forEach(card => {
        card.addEventListener('click', function(e) {
            // 如果点击的是按钮，不触发展开/收起
            if (e.target.tagName === 'A' || e.target.closest('a')) {
                return;
            }

            // 如果当前卡片已经展开，则收起
            if (this === currentExpandedCard) {
                this.classList.remove('expanded');
                currentExpandedCard = null;
                return;
            }

            // 收起之前展开的卡片
            if (currentExpandedCard) {
                currentExpandedCard.classList.remove('expanded');
            }

            // 展开当前点击的卡片
            this.classList.add('expanded');
            currentExpandedCard = this;
        });
    });

    // 处理即将推出的功能提示
    const comingSoonButtons = document.querySelectorAll('.coming-soon');
    const toast = document.getElementById('toast');

    comingSoonButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            toast.textContent = '该功能即将推出，敬请期待！';
            toast.classList.add('show');
            
            setTimeout(() => {
                toast.classList.remove('show');
            }, 2000);
        });
    });
});