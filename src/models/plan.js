export default (
  sequelize,
  { STRING, INTEGER, DECIMAL, DATEONLY, SMALLINT }
) => {
  const Plan = sequelize.define("plan", {
    description: STRING,
    renewalplan: INTEGER,
    period: INTEGER,
    numlicences: INTEGER,
    price: DECIMAL(11, 2),
    currency: {
      type: STRING(3),
      validate: {
        len: [1, 3]
      }
    },
    name: STRING,
    activefrom: DATEONLY,
    activeuntil: DATEONLY,
    promo: SMALLINT,
    promovipfy: DECIMAL(11, 2),
    promodeveloper: DECIMAL(11, 2),
    promoname: STRING,
    changeafter: SMALLINT,
    changeplan: INTEGER
  });

  Plan.associate = models => {
    Plan.belongsTo(models.App, { foreignKey: "appid" });
  };

  return Plan;
};
