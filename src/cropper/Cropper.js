import Rotate from '../core/rotate';
import Img from '../core/image';
import CFile from '../core/file';

class Cropper {
  constructor(options = {}) {
    this.version = '1.0.0';
    this.options = options;
    
    if(!options.ele) { return new Error('"ele"\'s type must be "string" or "HTMLElement" '); }
    this.box = (typeof this.options.ele) === 'string' ? document.querySelector(this.options.ele) : this.options.ele;

    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');
    this.box.appendChild(this.canvas);
    
    this.pixelRatio = window.devicePixelRatio || 1;
    this.ratioXY = this.options.ratioXY || 1,
    this.scale = 1;
    this.rotate = 0;
    this.img = null;
    this.overlay = {}; // 裁剪框尺寸，位置

    // 拖拽时 缩放，移动行为的参数
    this.drag = {
      type: "resizeOverlay",   // 缩放/移动
			inProgress: false,       // 是否处于可 操作状态
			originalX: 0,            // 记录上一次拖拽点（鼠标位置）初始x值
      originalY: 0,            // 记录上一次拖拽点（鼠标位置）初始Y值
      cursorType: 'ne-resize', // 鼠标手势
      pointSort: 0,            // 拖拽缩放点中哪一个点
    }
    // 订阅事件
    this.addEventListeners();
  }
  //传入图片时 初始化参数
  async init(file) {
    const imgBase64 = await CFile.load(file);
    this.img = await Img.load(imgBase64);
    // 初始化旋转情形
    this.rotate = await Rotate.orientation(file);
    // 重置canvas尺寸
    this.setCanvasSize(this.img.width, this.img.height, this.rotate);
    // 计算蒙层及裁剪框位置，尺寸；
    this.overlay = this.initOverlay();
    // 高清屏 放大上下文尺寸
    this.canvas.style.width = this.canvas.width + 'px';
    this.canvas.style.height = this.canvas.height + 'px';
    this.canvas.setAttribute('width', this.canvas.width * this.pixelRatio);
    this.canvas.setAttribute('height', this.canvas.height * this.pixelRatio);

    // 绘制图形
    this.draw();
  }
  // 每次旋转图片都需要初始化canvas一次 
  // rotate 旋转情况
  // 需要旋转时高度 要由放大到 原来的 （宽 度 / 高度）倍数，宽度放大同样的倍数
  draw() {
    // clear the canvas
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.save();
    this.context.scale(this.pixelRatio, this.pixelRatio);
    // 绘制图片
    this.drawImage(this.img, this.rotate);
    this.drawOverlay(this.overlay);
    this.drawResizer(this.overlay);
    this.context.restore();
  }
  // 绘制图片
  drawImage(image, rotate) {
    const canvas = this.canvas;
    const context = canvas.getContext('2d');

    const width = this.canvas.offsetWidth;
    const height = this.canvas.offsetHeight;
    
    if (!rotate || rotate > 8) {
      context.drawImage(image, 0, 0, width, height);
    }

    context.save();
    this.rotateCanvas(canvas, this.rotate, width, height);

    if (rotate > 4) {
      context.drawImage(image, 0, 0, height, width);
    } else {
      context.drawImage(image, 0, 0, width, height);
    }
    context.restore();
  }
  // 绘制蒙层
  // 依靠 overlay 绘制
  drawOverlay(overlay ) {
    // draw the overlay using a path made of 4 trapeziums (ahem)
    const canvas = this.canvas;
		this.context.save();

    this.context.fillStyle = overlay.style.color;
		this.context.beginPath();
   
		this.context.moveTo(0, 0);
		this.context.lineTo(overlay.x, overlay.y);
		this.context.lineTo(overlay.x + overlay.width, overlay.y);
		this.context.lineTo(canvas.width, 0);

		this.context.moveTo(canvas.width, 0);
		this.context.lineTo(overlay.x + overlay.width, overlay.y);
		this.context.lineTo(overlay.x + overlay.width, overlay.y + overlay.height);
		this.context.lineTo(canvas.width, canvas.height);

		this.context.moveTo(canvas.width, canvas.height);
		this.context.lineTo(overlay.x + overlay.width, overlay.y + overlay.height);
		this.context.lineTo(overlay.x, overlay.y + overlay.height);
		this.context.lineTo(0, canvas.height);

		this.context.moveTo(0, canvas.height);
		this.context.lineTo(overlay.x, overlay.y + overlay.height);
		this.context.lineTo(overlay.x, overlay.y);
		this.context.lineTo(0, 0);
    
    this.context.fill();
    this.context.closePath();

    this.context.beginPath();
    this.context.strokeStyle = '#fff';
    this.context.lineWidth = 1;
    this.context.strokeRect(overlay.x, overlay.y, overlay.width, overlay.height);
    this.context.restore();

  }
  // 绘制拖拽点
  drawResizer(overlay) {
    const context = this.canvas.getContext('2d');
    const resizerRectArr = [
      {
        x: overlay.x,
        y: overlay.y,
      }
      , 
      {
        x: overlay.x + overlay.width,
        y: overlay.y,
      },
      {
        x: overlay.x,
        y: overlay.y + overlay.height,
      },
      {
        x: overlay.x + overlay.width,
        y: overlay.y + overlay.height,
      }
    ]
    const arr = [{x: 1, y: 1}, {x: -1, y : 1}, {x: 1, y: -1}, {x: -1, y: -1}];
    resizerRectArr.forEach((point, index) => {
      context.save();
      context.beginPath();
      context.lineWidth = '2';
      context.strokeStyle = "#fff";
      context.lineJoin="round";
      context.moveTo(point.x + (arr[index].x * overlay.resizerSide), point.y);
      context.lineTo(point.x, point.y);
      context.lineTo(point.x, point.y + (arr[index].y * overlay.resizerSide));
      context.stroke();
      // context.fillRect(point.x, point.y, overlay.resizerSide, overlay.resizerSide);
      // context.strokeRect(point.x, point.y, overlay.resizerSide, overlay.resizerSide);

      context.closePath();
      context.restore();
    });
  }
  // 设置canvas尺寸
  /**
   * param width 图片宽度
   * param height 图片高度
   * param rotate 旋转情形
   */
  setCanvasSize(width, height, rotate) {
    // 判断图片是否需要旋转
    const needRotate = rotate > 4 && rotate <= 8;
    const boxWidth = this.box.offsetWidth;

    // 计算图片压缩比列
    const scale = !needRotate ? boxWidth / width : boxWidth / height;

    // canvas 的宽度尺寸是固定与 外部盒子相等的
    this.canvas.width = boxWidth;
    this.canvas.height = !needRotate ? height * scale : width * scale;
    this.scale = scale;
    // console.log(this.canvas);
  }
  // 计算裁剪框位置尺寸
  initOverlay() {
   const overlay = {
    x: (this.canvas.width / 2) - 100,           // 裁剪框位置x
    y: (this.canvas.height / 2) -100,           // 裁剪框位置y
    height: 200 /  this.ratioXY,    // 裁剪框大小
    width: 200 ,     // 裁剪框大小
    style: {
      color: 'rgba(0, 0, 0, 0.6)',
    },
    resizerSide: 10,
    ratioXY: this.ratioXY,
    }
    return overlay;
  }
  // 监听 鼠标 手势事件
  addEventListeners() {
    const canvas = this.canvas;
    const drag = this.drag;
    // console.log(this);
		// add mouse listeners to the canvas
		canvas.onmousedown = (event) => {
			// depending on where the mouse has clicked, choose which type of event to fire
      var coords = this.getMouseCoords(event);
      // console.log(coords);
		  this.initialCropOrMoveEvent(coords);
    };
		canvas.onmouseup = (event) => {
      // cancel any drags
			drag.inProgress = false;
		};

		canvas.onmouseout = (event) => {
			// cancel any drags
			drag.inProgress = false;
		};

		canvas.onmousemove = (event) => {
			const coords = this.getMouseCoords(event);
			this.startCropOrMoveEvent(coords, event);
    };

		canvas.addEventListener('touchstart', event => {
			this.initialCropOrMoveEvent(this.getTouchPos(event));
		});

		canvas.addEventListener('touchmove', event => {
			this.startCropOrMoveEvent(this.getTouchPos(event), event);
		});

		canvas.addEventListener('touchend', event => {
			drag.inProgress = false;
		})
  }

