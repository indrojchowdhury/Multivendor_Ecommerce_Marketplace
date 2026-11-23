export const DISTRICTS = [
  "Bagerhat",
  "Bandarban",
  "Barguna",
  "Bogura",
  "Barishal",
  "Bhola",
  "Bogura",
  "Brahmanbaria",
  "Chandpur",
  "Chapainawabganj",
  "Chattogram",
  "Chuadanga",
  "Cox's Bazar",
  "Cumilla",
  "Dhaka",
  "Dinajpur",
  "Faridpur",
  "Feni",
  "Gaibandha",
  "Gazipur",
  "Gopalganj",
  "Habiganj",
  "Jamalpur",
  "Jashore",
  "Jhalokathi",
  "Jhenaidah",
  "Joypurhat",
  "Khagrachhari",
  "Khulna",
  "Kishoreganj",
  "Kurigram",
  "Kushtia",
  "Lakshmipur",
  "Lalmonirhat",
  "Madaripur",
  "Magura",
  "Manikganj",
  "Meherpur",
  "Moulvibazar",
  "Munshiganj",
  "Mymensingh",
  "Naogaon",
  "Narail",
  "Narayanganj",
  "Narsingdi",
  "Natore",
  "Netrokona",
  "Nilphamari",
  "Noakhali",
  "Pabna",
  "Panchagarh",
  "Patuakhali",
  "Pirojpur",
  "Rajbari",
  "Rajshahi",
  "Rangamati",
  "Rangpur",
  "Satkhira",
  "Shariatpur",
  "Sherpur",
  "Sirajganj",
  "Sunamganj",
  "Sylhet",
  "Tangail",
  "Thakurgaon",
];

export const DELIVERY_FEES = {
  insideDhaka: 60,
  outsideDhaka: 120,
};

export function getShippingFee(district) {
  if (!district) return 0;
  return district === "Dhaka" ? DELIVERY_FEES.insideDhaka : DELIVERY_FEES.outsideDhaka;
}

export const PAYMENT_METHODS = [
  {
    id: "cod",
    label: "Cash on Delivery",
    description: "Pay with cash when your order arrives.",
    online: false,
  },
  {
    id: "sslcommerz",
    label: "Online payment (SSLCommerz)",
    description: "Pay securely using bKash, Nagad, cards, and other supported methods.",
    online: true,
  },
];

export function getPaymentMethodLabel(methodId) {
  return PAYMENT_METHODS.find((method) => method.id === methodId)?.label || methodId;
}