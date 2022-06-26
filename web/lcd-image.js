(function () {

	'use strict';

	function LcdImage() {

		this.imageWidth = 152;
		this.imageHeight = 152;
		this.imageBackground = 'white';
		this.colorThreshold = 127;
		this.imageInvert = false;
		this.blockSize = 8;

		this.fileInput = document.createElement('input');
		this.fileInput.type = 'file';

		this.output = document.getElementById('output');

		this.inputCanvas = document.getElementById('canvas-in');
		this.inputCtx = this.inputCanvas.getContext('2d');

		this.outputCanvas = document.getElementById('canvas-out');
		this.outputCtx = this.outputCanvas.getContext('2d');

		this.currentImage = new Image();
		this.frameBuffer = new Uint8ClampedArray();

		this.currentImage.addEventListener('load', this.imageLoad.bind(this));
		this.fileInput.addEventListener('change', this.fileChange.bind(this));

		this.openImage = function () {

			this.fileInput.click();

		}.bind(this);

		var gui = new dat.GUI({
			width: 300,
			autoPlace: false
		});

		document.getElementById('controls').appendChild(gui.domElement);

		gui.add(this, 'openImage');

		var processImage = this.processImage.bind(this);
		var update = this.update.bind(this);

		var settings = gui.addFolder('Settings');
		settings.add(this, 'imageWidth', 1, 1000).onChange(update);
		settings.add(this, 'imageHeight', 1, 1000).onChange(update);
		settings.add(this, 'blockSize', [2, 4, 8]).onChange(update);

		settings.add(this, 'imageBackground', ['white', 'black']).onChange(processImage);
		settings.add(this, 'imageInvert').onChange(processImage);
		settings.add(this, 'colorThreshold', 0, 255).onChange(processImage);
		settings.open();

		this.output.value = '';
		this.updateDimensions();
	}

	var proto = LcdImage.prototype;

	proto.fileChange = function () {

		URL.revokeObjectURL(this.currentImage.src);

		if (this.fileInput.files.length) {

			this.currentImage.src = URL.createObjectURL(this.fileInput.files[0]);
		}
	};

	proto.imageLoad = function () {

		this.processImage();
	};

	proto.update = function () {

		this.updateDimensions();
		this.processImage();
	};

	proto.updateDimensions = function () {

		var width = parseInt(this.imageWidth, 10);
		var height = parseInt(this.imageHeight, 10);

		width = Math.max(0, width);
		height = Math.max(0, height);

		this.inputCanvas.width = this.outputCanvas.width = width;
		this.inputCanvas.height = this.outputCanvas.height = height;

		this.frameBuffer = new Uint8ClampedArray(width * height / this.blockSize);
	};

	proto.processImage = function () {

		var width = this.inputCanvas.width;
		var height = this.inputCanvas.height;

		this.inputCtx.fillStyle = this.imageBackground;
		this.inputCtx.fillRect(0, 0, width, height);
		this.inputCtx.drawImage(this.currentImage, 0, 0);

		// read image data
		var imageData = this.inputCtx.getImageData(0, 0, width, height);
		var data = imageData.data;

		for (var i = 0; i < data.length; i += 4) {

			var r = data[i];
			var g = data[i + 1];
			var b = data[i + 2];

			// colorimetric conversion
			var gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
			var value = gray > this.colorThreshold ? 1 : 0;

			if (this.imageInvert) {
				value = 1 - value;
			}

			data[i] = data[i + 1] = data[i + 2] = value * 255;
			data[i + 3] = 255;

			// get buffer index
			var pixel = i / 4 + 1;
			var index = Math.ceil(pixel / this.blockSize) - 1;

			// get pixel position within byte
			var pos = (pixel - 1) % this.blockSize;

			// set the bit
			this.frameBuffer[index] ^= (-value ^ this.frameBuffer[index]) & (1 << (this.blockSize - 1 - pos));
		}

		this.outputCtx.putImageData(imageData, 0, 0);
		this.output.value = this.buildHexArrayFromBuffer();
	};

	proto.buildHexArrayFromBuffer = function () {
		var output = '';
		for (var i = 0; i < this.frameBuffer.length; i++) {
			var value = ('0' + (this.frameBuffer[i] & 0xFF).toString(16)).slice(-2);
			output += '0x' + value + ',';
			if (!((i + 1) % 8)) {
				output += '\n';
			}
		}
		return output.trim().slice(0, -1);
	};

	var lcdImage = new LcdImage();
})();