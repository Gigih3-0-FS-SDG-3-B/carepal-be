import { withPrisma } from "../middlewares/prismaMiddleware.js";
import { getOrder } from "./orderRepository.js";
import { REVIEW_PERIOD_DAYS_AFTER_CHECKOUT } from "../enums/reviewEnum.js";
import { flatten } from "flat";

export async function createReview(orderId, review, reviewRating) {
  const order = await getOrder(orderId);

  const today = new Date();
  const sevenDaysAfterEnd = new Date(order.date_end);
  sevenDaysAfterEnd.setDate(
    sevenDaysAfterEnd.getDate() + REVIEW_PERIOD_DAYS_AFTER_CHECKOUT
  );

  if (today > sevenDaysAfterEnd) {
    throw new Error("Review Period has passed");
  }
  return await withPrisma(async (prisma) => {
    return prisma.reviews.create({
      data: {
        order_id: orderId,
        review: review,
        review_rating: reviewRating,
      },
    });
  });
}

export async function getReviewsByOrderId(orderId) {
  const reviews = await withPrisma(async (prisma) => {
    return prisma.reviews.findUnique({
      where: {
        order_id: orderId,
      },
    });
  });

  return reviews;
}

export async function getCaregiverReviews(caregiverId) {
  const orders = await withPrisma((prisma) => {
    return prisma.orders.findMany({
      where: {
        caregiver_id: caregiverId,
      },
      include: {
        reviews: true,
        users: true,
      },
    });
  });
  const orderWithReviews = orders.filter((order) => order.reviews !== null);
  const reviews = orderWithReviews.map((order) => {
    return flatten(
      { ...order?.reviews, user: order?.users },
      { delimiter: "_" }
    );
  });
  const reviewRatings = reviews.map((review) => review?.review_rating);
  let averageRating = null;
  if (reviewRatings.length > 0) {
    const sum = reviewRatings.reduce((total, rating) => total + rating, 0);
    averageRating = sum / reviewRatings.length;
  }
  return { reviews, averageRating };
}
