(function ($) {
    $.fn.timeline = function () {
        var selectors = {
            id: $(this),
            item: $(this).find(".item"),
            activeClass: "item--active",
            img: ".img"
        };
        // 将第一个时间轴项目激活，并设置时间轴背景图片为第一个项目的图片
        selectors.item.eq(0).addClass(selectors.activeClass);
        selectors.id.css(
            "background-image",
            "url(" +
            selectors.item.first()
                .find(selectors.img)
                .attr("src") +
            ")"
        );
        // 获取时间轴项目的总数
        var itemLength = selectors.item.length;
        // 当页面滚动时，触发滚动事件
        $(window).scroll(function () {
            var max, min;
            // 获取页面滚动的距离
            var pos = $(this).scrollTop();
            selectors.item.each(function (i) {
                // 获取当前时间轴项目的最小和最大高度
                min = $(this).offset().top;
                max = $(this).height() + $(this).offset().top;
                var that = $(this);
                // 如果滚动到最后一个项目，并且超过了当前项目高度的一半，
                // 则将最后一个项目设置为激活状态，并设置背景图片为最后一个项目的图片
                if (i == itemLength - 2 && pos > min + $(this).height() / 2) {
                    selectors.item.removeClass(selectors.activeClass);
                    selectors.id.css(
                        "background-image",
                        "url(" +
                        selectors.item.last()
                            .find(selectors.img)
                            .attr("src") +
                        ")"
                    );
                    selectors.item.last().addClass(selectors.activeClass);
                }
                // 如果当前滚动位置在当前项目的最小和最大高度之间，
                // 则将当前项目设置为激活状态，并设置背景图片为当前项目的图片
                else if (pos <= max - 10 && pos >= min) {
                    selectors.id.css(
                        "background-image",
                        "url(" +
                        $(this)
                            .find(selectors.img)
                            .attr("src") +
                        ")"
                    );
                    selectors.item.removeClass(selectors.activeClass);
                    $(this).addClass(selectors.activeClass);
                }
            });
        });
    };
})(jQuery)
/*
最后，我们调用 timeline 插件并传入时间轴的 ID 作为参数。
这将启用时间轴插件并为该时间轴绑定滚动事件。
*/
$("#shell").timeline();


/**
 * 实现图片点击放大、拖拽、滚轴滚动焦点缩放功能，相关参数、函数声明
 */
let imgWidth, imgHeight; // 图片点击放大初始尺寸参数
let maxZoom = 4; //最大缩放倍数
let minreduce = 0.5; // 最小缩放倍数
let initScale = 1; //滚动缩放初始倍数，并不是图片点击放大的倍数
let isPointerdown = false; //鼠标按下的标识
//记录鼠标按下坐标和按下移动时坐标
let lastPointermove = {
    x: 0,
    y: 0,
};
//移动过程从上一个坐标到下一个坐标之间的差值
let diff = {
    x: 0,
    y: 0,
};
//图片放大后左上角的坐标，主要结合diff参数用于鼠标焦点缩放时图片偏移坐标
let x = 0;
let y = 0;

// 记录节点
const allImg = document.querySelectorAll(".imgBox img");
const outerdiv = document.querySelector("#outerdiv");
const image = outerdiv.querySelector("#bigimg");
window.onload = function () {
    allImg.forEach((item) => {
        item.addEventListener("click", (e) => {
            const that = e.target;
            image.style.transform = "scale(1)";
            //图片放大展示函数调用
            imgShow(that);
            // 监听鼠标滚动事件
            window.addEventListener("wheel", handleStopWheel, {
                passive: false,
            });
            // 拖转事件调用
            imgDrag();
        });
    });
};