  // 移动鼠标 手势 绘制裁剪框
	startCropOrMoveEvent({x, y}, event) {
    const canvas = this.canvas;
    const drag = this.drag;
    const overlay = this.overlay;

    // 阻止滚动穿透
    if (drag.inProgress) {
      event.preventDefault();
    }
    if (x < 0 || y < 0 || x > this.canvas.width || y > this.canvas.height) {
      return false;
    }
    if (this.isInHandle(x, y)) {
      drag.pointSort = this.isInHandle(x, y).pointSort;
      drag.cursorType = this.isInHandle(x, y).cursorType;
    }
		// Set current cursor as appropriate
		if(this.isInHandle(x, y) || (drag.inProgress && drag.type === "resizeOverlay")) {
      canvas.style.cursor = drag.cursorType;
		} else if(this.isInOverlay(x, y)) {
			canvas.style.cursor = 'move';
		} else {
			canvas.style.cursor = 'auto';
    }
		// give up if there is no drag in progress
		if(!drag.inProgress) { 
			return false;
    }
    
		// check what type of drag to do
		if(drag.type === "moveOverlay") {
			overlay.x = x - drag.originalOverlayX;
			overlay.y = y - drag.originalOverlayY;

			// Limit to size of canvas.
			var xMax = canvas.offsetWidth - overlay.width;
			var yMax = canvas.offsetHeight - overlay.height;

			if(overlay.x < 0) {
				overlay.x = 0;
			} else if(overlay.x > xMax) {
				overlay.x = xMax;
			}

			if(overlay.y < 0) {
				overlay.y = 0;
			} else if(overlay.y > yMax) {
				overlay.y = yMax;
			}

      this.draw();
      return false;
    } 
    if(drag.type === "resizeOverlay") {
      // 确定当前 是那个缩放按钮；
      // 先判断鼠标移动方向;
      // 根据移动方向 缩放裁剪框；
      const pointSort = drag.pointSort;
      const computeArr = [{x: -1, y: -1}, {x: 1, y: -1}, {x: 1, y: 1}, {x: -1, y: 1}];

      overlay.width += (x - drag.originalX) * computeArr[pointSort].x;
      overlay.x += computeArr[pointSort].x < 0 ? (x - drag.originalX) : 0;

			// do not allow the overlay to get too small
			if(overlay.width < 10) {
				overlay.width = 10;
			}

			// Don't allow crop to overflow
			if(overlay.x + overlay.width > canvas.width) {
				overlay.width = canvas.width - overlay.x;
			}

      overlay.height = overlay.width / overlay.ratioXY;
      overlay.y += computeArr[pointSort].y < 0 ? ((x - drag.originalX) / overlay.ratioXY) * computeArr[pointSort].y *  computeArr[pointSort].x : 0;

      drag.originalY = y;
      drag.originalX = x;

      overlay.x = overlay.x > 0 ? overlay.x : 0;
      overlay.y = overlay.y > 0 ? overlay.y : 0;

			if(overlay.y + overlay.height > canvas.height) {
				overlay.height = canvas.height - overlay.y;
				overlay.width = overlay.height * overlay.ratioXY;
      }
      
      this.draw();
      return false;
		}
	}
  // 获取鼠标位置相对画布的位置
  getMouseCoords(event) {
    // loop through this element and all its parents to get the total offset
		var totalOffsetX = 0;
		var totalOffsetY = 0;
		var canvasX = 0;
		var canvasY = 0;
		var currentElement = event.target;

    // console.log('-----currentElement.offsetLeft------',  currentElement.offsetLeft)
    // console.log('----- currentElement.offsetTop------',   currentElement.offsetTop)
    // console.log('-------currentElement.offsetParent---------', currentElement.offsetParent)
    // console.log(event);
		do {
			totalOffsetX += currentElement.offsetLeft;
			totalOffsetY += currentElement.offsetTop;
		}
		while(currentElement = currentElement.offsetParent)

		canvasX = event.pageX - totalOffsetX;
    canvasY = event.pageY - totalOffsetY;
    
    // console.log('-------event.pageX---event.pageY---canvasX-- canvasY-----totalOffsetY----', event.pageX, event.pageY, canvasX, canvasY, totalOffsetY);

		return {x:canvasX, y:canvasY}
  }

