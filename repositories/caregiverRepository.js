import { withPrisma } from "../middlewares/prismaMiddleware.js";
import * as eventRepository from "./eventRepository.js";
import * as orderRepository from "./orderRepository.js";
import { explodeDates } from "../common/dateHelper.js";
import { eachDayOfInterval, format } from "date-fns";
import { searchAvailableCaregiversHelper } from "../common/dateHelper.js";

export async function getAvailableSchedule(caregiverId) {
  const orders = await orderRepository.getOrdersByCaregiverId(caregiverId);
  const events = await eventRepository.getEvents(caregiverId);
  const orderAccrualDates = explodeDates(orders, "date_start", "date_end").map(
    (order) => order.date
  );
  const eventsAccrualDates = explodeDates(events, "start_date", "end_date").map(
    (event) => event.date
  );
  const unavailableDates = orderAccrualDates.concat(eventsAccrualDates).sort();

  let startDate = new Date();
  let endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 1);
  let allDates = eachDayOfInterval({ start: startDate, end: endDate });
  allDates = allDates.map((date) => format(date, "yyyy-MM-dd"));
  const availableDates = allDates.filter(
    (date) => !unavailableDates.includes(date)
  );

  return { availableDates, unavailableDates };
}

export async function searchAvailableCaregivers(start_date, end_date) {
  const caregivers = await withPrisma(async (prisma) => {
    return prisma.caregivers.findMany({
      include: {
        events: {
          select: {
            start_date: true,
            end_date: true,
          },
          where: {
            deleted_at: null,
          },
        },
        orders: {
          select: {
            date_start: true,
            date_end: true,
          },
          where: {
            order_status: {
              not: {
                in: [100, 200],
              },
            },
          },
        },
        users: true,
      },
    });
  });
  let availableCaregivers = searchAvailableCaregiversHelper(
    caregivers,
    start_date,
    end_date
  );
  availableCaregivers = availableCaregivers.map((caregiver) => {
    let object = { ...caregiver, ...caregiver.users };
    delete object.users;
    return object;
  });
  return availableCaregivers;
}