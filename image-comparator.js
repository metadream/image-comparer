/**
 * Image Comparator Usage:
 * <div class="image-comparator">
 *   <img class="left-image" src="before.jpg">
 *   <img class="right-image" src="after.jpg">
 * </div>
 * <script>
 *   new ImageComparator('.image-comparator');
 * </script>
 */
class ImageComparator {

    static MAX_SCALE = 20;
    static SCALE_STEP = 0.2;
    transX = 0;
    transY = 0;
    scale = 1;

    constructor(target) {
        this.container = typeof target === 'string' ? document.querySelector(target) : target;
        this.leftImage = this.container.querySelector('img.left-image');
        this.rightImage = this.container.querySelector('img.right-image');

        this.createSlider();
        this.createMaximizeIcon();
        this.container.onpointerdown = e => this.dragImages(e);
        this.container.onwheel = e => this.scaleImages(e);

        // 容器自适应图像高度
        this.leftImage.addEventListener('load', () => {
            const img = this.leftImage;
            const aspectRatio = img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : 0;
            this.container.style.paddingBottom = `${(1 / aspectRatio) * 100}%`;
        });

        // 重置图像位移数据
        this.resetViewport();
        window.addEventListener("resize", () => {
            this.resetImages();
        });

        // 监听退出全屏按键
        window.addEventListener("keyup", e => {
            if (e.key === 'Escape' &&
                this.container.classList.contains("maximized")) {
                this.toggleMaximize();
            }
        });
    }

    /** 切换最大化 */
    toggleMaximize() {
        this.container.classList.toggle('maximized');
        this.maximizeIcon.innerHTML = this.container.classList.contains('maximized')
            ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M5.5 0a.5.5 0 0 1 .5.5v4A1.5 1.5 0 0 1 4.5 6h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5m5 0a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 10 4.5v-4a.5.5 0 0 1 .5-.5M0 10.5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 6 11.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5m10 1a1.5 1.5 0 0 1 1.5-1.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0z"/></svg>'
            : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5M.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5m15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5"/></svg>';
        this.resetImages();
    }

    /** 拖动图像 */
    dragImages(e) {
        if (e.button !== 0) return;
        let startX = e.clientX;
        let startY = e.clientY;
        let offsetX = 0;
        let offsetY = 0;
        this.container.style.cursor = "grabbing";

        document.onpointermove = (e) => {
            offsetX = e.clientX - startX;
            offsetY = e.clientY - startY;
            this.transformImages(this.transX + offsetX, this.transY + offsetY, null);
            this.clipImages();  // 根据位移后的图像实时裁切图像
        }

        document.onpointerup = () => {
            document.onpointermove = null;
            document.onpointerup = null;
            this.container.style.cursor = "default";
            this.transX += offsetX;
            this.transY += offsetY;
            this.checkBoundary();
            this.clipImages();  // 根据位移后的图像实时裁切图像
        };
        return false;
    }

    /** 重置容器和图像中心点 */
    resetViewport() {
        this.viewport = this.container.getBoundingClientRect();
        const imgRect = this.leftImage.getBoundingClientRect();
        this.centerX = imgRect.x - this.viewport.x + imgRect.width / 2;
        this.centerY = imgRect.y - this.viewport.y + imgRect.height / 2;
    }

    /** 重置图像 */
    resetImages() {
        this.transX = 0;
        this.transY = 0;
        this.scale = 1;
        this.transformImages();
        this.clipImages();
        this.resetViewport();
    }

    /** 检查位移边界 */
    checkBoundary() {
        const { width, height } = this.leftImage.getBoundingClientRect();
        const bound = { x1: 0, x2: 0, y1: 0, y2: 0 };

        if (width > this.viewport.width) {
            bound.x1 = width / 2 - this.centerX;
            bound.x2 = bound.x1 - (width - this.viewport.width);
        }
        if (height > this.viewport.height) {
            bound.y1 = height / 2 - this.centerY;
            bound.y2 = bound.y1 - (height - this.viewport.height);
        }

        let outOfBounds = false;
        if (this.transX > bound.x1) {
            this.transX = bound.x1;
            outOfBounds = true;
        }
        if (this.transX < bound.x2) {
            this.transX = bound.x2;
            outOfBounds = true;
        }
        if (this.transY > bound.y1) {
            this.transY = bound.y1;
            outOfBounds = true;
        }
        if (this.transY < bound.y2) {
            this.transY = bound.y2;
            outOfBounds = true;
        }
        if (outOfBounds) {
            this.transformImages();
        }
    }

    /** 缩放图像 */
    scaleImages(e) {
        // 防止页面滚动条跟随滚动
        e.preventDefault();
        // 缩放图像
        const step = e.wheelDelta > 0 ? ImageComparator.SCALE_STEP : 0 - ImageComparator.SCALE_STEP;
        this.scale *= (1 + step);
        this.scale = Math.max(1, Math.min(this.scale, ImageComparator.MAX_SCALE));
        this.transformImages();
        this.checkBoundary();
        this.clipImages();  // 根据缩放后的图像实时裁切图像
    }

    /** 裁切图像 */
    clipImages(sliderX) {
        if (!sliderX) {
            const sliderRect = this.slider.getBoundingClientRect();
            sliderX = sliderRect.x;
        }
        const imgRect = this.leftImage.getBoundingClientRect();
        const clipPos = ((sliderX - imgRect.x) / imgRect.width) * 100;
        this.leftImage.style.clipPath = `inset(0 ${100 - clipPos}% 0 0)`;
        this.rightImage.style.clipPath = `inset(0 0 0 ${clipPos}%)`;
    }

    /** 转换图像 */
    transformImages(x, y, s) {
        this.leftImage.style.transform = `
                translate(${x ?? this.transX}px, ${y ?? this.transY}px)
                scale(${s ?? this.scale})`;
        this.rightImage.style.transform = `
                translate(${x ?? this.transX}px, ${y ?? this.transY}px)
                scale(${s ?? this.scale})`;
    }

    /** 创建滑动条 */
    createSlider() {
        this.slider = document.createElement('div');
        this.slider.className = 'slider-handle';
        this.container.append(this.slider);

        // 拖动滑动条事件
        this.slider.onpointerdown = e => {
            if (e.button !== 0) return;
            e.stopPropagation();  // 防止冒泡

            document.body.style.cursor = 'ew-resize';
            document.onpointermove = e => {
                // 设置滑动条位置
                const rect = this.container.getBoundingClientRect();
                let pos = ((e.clientX - rect.x) / rect.width) * 100;
                pos = Math.max(0, Math.min(100, pos));
                this.slider.style.left = `${pos}%`;
                // 设置图像裁切位置
                this.clipImages(e.clientX);
            }

            document.onpointerup = () => {
                document.onpointermove = null;
                document.onpointerup = null;
                document.body.style.cursor = '';
            };
            return false;
        }
    }

    /** 创建最大化图标 */
    createMaximizeIcon() {
        this.maximizeIcon = document.createElement('div');
        this.maximizeIcon.className = 'maximized-icon';
        this.maximizeIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5M.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5m15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5"/></svg>';
        this.maximizeIcon.onclick = () => this.toggleMaximize();
        this.container.append(this.maximizeIcon);
    }
}