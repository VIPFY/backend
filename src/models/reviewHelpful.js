export default (sequelize, { DATE, NOW, TEXT, INTEGER }) => {
  const ReviewHelpful = sequelize.define("reviewhelpful_data", {
    helpfuldate: {
      type: DATE,
      defaultValue: NOW
    },
    comment: TEXT,
    balance: INTEGER
  });

  ReviewHelpful.associate = ({ Review, User }) => {
    ReviewHelpful.belongsTo(Review, { foreignKey: "reviewid" });
    ReviewHelpful.belongsTo(User, { foreignKey: "reviewer" });
  };

  ReviewHelpful.removeAttribute("id");

  return ReviewHelpful;
};
