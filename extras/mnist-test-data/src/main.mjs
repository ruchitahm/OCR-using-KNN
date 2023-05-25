import { parseImages, knn } from "prj1-sol";

import { ok, err } from "cs544-js-utils";

import fs from "fs";
import Path from "path";
import util from "util";

/**************************** main program *****************************/

const FILE_NAMES = {
  images: "t10k-images-idx3-ubyte",
  labels: "t10k-labels-idx1-ubyte",
};

const MNIST_HEADERS = {
  images: [
    { name: "magic", value: 0x803 },
    { name: "nImages" },
    { name: "nRows", value: 28 },
    { name: "nCols", value: 28 },
  ],
  labels: [{ name: "magic", value: 0x801 }, { name: "nLabels" }],
};

const BASE_N_CHARS = 6;

export default async function main(args) {
  try {
    if (args.length !== 2) usage();
    const [mnistDir, outDir] = args;

    const testData = await loadData(mnistDir, FILE_NAMES);

    const testResult = parseImages(MNIST_HEADERS, testData);
    if (testResult.hasErrors) panic(testResult);

    const writeFile = util.promisify(fs.writeFile);
    for (const [i, { features, label }] of testResult.val.entries()) {
      const featuresB64 = uint8ArrayToB64(features);
      const base = `${i}`.padStart(BASE_N_CHARS, "0");
      await writeFile(`${outDir}/${base}.b64`, `"${featuresB64}"\n`, "utf8");
      await writeFile(`${outDir}/${base}.label`, `${label}\n`, "utf8");
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

function usage() {
  const msg = `
    usage: ${Path.basename(process.argv[1])} MNIST_DATA_DIR OUT_DIR
  `.trim();
  console.error(msg);
  process.exit(1);
}

/**************************** Loading Data *****************************/

async function loadData(dir, filePaths) {
  const readFile = util.promisify(fs.readFile);
  const data = {};
  for (const t of Object.keys(filePaths)) {
    const path = Path.join(dir, filePaths[t]);
    try {
      const bytes = await readFile(path);
      data[t] = bytes;
    } catch (err) {
      console.error(`unable to read ${path}: ${err.message}`);
      process.exit(1);
    }
  }
  return data;
}

/****************************** Utilities ******************************/

function uint8ArrayToB64(uint8array) {
  const arr = Array.from(uint8array);
  return btoa(arr.map((e) => String.fromCharCode(e)).join(""));
}

function panic(errResult) {
  console.assert(errResult.hasErrors);
  for (const err of errResult.errors) {
    console.error(err.message);
  }
  process.exit(1);
}
