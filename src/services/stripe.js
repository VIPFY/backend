import stripePackage from "stripe";
import { STRIPE_SECRET_KEY } from "../login-data";

const stripe = stripePackage(STRIPE_SECRET_KEY);
