//Placeholder declaration for Result defined in in the course file
//lib/cs544-js-utils/src/errors.d.ts
type Result<T> = {};

//Placedholder declaration for app returned by calling express().
type App = {};

//Placeholder declaration for DAO built by Project 2
type FeaturesDao = {};

/** Config information for knn web services */
type KnnConfig = {
  /** hyper-parameter for the KNN algorithm. */
  k: number;

  /** all web service URLs have this as prefix */
  base: string;
};

type LabeledFeatures = {
  features: Uint8Array; //features == image
  label: string;
};

/** Return KNN server.  If trainData is specified, then clear db and
 *  load into db.  Return created express app
 */
declare function serve(
  knnConfig: KnnConfig,
  dao: FeaturesDao,
  trainData?: LabeledFeatures[]
): Result<App>;
