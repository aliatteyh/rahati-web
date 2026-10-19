/** What the bookings screen needs about one booking, already normalised. */
export interface BookingRow {
  id: string;
  readableId: string;
  status: string;
  isPlan: boolean;
  serviceName: string;
  /** Both needed to ask the server which times are still free. */
  serviceId: string;
  variantKey: string;
  schedule: string | null;
  durationMinutes: number;
  cleaners: number;
  withMaterials: boolean;
  total: number;
  subtotal: number;
  fee: number;
  tax: number;
  tip: number;
  addOnTotal: number;
  discount: number;
  paymentMethod: string;
  isPaid: boolean;
  /** customer | company | serviceman, when it was called off. */
  cancelledBy: string | null;
  address: BookingAddress | null;
  cleaner: Cleaner | null;
}

export interface BookingAddress {
  label?: string | null;
  building?: string | null;
  apartment?: string | null;
  floor?: string | null;
  street?: string | null;
  city?: string | null;
  address?: string | null;
}

export interface Cleaner {
  name: string;
  image: string | null;
  rating: number;
  ratingCount: number;
  visits: number;
}

/** One visit of a plan, with what the server will allow done to it. */
export interface PlanVisit {
  id: string;
  readable_id: string;
  visit_number: number | null;
  service_schedule: string;
  booking_status: string;
  amount: number;
  duration_minutes: number | null;
  can_reschedule: boolean;
  reschedule_refused: string | null;
  reschedule_notice_hours: number;
  can_skip: boolean;
  skip_refused: string | null;
  skip_notice_hours: number;
  cancelled_by: string | null;
}

/** The subscription as the server answers it, in one call. */
export interface PlanSummary {
  id: string;
  readable_id: string | number;
  booking_status: string;
  cancelled_by: string | null;
  service_name: string | null;
  duration_minutes: number | null;
  cleaners_count: number;
  with_materials: boolean;
  add_ons: { name: string | null; quantity: number; price: number }[];
  weekdays: number[];
  days_per_week: number;
  time: string | null;
  months: number;
  first_at: string | null;
  last_at: string | null;
  visits_total: number;
  visits_done: number;
  visits_canceled: number;
  visits_left: number;
  per_visit: number | null;
  totals: {
    plan_total: number;
    /** The service before any discount: where the column of money starts. */
    service_amount: number;
    service_fee: number;
    tax: number;
    tip: number;
    materials: number;
    add_ons: number;
    discount: number;
  };
  payment_method: string;
  is_paid: number;
  address: BookingAddress | null;
  serviceman: {
    id: string;
    name: string;
    image_full_path: string | null;
    avg_rating: string;
    rating_count: number;
    visits_count: number;
  } | null;
  visits: PlanVisit[];
}