  getClickPos({x, y}) {
		return {
			x : x - window.scrollX,
			y : y - window.scrollY
    }	
  }
  getTouchPos(touchEvent) {
		var rect = this.canvas.getBoundingClientRect();
		return {
			x: touchEvent.touches[0].clientX - rect.left,
			y: touchEvent.touches[0].clientY - rect.top
		};
	}
  // 初始化 拖拽 参数drag
	initialCropOrMoveEvent({x, y}) {
    const drag = this.drag;
    if(this.isInHandle(x, y)) {
			drag.type = "resizeOverlay";
			drag.inProgress = true;
			drag.originalX = x;
			drag.originalY = y;
			drag.originalOverlayWidth = this.overlay.width;
      drag.originalOverlayHeight = this.overlay.height;
      return false;
    }
		// if the mouse clicked in the overlay	
		if(this.isInOverlay(x, y)) {
			drag.type = "moveOverlay";
			drag.inProgress = true;
			drag.originalOverlayX = x - this.overlay.x;
      drag.originalOverlayY = y - this.overlay.y;
      return false;
		}
  }
  // 判断是否在裁剪框内
  isInOverlay(x, y) {
    const overlay = this.overlay;
		return x > overlay.x && x < (overlay.x + overlay.width) && y > overlay.y && y < (overlay.y + overlay.height);
  }

