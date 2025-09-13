async function loadImage(src) {
    const img = new Image();
    img.src = src;
    await img.decode();
    return img;
}

/**
 * 
 * @param {ImageData} src
 * @param {ImageData} dst
 * @param {Number} alpha
 */
function whiteWash(src, dst, alpha) {
    const data = src.data;
    for (let i = 0; i < data.length; i += 4) {
        dst.data[i]   = data[i] + (255 - data[i]) * alpha; // R
        dst.data[i+1] = data[i+1] + (255 - data[i+1]) * alpha; // G
        dst.data[i+2] = data[i+2] + (255 - data[i+2]) * alpha; // B
    }
}

/**
 * 
 * @param {ImageData} src
 * @param {ImageData} dst
 * @param {Number} alpha
 */
function grayWash(src, dst, alpha) {
    const data = src.data;
    for (let i = 0; i < data.length; i += 4) {
        dst.data[i]   = data[i] + (127 - data[i]) * alpha; // R
        dst.data[i+1] = data[i+1] + (127 - data[i+1]) * alpha; // G
        dst.data[i+2] = data[i+2] + (127 - data[i+2]) * alpha; // B
    }
}

/**
 * 
 * @param {ImageData} src
 * @param {ImageData} dst
 * @param {Number} alpha
 */
function alpha(src, dst, alpha) {
    const data = src.data;
    for (let i = 0; i < data.length; i += 4) {
        dst.data[i+3] = data[i]; // R
        dst.data[i+1] = data[i+1]; // G
        dst.data[i+2] = data[i+2]; // B
        dst.data[i+3] = 255 * alpha;
    }
}

/**
 * 
 * @param {ImageData} imageData 
 * @returns {ImageData}
 */
function cloneImageData(imageData) {
    return new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
}

/**
 * 
 * @param {ImageData} src
 * @param {ImageData} dst
 * @param {boolean} invert
 */
function toGrayscale(src, dst, invert) {
    if (invert == undefined)
        invert = false;
    const data = src.data;
    const sign = invert ? -1 : 1;
    const T = invert ? 255 : 0;
    for (let i = 0; i < data.length; i += 4) {
        // RGB を輝度に変換（加重平均）
        const gray = T + (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) * sign;
        dst.data[i] = dst.data[i + 1] = dst.data[i + 2] = gray;
        // data[i+3] はそのままアルファ
    }
}

/**
 * 
 * @param {ImageData} src1 
 * @param {ImageData} src2 
 * @param {float} alpha 
 * @param {ImageData} dst 
 */
function blend(src1, src2, alpha, dst) {
    const data1 = src1.data;
    const data2 = src2.data;
    for (let i = 0; i < data1.length; i += 4) {
        const gray = data1[i] * alpha + data2[i] * (1 - alpha);
        dst.data[i] = dst.data[i + 1] = dst.data[i + 2] = gray;
    }
}

/**
 * 
 * @param {ImageData} rgb
 * @param {ImageData} alpha
 * @param {ImageData} dst 
 */
function applyAlphaMask(rgb, alpha, dst) {
    const data1 = rgb.data;
    const data2 = alpha.data;
    for (let i = 0; i < data1.length; i += 4) {
        dst.data[i] = data1[i];
        dst.data[i + 1] = data1[i + 1];
        dst.data[i + 2] = data1[i + 2];
        dst.data[i + 3] = data2[i];
    }
}

async function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
}

// Canvas に描画して ImageData を取得
function drawImageToCanvas(img, canvas) {
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
}


