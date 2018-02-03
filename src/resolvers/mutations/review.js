import { requiresAuth } from "../../helpers/permissions";
import jwt from "jsonwebtoken";

export default {
  writeReview: requiresAuth.createResolver(
    async (parent, { appid, stars, text }, { models, token }) => {
      const { user: { id } } = jwt.decode(token);
      const p1 = models.App.findById(appid);
      const p2 = models.User.findById(id);
      const [app, user] = await Promise.all([p1, p2]);

      if (!app || !user) {
        throw new Error("App or User doesn't exist!");
      } else if (stars > 5 || stars < 1) {
        throw new Error("Rating must be between 1 and 5 stars!");
      } else {
        try {
          const review = await models.Review.create({
            stars,
            reviewtext: text,
            userid: id,
            appid
          });
          return {
            ok: true,
            id: review.id
          };
        } catch (err) {
          throw new Error(err.message);
        }
      }
    }
  ),

  rateReview: requiresAuth.createResolver(
    async (parent, { reviewid, balance }, { models, token }) => {
      const { user: { id } } = jwt.decode(token);

      const p1 = models.User.findById(id);
      const p2 = models.Review.findById(reviewid);
      const p3 = models.ReviewHelpful.findOne({
        where: {
          reviewid,
          userid: id
        }
      });
      const [commenter, review, changeRating] = await Promise.all([p1, p2, p3]);

      if (!review) {
        throw new Error("Review doesn't exist!");
      } else if (!commenter) {
        throw new Error("User doesn't exist!");
      } else if (!changeRating) {
        try {
          const rate = await models.ReviewHelpful.create({
            balance,
            reviewid,
            userid: id
          });

          return {
            ok: true,
            balance
          };
        } catch (err) {
          throw new Error(err.message);
        }
      } else {
        if (changeRating.balance == balance) {
          throw new Error(`This is the same value: ${balance}`);
        }
        try {
          const changing = await models.ReviewHelpful.update(
            { balance },
            {
              where: {
                userid: id,
                reviewid
              }
            }
          );
          return {
            ok: true,
            balance
          };
        } catch (err) {
          throw new Error(err.message);
        }
      }
    }
  )
};
