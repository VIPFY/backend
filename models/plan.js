export default (sequelize, { STRING, INTEGER }) => {
  const Plan = sequelize.define("plan", {
    id: {
      type: INTEGER,
      unique: true,
      primaryKey: true,
      autoIncrement: true
    },
    description: STRING,
    renewalplan: STRING,
    period: INTEGER,
    numlicences: INTEGER,
    price: STRING,
    currency: STRING,
    name: STRING
  });

  Plan.associate = models => {
    Plan.belongsTo(models.App, { foreignKey: "appid" });
  };

  return Plan;
};