async function main() {
    document.body.style.background = "#ffffff"
    /** @type {HTMLCanvasElement} */
    const cv1 = document.getElementById("src1");
    /** @type {HTMLCanvasElement} */
    const cv2 = document.getElementById("src2");
    /** @type {HTMLCanvasElement} */
    const cv3 = document.getElementById("mearged");
    /** @type {HTMLCanvasElement} */
    const cv4 = document.getElementById("opacity");
    /** @type {HTMLCanvasElement} */
    const cv5 = document.getElementById("final");
    /** @type {HTMLInputElement} */
    const slid1 = document.getElementById("src1white");
    /** @type {HTMLInputElement} */
    const slid2 = document.getElementById("src2white");
    /** @type {HTMLInputElement} */
    const slid3 = document.getElementById("opacityWhite");
    /** @type {HTMLInputElement} */
    const slid4 = document.getElementById("opacityBlend");
    /** @type {HTMLInputElement} */
    const slid5 = document.getElementById("resultSplit");
    const ctx1 = cv1.getContext("2d");
    const ctx2 = cv2.getContext("2d");
    const ctx3 = cv3.getContext("2d");
    const ctx4 = cv4.getContext("2d");
    const ctx5 = cv5.getContext("2d");

    var img1, imOrig1, imData1;
    var img2, imOrig2, imData2;
    var gray1, gray2, gray3, result;
    
    // 1枚目
    function drawCtx1() {
        grayWash(imOrig1, imData1, parseFloat(slid1.value));
        ctx1.putImageData(imData1, 0, 0);
    }
    async function loadImage1(src) {
        img1 = await loadImage(src);

        // 縮小倍率を計算
        let scale = 1;
        if (img1.width > img1.height && img1.width > 900) {
            scale = 900 / img1.width;
        } else if (img1.height >= img1.width && img1.height > 900) {
            scale = 900 / img1.height;
        }

        // 新しいサイズ
        const newWidth = Math.round(img1.width * scale);
        const newHeight = Math.round(img1.height * scale);

        // キャンバスのサイズを統一
        cv1.width = cv3.width = cv4.width = cv5.width = newWidth;
        cv1.height = cv3.height = cv4.height = cv5.height = newHeight;

        // 縮小して描画
        ctx1.drawImage(img1, 0, 0, newWidth, newHeight);

        // 引き伸ばして描画
        if (imOrig2 !== undefined) {
            const off = document.createElement("canvas");
            off.width = cv2.width;
            off.height = cv2.height;
            const offCtx = off.getContext("2d");
            offCtx.putImageData(imOrig2, 0, 0);
            cv2.width = newWidth;
            cv2.height = newHeight;
            ctx2.drawImage(off, 0, 0, cv1.width, cv1.height);
            imOrig2 = ctx2.getImageData(0, 0, cv2.width, cv2.height);
            imData2 = cloneImageData(imOrig2);
            drawCtx2();
            gray2 = cloneImageData(imOrig2);
            toGrayscale(gray2, gray2);
        }

        imOrig1 = ctx1.getImageData(0, 0, cv1.width, cv1.height);
        imData1 = cloneImageData(imOrig1);
        drawCtx1();
        gray1 = cloneImageData(imOrig1);
        toGrayscale(gray1, gray1, true);
        gray3 = cloneImageData(imOrig1);
        result = cloneImageData(imOrig1);
    }

    // 2枚目
    function drawCtx2() {
        grayWash(imOrig2, imData2, parseFloat(slid2.value));
        ctx2.putImageData(imData2, 0, 0);
    }
    async function loadImage2(src) {
        img2 = await loadImage(src);

        // 縮小倍率を計算
        let scale = 1;
        if (img2.width > img2.height && img2.width > 900) {
            scale = 900 / img2.width;
        } else if (img2.height >= img2.width && img2.height > 900) {
            scale = 900 / img2.height;
        }

        // 新しいサイズ
        const newWidth = Math.round(img2.width * scale);
        const newHeight = Math.round(img2.height * scale);

        // キャンバスのサイズを統一
        cv2.width = cv3.width = cv4.width = cv5.width = newWidth;
        cv2.height = cv3.height = cv4.height = cv5.height = newHeight;

        // 縮小して描画
        ctx2.drawImage(img2, 0, 0, newWidth, newHeight);

        // 引き伸ばして描画
        if (imOrig1 !== undefined) {
            const off = document.createElement("canvas");
            off.width = cv1.width;
            off.height = cv1.height;
            const offCtx = off.getContext("2d");
            offCtx.putImageData(imOrig1, 0, 0);
            cv1.width = newWidth;
            cv1.height = newHeight;
            ctx1.drawImage(off, 0, 0, cv2.width, cv2.height);
            imOrig1 = ctx1.getImageData(0, 0, cv1.width, cv1.height);
            imData1 = cloneImageData(imOrig1);
            drawCtx1();
            gray1 = cloneImageData(imOrig1);
            toGrayscale(gray1, gray1, true);
            gray3 = cloneImageData(imOrig1);
            result = cloneImageData(imOrig1);
        }

        

        imOrig2 = ctx2.getImageData(0, 0, cv2.width, cv2.height);
        imData2 = cloneImageData(imOrig2);
        drawCtx2();
        gray2 = cloneImageData(imOrig2);
        toGrayscale(gray2, gray2);
    }

    // 3枚目
    var blendedImg = ctx1.getImageData(0, 0, cv1.width, cv1.height);
    function drawCtx3() {
        ctx3.drawImage(cv1, 0, 0);
        ctx3.globalCompositeOperation = "overlay";
        ctx3.drawImage(cv2, 0, 0);
        ctx3.globalCompositeOperation = "source-over";
        blendedImg = ctx3.getImageData(0, 0, cv1.width, cv1.height);
    }

    // 4枚目
    function drawCtx4() {
        blend(gray1, gray2, parseFloat(slid3.value), gray3)
        const value = parseFloat(slid4.value)
        if (value < 0)
            blackWash(gray3, gray3, - value);
        else 
            whiteWash(gray3, gray3, value);
        ctx4.putImageData(gray3, 0, 0);
    }

    // 5枚目
    function drawCtx5() {
        applyAlphaMask(blendedImg, gray3, result);
        ctx5.putImageData(result, 0, 0);
    }

    const fileInput1 = document.getElementById("fileInput1");

    fileInput1.addEventListener("change", async (event) => {
        if (fileInput1.files.length === 0) return;

        const file = fileInput1.files[0]; // 選択されたファイル
        // ファイルから Image を作る関数を使って loadImage1 を呼ぶ
        const objectURL = URL.createObjectURL(file);
        await loadImage1(objectURL); // loadImage1 は URL でも対応済み
        URL.revokeObjectURL(objectURL); // メモリ解放
        drawCtx1();
        drawCtx3();
        drawCtx4();
        drawCtx5();
    });
    const fileInput2 = document.getElementById("fileInput2");

    fileInput2.addEventListener("change", async (event) => {
        if (fileInput2.files.length === 0) return;

        const file = fileInput2.files[0]; // 選択されたファイル
        // ファイルから Image を作る関数を使って loadImage1 を呼ぶ
        const objectURL = URL.createObjectURL(file);
        await loadImage2(objectURL); // loadImage1 は URL でも対応済み
        URL.revokeObjectURL(objectURL); // メモリ解放
        drawCtx2();
        drawCtx3();
        drawCtx4();
        drawCtx5();
    });


    slid1.oninput = () => {
        drawCtx1();
        drawCtx3();
        drawCtx5();
    }

    slid2.oninput = () => {
        drawCtx2();
        drawCtx3();
        drawCtx5();
    }

    slid3.oninput = () => {
        drawCtx4();
        drawCtx5();
    }

    slid4.oninput = () => {
        drawCtx4();
        drawCtx5();
    }

    slid5.oninput = () => {
        cv5.style.background = `linear-gradient(to right, black ${slid5.value}%, white ${slid5.value}%)`;
    }

    const saveBtn = document.getElementById("saveBtn");
    saveBtn.addEventListener("click", () => {
        let w = cv5.width;
        let h = cv5.height;

        // 長辺が900以上なら縮小
        if (Math.max(w, h) > 900) {
            const scale = 900 / Math.max(w, h);
            w = Math.round(w * scale);
            h = Math.round(h * scale);
        }

        // 一時キャンバスに縮小描画
        const tmp = document.createElement("canvas");
        tmp.width = w;
        tmp.height = h;
        const tmpCtx = tmp.getContext("2d");
        tmpCtx.drawImage(cv5, 0, 0, w, h);

        // PNG データURL に変換
        const dataURL = tmp.toDataURL("image/png");

        // ダウンロード用リンク作成
        const a = document.createElement("a");
        a.href = dataURL;
        a.download = "canvas_image.png";
        a.click();
    });

    
    await loadImage1("91375672_p0.jpg");
    await loadImage2("98859221_p0.jpg");
    // await loadImage1("98859221_p0.jpg");
    // await loadImage2("91375672_p0.jpg");
    drawCtx3();
    drawCtx4();
    drawCtx5();
}

main();
