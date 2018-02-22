export default (sequelize, { DATE, NOW, TEXT, INTEGER }) => {
  const ReviewHelpful = sequelize.define("reviewhelpful", {
    helpfuldate: {
      type: DATE,
      defaultValue: NOW
    },
    comment: TEXT,
    balance: INTEGER
  });

  ReviewHelpful.associate = ({ Review, Unit }) => {
    ReviewHelpful.belongsTo(Review, { foreignKey: "reviewid" });
    ReviewHelpful.belongsTo(Unit, { foreignKey: "unitid" });
  };

  ReviewHelpful.removeAttribute("id");

  return ReviewHelpful;
};
