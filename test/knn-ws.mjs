import FeaturesDao from "./features-mem-dao.mjs";

import supertest from "supertest";
import { expect } from "chai";
import STATUS from "http-status";

import serve from "../src/knn-ws.mjs";
import { uint8ArrayToB64, b64ToUint8Array } from "prj2-sol";

const BASE = "/knnTests";

describe("KNN Web Services", () => {
  let knnConfig;
  let dao;
  beforeEach(async function () {
    dao = await FeaturesDao.setup();
    knnConfig = { k: 3, base: BASE };
  });

  //mocha runs this after each test; we use this to clean up the DAO.
  afterEach(async function () {
    await FeaturesDao.tearDown(dao);
  });

  async function startServe(labeledTestFeatures) {
    const serveResult = await serve(knnConfig, dao, labeledTestFeatures);
    expect(serveResult.hasErrors).to.be.false;
    const ws = supertest(serveResult.val);
    return ws;
  }

  async function postImage(ws, uint8bytes) {
    const imageB64 = uint8ArrayToB64(uint8bytes);
    const post = await ws
      .post(`${BASE}/images`)
      .set("content-type", "application/json")
      .send(`"${imageB64}"`);
    expect(post.status).to.equal(STATUS.OK);
    const id = post.body.id;
    expect(id).to.be.a("string");
    expect(id.length).to.be.greaterThan(0);
    return id;
  }

  async function labelImage(ws, uint8Bytes, k = 3) {
    const id = await postImage(ws, uint8Bytes);
    const get = await ws.get(`${BASE}/labels/${id}?k=${k}`);
    expect(get.status).to.equal(STATUS.OK);
    const label = get.body.label;
    expect(label).to.be.a("string");
    expect(label.length).to.be.greaterThan(0);
    return label;
  }

  const N_BYTES = 16;

  it("must be able to POST a test features", async () => {
    const labeledImages = randLabeledFeatures(N_BYTES, 1);
    const imageBytes = labeledImages[0].features;
    const ws = await startServe();
    const id = await postImage(ws, imageBytes);
  });

  it("must POST and GET test features", async () => {
    const labeledImages = randLabeledFeatures(N_BYTES, 1);
    const imageBytes = labeledImages[0].features;
    const ws = await startServe();
    const id = await postImage(ws, imageBytes);
    const get = await ws.get(`${BASE}/images/${id}`);
    const imageB64 = uint8ArrayToB64(new Uint8Array(imageBytes));
    expect(get.body.features).to.equal(imageB64);
  });

  it("must get a NOT_FOND error on retrieving image with bad ID", async () => {
    const labeledImages = randLabeledFeatures(N_BYTES, 1);
    const imageBytes = labeledImages[0].features;
    const ws = await startServe();
    const id = await postImage(ws, imageBytes);
    const get = await ws.get(`${BASE}/images/${id}x`);
    expect(get.status).to.equal(STATUS.NOT_FOUND);
  });

  it("must get a NOT_FOUND error on an incorrect method", async () => {
    const ws = await startServe();
    const get = await ws.get(`${BASE}/images`);
    expect(get.status).to.equal(STATUS.NOT_FOUND);
  });

  it("must get a NOT_FOUND error on an incorrect url", async () => {
    const ws = await startServe();
    const post = await ws.post(`${BASE}/labels`);
    expect(post.status).to.equal(STATUS.NOT_FOUND);
  });

  it("must correctly classify test features", async () => {
    const train = randLabeledFeatures(N_BYTES, 200);
    const ws = await startServe(train);
    const tests = randLabeledFeatures(N_BYTES, 40, 5);
    for (const t of tests) {
      const { features, label } = t;
      const label1 = await labelImage(ws, features);
      // console.log(`label1==>${label1}`)
      expect(label1).to.equal(label);
    }
  });

  it("closest training feature must have matching label", async () => {
    const train = randLabeledFeatures(N_BYTES, 200);
    const ws = await startServe(train);
    const tests = randLabeledFeatures(N_BYTES, 40, 5);
    for (const t of tests) {
      const { features } = t;
      const id = await postImage(ws, features);
      const get1 = await ws.get(`${BASE}/labels/${id}`);
      expect(get1.status).to.equal(STATUS.OK);
      const id1 = get1.body.id;
      expect(id1).to.be.a("string");
      expect(id1.length).to.be.greaterThan(0);
      const label1 = get1.body.label;

      expect(label1).to.be.a("string");
      expect(label1.length).to.be.greaterThan(0);
      const get2 = await ws.get(`${BASE}/images/${id1}`);
      expect(get2.body.label).to.equal(label1);
    }
  });

  it("must correctly classify test despite single incorrectly labeled image", async () => {
    const train = randLabeledFeatures(N_BYTES, 200);
    for (let label = 0; label < 10; label++) {
      const features = randUint8Array(N_BYTES, (label + 1) * 20, 0);
      train.push({ features, label: ((label + 1) % 10).toString() });
    }
    const ws = await startServe(train);
    const tests = randLabeledFeatures(N_BYTES, 40, 5);
    for (const t of tests) {
      const { features, label } = t;
      const label1 = await labelImage(ws, features);
      expect(label1).to.equal(label);
    }
  });

  it(
    `must correctly classify tests despite two
      incorrectly labeled images when k == 5`.trim(),
    async () => {
      const train = randLabeledFeatures(N_BYTES, 200);
      for (let label = 0; label < 10; label++) {
        const features = randUint8Array(N_BYTES, (label + 1) * 20, 0);
        train.push({ features, label: ((label + 1) % 10).toString() });
        train.push({ features, label: ((label + 2) % 10).toString() });
      }
      const ws = await startServe(train);
      const tests = randLabeledFeatures(N_BYTES, 40, 5);
      for (const t of tests) {
        const { features, label } = t;
        const label1 = await labelImage(ws, features, 5);
        expect(label1).to.equal(label);
      }
    }
  );

  //uses k = 3, with 2 incorrectly labeled training images which exactly
  //match test images.
  it("must incorrectly classify tests when too many bad labeled images", async () => {
    const train = randLabeledFeatures(N_BYTES, 200);
    for (let label = 0; label < 10; label++) {
      const features = randUint8Array(N_BYTES, (label + 1) * 20, 0);
      train.push({ features, label: ((label + 1) % 10).toString() });
      train.push({ features, label: ((label + 2) % 10).toString() });
    }
    const ws = await startServe(train);
    const tests = randLabeledFeatures(N_BYTES, 40, 0);
    for (const t of tests) {
      const { features, label } = t;
      const label1 = await labelImage(ws, features, 3);
      expect(label1).to.not.equal(label);
    }
  });

  it("must detect BAD_FMT error when training & test # bytes differ ", async () => {
    const train = randLabeledFeatures(N_BYTES, 200);
    const ws = await startServe(train);
    const tests = randLabeledFeatures(N_BYTES + 1, 5);
    for (const t of tests) {
      const { features, label } = t;
      const id = await postImage(ws, features);
      const get = await ws.get(`${BASE}/labels/${id}`);
      expect(get.status).to.equal(STATUS.BAD_REQUEST);
      expect(get?.body?.errors?.[0]?.options?.code).to.equal("BAD_FMT");
    }
  });
});

/** return random int in closed interval [n - k, n + k] */
function randVal(n, k) {
  const k2 = 2 * k + 1;
  const rand = Math.random();
  return Math.trunc(n - k + rand * k2);
}

/** return n random bytes in closed interval [v - k, v + k] */
function randUint8Array(n, v, k) {
  const bytes = [];
  for (let i = 0; i < n; i++) bytes.push(randVal(v, k));
  return new Uint8Array(bytes);
}

/** return n random images having with each image having nBytes bytes
 *  with label between 0 and 9 with bytes for label lab being in
 *  closed interval [ 20*(label+1) + 9, 20*(label+1) - 9]
 */
function randLabeledFeatures(nBytes, n, k = 9) {
  const labeledImages = [];
  for (let i = 0; i < n; i++) {
    const label = Math.trunc(10 * Math.random()); //0, 1, ..., 8, 9
    const base = (label + 1) * 20; //20, 40, ..., 180, 200
    const features = randUint8Array(nBytes, base, k);
    labeledImages.push({ features, label: label.toString() });
  }
  return labeledImages;
}

/*

describe('KNN classifier', () => {
  

});
*/
