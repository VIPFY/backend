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
  if (
    baseprice === undefined ||
    featuredescription === undefined ||
    boughtfeatures === undefined
  ) {
    throw new Error("invalid paramters");
  }

  const featuresDict = {};
  let price = baseprice - 0;
  if (featuredescription) {
    featuredescription.forEach(section => {
      section.features.forEach(feature => {
        if (!feature.key) return;
        if (feature.key in featuresDict) {
          throw new Error(
            `Key ${feature.key} duplicated in feature description`
          );
        }
        featuresDict[feature.key] = feature;
      });
    });
  }

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
      feature.value - featureDefinition.number < 0 ||
      !isNumber(feature.amount) ||
      feature.amount < 0
    ) {
      logger.error("Invalid definition of bought feature", { feature });
      throw new Error("Invalid definition of bought feature");
    }
    feature.value -= featureDefinition.number;
    if (feature.value == 0 && feature.amount == 0) continue;
    if (featureDefinition.amountper !== feature.value / feature.amount) {
      logger.error("Requested amount inconsitent with feature definition", {
        featureDefinition,
        feature
      });
      throw new Error("Requested amount inconsitent with feature definition");
    }
    price += feature.amount * featureDefinition.price;
  }
  return price;
}

export function checkPlanInputsSchema(schema, planinputs) {
  // TODO
  return true;
}
