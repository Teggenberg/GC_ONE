export const initialProducts = [
  {
    id: "SKU-1024",
    itemNumber: "1142917340",
    name: "Used Yamaha P115B Digital Piano",
    category: "Keyboards",
    price: 189.0,
    stock: 1,
    status: "Active",
    fulfillment: "In-store · Flagship Store #014",
    thumbnail: "/product-placeholder.svg",
  },
  {
    id: "SKU-1041",
    itemNumber: "1041000001",
    name: "Canvas Weekender",
    category: "Accessories",
    price: 128.0,
    stock: 6,
    status: "Active",
    fulfillment: "In-store · Flagship Store #014",
    thumbnail: "/product-placeholder.svg",
  },
  {
    id: "SKU-1088",
    itemNumber: "1088000002",
    name: "Everyday Crew Tee",
    category: "Apparel",
    price: 24.0,
    stock: 42,
    status: "Active",
    fulfillment: "Alternate · Nashville Distribution Center",
    thumbnail: "/product-placeholder.svg",
  },
  {
    id: "SKU-1117",
    itemNumber: "1117000003",
    name: "Cedar + Smoke Candle",
    category: "Home",
    price: 32.0,
    stock: 3,
    status: "Low stock",
    fulfillment: "In-store · Flagship Store #014",
    thumbnail: "/product-placeholder.svg",
  },
  {
    id: "SKU-1132",
    itemNumber: "1132000004",
    name: "Leather Card Holder",
    category: "Accessories",
    price: 48.0,
    stock: 11,
    status: "Active",
    fulfillment: "Alternate · Dallas Store #219",
    thumbnail: "/product-placeholder.svg",
  },
  {
    id: "SKU-1154",
    itemNumber: "1154000005",
    name: "Stoneware Mug",
    category: "Home",
    price: 18.0,
    stock: 0,
    status: "Out of stock",
    fulfillment: "Alternate · Nashville Distribution Center",
    thumbnail: "/product-placeholder.svg",
  },
];

const generatedFirstNames = [
  "Liam",
  "Olivia",
  "Noah",
  "Emma",
  "Ethan",
  "Ava",
  "Mason",
  "Sophia",
  "Lucas",
  "Mia",
];
const generatedLastNames = [
  "Garcia",
  "Martinez",
  "Nguyen",
  "Johnson",
  "Brown",
  "Davis",
  "Wilson",
  "Anderson",
  "Thomas",
  "Moore",
];
const generatedCities = ["Temple", "Belton", "Killeen", "Waco", "Georgetown"];
const generatedCustomers = Array.from({ length: 100 }, (_, index) => {
  const firstName = generatedFirstNames[index % generatedFirstNames.length];
  const lastName =
    generatedLastNames[Math.floor(index / generatedFirstNames.length)];
  const city = generatedCities[index % generatedCities.length];
  const number = String(index + 1).padStart(3, "0");
  return {
    id: `CUS-7${String(index + 1).padStart(3, "0")}`,
    firstName,
    lastName,
    name: `${firstName} ${lastName}`,
    address: `${100 + index} Market Street`,
    city,
    state: "TX",
    zip: `765${String(index % 10).padStart(2, "0")}`,
    phone: `254-555-${number}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index + 1}@example.com`,
    tier: index % 5 === 0 ? "Gold" : "Member",
    visits: index % 16,
    spend: (index + 1) * 18.75,
  };
});

export const initialCustomers = [
  {
    id: "CUS-2081",
    name: "Maya Chen",
    email: "maya.chen@example.com",
    tier: "Gold",
    visits: 18,
    spend: 1248.5,
  },
  {
    id: "CUS-2082",
    name: "Jordan Williams",
    email: "jordan.w@example.com",
    tier: "Member",
    visits: 5,
    spend: 294.0,
  },
  {
    id: "CUS-2083",
    name: "Avery Patel",
    email: "avery.patel@example.com",
    tier: "Gold",
    visits: 24,
    spend: 1832.0,
  },
  {
    id: "CUS-2084",
    name: "Sofia Ramirez",
    email: "sofia.r@example.com",
    tier: "Member",
    visits: 8,
    spend: 421.75,
  },
  ...generatedCustomers,
];
