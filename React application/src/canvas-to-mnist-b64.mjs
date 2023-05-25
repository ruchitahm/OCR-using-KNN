export default function (canvasCtx) {
  const aliased = readCanvas(canvasCtx);
  const anti = antiAlias(aliased);
  const mnist = mnistRecenter(anti);
  const buf = toArrayBuffer(mnist);
  const b64 = uint8ArrayToB64(buf);
  return b64;
}

const MNIST = { width: 28, height: 28 };

function readCanvas(ctx) {
  const { width, height } = ctx.canvas;
  const img = ctx.getImageData(0, 0, width, height);
  const pixels = Array.from({ length: height }).map((_) =>
    Array.from({ length: width }).map((_) => 0)
  );
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const d = img.data[(row * width + col) * 4 + 2];
      pixels[row][col] = d;
    }
  }
  return pixels;
}

function antiAlias(aliased) {
  const height = aliased.length;
  const width = aliased?.[0]?.length ?? 0;
  const [h1, w1] = [height - 1, width - 1];
  const anti = Array.from({ length: height }).map((_) =>
    Array.from({ length: width }).map((_) => 0)
  );
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      let d0 = aliased[row][col];
      let dn = row > 0 ? aliased[row - 1][col] : 0;
      let dne = row > 0 && col < w1 ? aliased[row - 1][col + 1] : 0;
      let de = col < w1 ? aliased[row][col + 1] : 0;
      let dse = row < h1 && col < w1 ? aliased[row + 1][col + 1] : 0;
      let ds = row < h1 ? aliased[row + 1][col] : 0;
      let dsw = col > 0 && row < h1 ? aliased[row + 1][col - 1] : 0;
      let dw = col > 0 ? aliased[row][col - 1] : 0;
      let dnw = row > 0 && col > 0 ? aliased[row - 1][col - 1] : 0;
      anti[row][col] = Math.trunc(
        (6 * d0 +
          4 * dn +
          1 * dne +
          4 * de +
          1 * dse +
          4 * ds +
          1 * dsw +
          4 * dw +
          1 * dnw) /
          26
      );
    }
  }
  return anti;
}

function centerOfMass(img) {
  const height = img.length;
  const width = img?.[0]?.length ?? 0;
  let [xsum, ysum, wtsum] = [0, 0, 0, 0];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const wt = img[y][x];
      xsum += x * wt;
      ysum += y * wt;
      wtsum += wt;
    }
  }
  return [Math.trunc(xsum / wtsum), Math.trunc(ysum / wtsum)];
}

function mnistRecenter(img) {
  const imgCenter = centerOfMass(img);
  const height = img.length;
  const width = img?.[0]?.length ?? 0;
  const mnist = Array.from({ length: MNIST.height }).map((_) =>
    Array.from({ length: MNIST.width }).map((_) => 0)
  );
  const mnistCenter = [
    Math.trunc(MNIST.width / 2),
    Math.trunc(MNIST.height / 2),
  ];
  const maxOffsets = [MNIST.width - width, MNIST.height - height];
  const offsets = [
    mnistCenter[0] - imgCenter[0],
    mnistCenter[1] - imgCenter[1],
  ];
  offsets[0] = Math.min(offsets[0], maxOffsets[0]) || 0;
  offsets[1] = Math.min(offsets[1], maxOffsets[1]) || 0;
  //if (DEBUG) console.log('centers', imgCenter, mnistCenter, offsets);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      mnist[y + offsets[1]][x + offsets[0]] = img[y][x];
    }
  }
  return mnist;
}

function toArrayBuffer(data) {
  const height = data.length;
  const width = data?.[0]?.length ?? 0;
  const n = height * width;
  const buf = new Uint8Array(n);
  let i = 0;
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      buf[i++] = data[row][col];
    }
  }
  return buf;
}

function uint8ArrayToB64(uint8array) {
  const arr = Array.from(uint8array);
  return btoa(arr.map((e) => String.fromCharCode(e)).join(""));
}
