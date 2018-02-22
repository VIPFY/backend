import jwt from "jsonwebtoken";
import { requiresAuth } from "../../helpers/permissions";

/* eslint-disable no-unused-vars */

export default {
  writeReview: requiresAuth.createResolver(
    async (parent, { appid, stars, text }, { models, token }) => {
      const { user: { id, unitid } } = jwt.decode(token);
      const p1 = models.App.findById(appid);
      const p2 = models.User.findOne({ where: { id } });
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
            unitid,
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
      const { user: { id, unitid } } = jwt.decode(token);

      const p1 = models.User.findById(id);
      const p2 = models.Review.findById(reviewid);
      const p3 = models.ReviewHelpful.findOne({
        where: {
          reviewid,
          unitid
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
            unitid
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
                unitid,
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
