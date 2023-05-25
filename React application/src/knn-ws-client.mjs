import { ok, err } from "cs544-js-utils";

export default function makeKnnWsClient(wsUrl) {
  // return KnnWsClient.make(wsUrl);
  return new KnnWsClient(wsUrl);
}

class KnnWsClient {
  constructor(wsUrl) {
    //TODO
    // Object.assign(this.wsUrl);
    this.wsUrl=wsUrl;
  }
  static async make(dbUrl) {
    const wsUrl = {};
    try {
      wsUrl.url = dbUrl;

      return ok(new KnnWsClient(wsUrl));
    }
    catch (error) {
      if (error instanceof Error) console.error(error);
      return err(error.message, { code: 'DB' });
    }
  }

  async close() {
    try {
      await this._client.close();
    }
    catch (e) {
      if (e instanceof Error) console.error(e);
      err(e.message, { code: 'DB' });
    }
  }



  /** Given a base64 encoding b64Img of an MNIST compatible test
   *  image, use web services to return a Result containing at least
   *  the following properties:
   *
   *   `label`: the classification of the image.
   *   `id`: the ID of the training image "closest" to the test
   *         image.
   *
   *  If an error is encountered then return an appropriate
   *  error Result.
   */
   async classify(b64Img) {
    //TODO
    // console.log("B64",b64Img)
    const response = await fetch(this.wsUrl+"/knn/images",{
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(b64Img)
    })    
    return response.json();  

  }
  
  /** Return a Result containing the base-64 representation of
   *  the image specified by imageId.  Specifically, the success
   *  return should be an object containing at least the following
   *  properties:
   *
   *   `features`:
   *     A base-64 representation of the retrieved image bytes.
   *   `label`:
   *     The label associated with the image (if any).
   *
   *  If an error is encountered then return an appropriate
   *  error Result.
   */
   async getImage(imageId) {
    //TODO
    const response = await fetch(this.wsUrl+"/knn/labels/"+imageId,{
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })    
    return response.json();  
  }

  /** convert an erroneous JSON web service response to an error Result. */
  wsError(jsonRes) {
    return err(jsonRes.errors[0].message, jsonRes.errors[0].options);
  }
}
