export default (sequelize, { TIME, NOW }) => {
  const Bill = sequelize.define("bill_data", {
    billtime: { type: TIME, defaultValue: NOW() },
    paytime: TIME,
    stornotime: TIME
  });

  Bill.associate = ({ Unit }) => {
    Bill.belongsTo(Unit, { foreignKey: "unitid" });
  };

  return Bill;
};
