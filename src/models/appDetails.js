export default (sequelize, { TEXT, JSONB, DOUBLE, ARRAY, BOOLEAN }) => {
  const AppDetails = sequelize.define("app_details", {
    name: {
      type: TEXT,
      unique: true
    },
    commission: JSONB,
    icon: TEXT,
    loginurl: TEXT,
    developername: TEXT,
    logo: TEXT,
    description: TEXT,
    teaserdescription: TEXT,
    website: TEXT,
    images: ARRAY(TEXT),
    features: JSONB,
    options: JSONB,
    disabled: {
      type: BOOLEAN,
      defaultValue: true
    },
    avgstars: DOUBLE,
    cheapestprice: DOUBLE,
    cheapestpromo: DOUBLE,
    supportwebsite: TEXT,
    supportphone: TEXT,
    developerwebsite: TEXT
  });

  AppDetails.associate = ({ Unit }) => {
    AppDetails.belongsTo(Unit, { foreignKey: "developer" });
    AppDetails.belongsTo(Unit, { foreignKey: "supportunit" });
  };

  return AppDetails;
};
