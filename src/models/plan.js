export default (sequelize, { INTEGER, DECIMAL, JSONB, TEXT, TIME, CHAR }) => {
  const Plan = sequelize.define("plan_data", {
    name: TEXT,
    teaserdescription: TEXT,
    features: JSONB,
    startdate: TIME,
    enddate: TIME,
    numlicences: INTEGER,
    amount: DECIMAL(10, 2),
    currency: {
      type: CHAR(3),
      validate: {
        len: [1, 3]
      },
      defaultValue: "USD"
    },
    options: JSONB
  });

  Plan.associate = ({ App }) => {
    Plan.belongsTo(App, { foreignKey: "appid" });
  };

  return Plan;
};
