import logger from "../loggers";

function isNumber(n) {
  // eslint-disable-next-line no-restricted-globals
  return typeof n == "number" && !isNaN(n) && isFinite(n);
}

// eslint-disable-next-line import/prefer-default-export
export function calculatePlanPrice(
  baseprice,
  featuredescription,
  boughtfeatures
) {
  const featuresDict = {};
  let price = baseprice;
  featuredescription.forEach(section => {
    section.features.forEach(feature => {
      if (!feature.key) return;
      if (feature.key in featuresDict) {
        throw new Error(`Key ${feature.key} duplicated in feature description`);
      }
      featuresDict[feature.key] = feature;
    });
  });

  // eslint-disable-next-line no-restricted-syntax
  for (const key in boughtfeatures) {
    if (!boughtfeatures.hasOwnProperty(key)) continue;
    if (!(key in featuresDict)) {
      throw new Error(`Bought feature ${key} has no definition in plan`);
    }
    const feature = boughtfeatures[key];
    const featureDefinition = featuresDict[key];
    if (
      !isNumber(feature.value) ||
      feature.value < 0 ||
      !isNumber(feature.number) ||
      feature.number < 0
    ) {
      logger.crit("Invalid definition of bought feature", { feature });
      throw new Error("Invalid definition of bought feature");
    }
    if (featureDefinition.amoutper !== feature.value / feature.amount) {
      throw new Error("Requested amount inconsitent with feature definition");
    }
    price += feature.amount * featureDefinition.price;
  }
  return price;
}