function imgShow(that) {
    let src = that.getAttribute("src");
    image.setAttribute("src", src);

    // 设置尺寸和调整比例
    let windowW = document.documentElement.clientWidth;
    let windowH = document.documentElement.clientHeight;
    let realWidth = image.naturalWidth; //获取图片的原始宽度
    let realHeight = image.naturalHeight; //获取图片的原始高度
    let outsideScale = 0.8;
    let belowScale = 1.4;
    let realRatio = realWidth / realHeight;
    let windowRatio = windowW / windowH;

    // 说明：下面是我自己的一些判断逻辑，大致意思就是图片的真实尺寸大于屏幕尺寸则使用屏幕尺寸，如果小于屏幕尺寸就使用自己本身的尺寸；并根据大于或者小于的比例对图片的尺寸进一步调整。coder可以根据自己的要求进行修改。
    if (realRatio >= windowRatio) {
        if (realWidth > windowW) {
            imgWidth = windowH * outsideScale;
            imgHeight = (imgWidth / realWidth) * realHeight;
        } else {
            if (realWidth * belowScale < windowW) {
                imgWidth = realWidth * (belowScale - 0.2);
                imgHeight = (imgWidth / realWidth) * realHeight;
            } else {
                imgWidth = realWidth;
                imgHeight = realHeight;
            }
        }
    } else {
        if (realHeight > windowH) {
            imgHeight = windowH * outsideScale;
            imgWidth = (imgHeight / realHeight) * realWidth;
        } else {
            if (realHeight * belowScale < windowW) {
                imgHeight = realHeight * (belowScale - 0.2);
                imgWidth = (imgHeight / realHeight) * realWidth;
            } else {
                imgWidth = realWidth;
                imgHeight = realHeight;
            }
        }
    }

    //设置放大图片的尺寸、偏移量并展示
    image.style.width = imgWidth + "px";
    image.style.height = imgHeight + "px";
    x = (windowW - imgWidth) * 0.5;
    y = (windowH - imgHeight) * 0.5;
    image.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    outerdiv.style.display = "block";

    // 点击蒙版及外面区域放大图片关闭
    outerdiv.onclick = () => {
        outerdiv.style.display = "none";
        initScale = 1;
        window.removeEventListener("wheel", handleStopWheel);
    };

    // 阻止事件冒泡
    image.onclick = (e) => {
        e.stopPropagation();
    };
}

function handleStopWheel(e) {
    let itemSizeChange = 1.1; //每一次滚动放大的倍数
    if (e.target.id == "bigimg") {
        // 说明：e.dataY如果大于0则表示鼠标向下滚动，反之则向上滚动，这里设计为向上滚动为缩小，向下滚动为放大
        if (e.deltaY < 0) {
            itemSizeChange = 1 / 1.1;
        }
        let _initScale = initScale * itemSizeChange;

        // 说明：在超过或低于临界值时，虽然让initScale等于maxZoom或minreduce，但是在后续的判断中放大图片的最终倍数并没有达到maxZoom或minreduce，而是跳过。
        if (_initScale > maxZoom) {
            initScale = maxZoom;
        } else if (_initScale < minreduce) {
            initScale = minreduce;
        } else {
            initScale = _initScale;
        }
        const origin = {
            x: (itemSizeChange - 1) * imgWidth * 0.5,
            y: (itemSizeChange - 1) * imgHeight * 0.5,
        };
        // 计算偏移量
        if (_initScale < maxZoom && _initScale > minreduce) {
            x -= (itemSizeChange - 1) * (e.clientX - x) - origin.x;
            y -= (itemSizeChange - 1) * (e.clientY - y) - origin.y;
            e.target.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${initScale})`;
        }
    }

    // 阻止默认事件
    e.preventDefault();
}

function imgDrag() {
    // 绑定 鼠标按下事件
    image.addEventListener("pointerdown", pointerdown);
    // 绑定 鼠标移动事件
    image.addEventListener("pointermove", pointermove);
    image.addEventListener("pointerup", function (e) {
        if (isPointerdown) {
            isPointerdown = false;
        }
    });
    image.addEventListener("pointercancel", function (e) {
        if (isPointerdown) {
            isPointerdown = false;
        }
    });
}

function pointerdown(e) {
    isPointerdown = true;
    console.log(e.pointerId)

    // 说明：Element.setPointerCapture()将特定元素指定为未来指针事件的捕获目标。指针的后续事件将以捕获元素为目标，直到捕获被释放。可以理解为：在窗口不是全屏情况下，我在拖动放大图片时即使鼠标移出可窗口之外，此时事件还是捕获在该放大图片上。
    image.setPointerCapture(e.pointerId);

    lastPointermove = {
        x: e.clientX,
        y: e.clientY,
    };
}

function pointermove(e) {
    if (isPointerdown) {
        const current1 = {
            x: e.clientX,
            y: e.clientY,
        };
        diff.x = current1.x - lastPointermove.x;
        diff.y = current1.y - lastPointermove.y;
        lastPointermove = {
            x: current1.x,
            y: current1.y,
        };
        x += diff.x;
        y += diff.y;
        image.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${initScale})`;
    }
    e.preventDefault();
}