  // 判断鼠标是否在缩放按钮位置
	isInHandle(x, y) {
    const overlay = this.overlay;
    const resizerRectArr = [
      {
        x: overlay.x,
        y: overlay.y,
      }
      , 
      {
        x: overlay.x + overlay.width,
        y: overlay.y,
      },
      {
        x: overlay.x + overlay.width ,
        y: overlay.y + overlay.height,
      },
      {
        x: overlay.x,
        y: overlay.y + overlay.height,
      }
    ]
    let tag = null;
    resizerRectArr.forEach((point, index) => {
      // console.log(Math.pow(point.x - x, 2), Math.pow(point.y - y, 2),  Math.pow(overlay.resizerSide / 2, 2));
      if (Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2) <= Math.pow(20, 2)) {
        tag = {
          point,
          pointSort: index,
          cursorType: index === 0 || index ===  2 ? 'nwse-resize' : 'ne-resize',
        }

        // console.log('-index--tag.cursorType----', index, tag.cursorType);
      }
    });
		// return x > (overlay.x + overlay.width - overlay.resizerSide) && x < (overlay.x + overlay.width + overlay.resizerSide) && y > (overlay.y + overlay.height - overlay.resizerSide) && y < (overlay.y + overlay.height + overlay.resizerSide);
    return tag;
  }

  // 裁剪图片
  cropImage() {
    const overlay = this.overlay;
    const scale = this.scale;
    const needRotate = this.rotate > 4 && this.rotate <= 8;

		let x = 0;
		let y = 0;
		let width = this.img.width;
    let height = this.img.height;

    x =  Math.floor(overlay.x / scale);
    y =  Math.floor(overlay.y / scale);

    width = Math.floor(overlay.width / scale);
    height = Math.floor(overlay.height / scale);

    const newOverlay = this.rotateOverlay(this.img, x, y, width, height, this.rotate)

    let cropCanvas = document.createElement("canvas");
    const cropContext = cropCanvas.getContext("2d");

    cropCanvas.setAttribute("width", !needRotate ? width : height);
    cropCanvas.setAttribute("height", !needRotate ? height: width);
    // cropCanvas.setAttribute("width", !needRotate ? this.img.width : this.img.height);
    // cropCanvas.setAttribute("height", !needRotate ? this.img.height: this.img.width);
    
    // 旋转画布（兼容）
    // this.rotateCanvas(cropCanvas, this.rotate, !needRotate ? this.img.width : this.img.height,  !needRotate ? this.img.height: this.img.width);
    this.rotateCanvas(cropCanvas, this.rotate, !needRotate ? width : height,  !needRotate ? height: width);

    cropContext.drawImage(this.img, newOverlay.x, newOverlay.y, newOverlay.width, newOverlay.height, 0, 0, newOverlay.width, newOverlay.height);
    // cropContext.drawImage(this.img, 0, 0, this.img.width, this.img.height);
		return cropCanvas;
  }

  // 获取裁剪图片的base64
  getCroppedImageSrc() {
    if (!this.img) { return false;}
    const cropCanvas = this.cropImage();
    const url = cropCanvas.toDataURL("image/jpeg", 1);
    return url;
  };
  // 获取base64格式
  getDataUrl(type, quality) {
    const canvas =  this.cropImage();
    return canvas.toDataURL(type, quality);
  }
  // 获取bolb 格式
  getBolb(callback, type, quality) {
    const canvas = this.cropImage();
    return canvas.toBlob(callback, type, quality);
  }
  // base64 -> File
  dataURLtoFile(dataurl, filename) {
    var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime }); // file 类型
  }
  // 计算旋转后裁剪框的位置尺寸
  /**
   * 
   * @param {Object File} img 
   * @param {String} x 裁剪框 起始点x
   * @param {String} y 裁剪框 起始点y
   * @param {String} width 裁剪框 宽度
   * @param {String} height 裁剪款 高度
   * @param {String} rotate 旋转情形
   */
  rotateOverlay(img,x, y, width, height, rotate) {
    
    const overlay = {x, y, width, height};
    const imgWidth = img.width;
    const imgHeight = img.height;
    // console.log('x, y, width, height, rotate,img.width, img.height', x, y, width, height, rotate,img.width, img.height);
    switch(rotate) {
      case 2:
        overlay.x = imgWidth - x - width;
        break;
      case 3:
        overlay.x = imgWidth - x - width;
        overlay.y = imgHeight - y -height;
        break;
      case 4:
        overlay.y = imgHeight - y - height;
        break;
      case 5:
        overlay.x = y;
        overlay.y = x;
        overlay.width = height;
        overlay.height = width;
        break;
      case 6:
        overlay.x = y;
        overlay.y = imgHeight- x - width;
        overlay.width = height;
        overlay.height = width;
        break;
      case 7:
        overlay.x =  imgWidth  - y - height;
        overlay.y = imgHeight - x - width;
        overlay.width = width;
        overlay.height = height;
        break;
      case 8:
        overlay.x = y;
        overlay.y = x;
        overlay.width = height;
        overlay.height = width;
         break; 
    }
    // console.log('--overlay---', overlay);
    return overlay;
  }
  // 旋转 canvas
  rotateCanvas(canvas, rotate, width, height) {
    const context = canvas.getContext('2d');
    switch (rotate) {
      case 2:
        // horizontal flip
        context.translate(width, 0)
        context.scale(-1, 1)
        break
      case 3:
        // 180° rotate left
        context.translate(width, height)
        context.rotate(Math.PI)
        break
      case 4:
        // vertical flip
        context.translate(0, height)
        context.scale(1, -1)
        break
      case 5:
        // vertical flip + 90 rotate right
        context.rotate(0.5 * Math.PI)
        context.scale(1, -1)
        break
      case 6:
        // 90° rotate right
        context.rotate(0.5 * Math.PI)
        context.translate(0, - width)
        break
      case 7:
        // horizontal flip + 90 rotate right
        context.rotate(0.5 * Math.PI)
        context.translate(height, -width)
        context.scale(-1, 1)
        break
      case 8:
        // 90° rotate left
        context.rotate(-0.5 * Math.PI)
        context.translate(- height, 0)
        break
    }
    return canvas;
  }
  // 获取
  getPixelRatio (context) {
    const backingStore = context.backingStorePixelRatio ||
        context.webkitBackingStorePixelRatio ||
        context.mozBackingStorePixelRatio ||
        context.msBackingStorePixelRatio ||
        context.oBackingStorePixelRatio ||
        context.backingStorePixelRatio || 1;

    return (window.devicePixelRatio || 1) / backingStore;
};
}
export default Cropper;