export default (sequelize, { BOOLEAN, TIME }) => {
  const Bill = sequelize.define("bill_data", {
    type: BOOLEAN,
    billtime: TIME,
    paytime: TIME,
    stornotime: TIME
  });

  Bill.associate = ({ Unit }) => {
    Bill.belongsTo(Unit, { foreignKey: "unitid" });
  };

  return Bill;
};
