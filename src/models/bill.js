export default (sequelize, { STRING, TIME, NOW }) => {
  const Bill = sequelize.define("bill_data", {
    billtime: { type: TIME, defaultValue: NOW() },
    paytime: TIME,
    stornotime: TIME,
    billname: STRING
  });

  Bill.associate = ({ Unit }) => {
    Bill.belongsTo(Unit, { foreignKey: "unitid" });
  };

  return Bill;
};
