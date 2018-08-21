export default (sequelize, { TEXT, TIME, JSONB }) => {
  const Promo = sequelize.define("promo_data", {
    name: TEXT,
    startdate: TIME,
    enddate: TIME,
    restrictions: JSONB,
    description: TEXT,
    discount: JSONB
  });

  Promo.associate = ({ Plan, Unit }) => {
    Promo.belongsTo(Plan, { foreignKey: "planid" });
    Promo.belongsTo(Unit, { foreignKey: "sponsor" });
  };

  return Promo;
};
