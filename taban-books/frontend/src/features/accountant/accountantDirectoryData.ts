export interface AccountantDirectoryEntry {
  id: number;
  name: string;
  company: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  logo: string;
  logoColors: {
    bg: string;
    text: string;
  };
  description: string;
  services: string[];
}

export const ACCOUNTANT_DIRECTORY_ENTRIES: AccountantDirectoryEntry[] = [
  {
    id: 1,
    name: "Pardip Rai",
    company: "IKA Three Sixty",
    country: "Kenya",
    phone: "+254734360360",
    email: "pardip@ika360.cc",
    website: "https://ika360.cc",
    logo: "IKA360",
    logoColors: { bg: "#10b981", text: "white" },
    description:
      "We provide services from setting up your business, analyzing and implementing processes, digital marketing, and creating work efficiency within the organization.",
    services: [
      "Bookkeeping",
      "Business Consultation",
      "Inventory Control",
      "Monthly Accounting Services",
      "VAT",
      "Taban Books Setup",
      "Taban Books Training",
    ],
  },
  {
    id: 2,
    name: "Collins Mugodo",
    company: "Finlanza Limited",
    country: "Kenya",
    phone: "+254724463536",
    email: "collins@finlanza.com",
    website: "https://finlanza.com",
    logo: "finlanza",
    logoColors: { bg: "#10b981", text: "white" },
    description:
      "Professional accounting and financial services for businesses of all sizes.",
    services: [
      "Bookkeeping",
      "Tax Preparation",
      "Financial Planning",
      "Business Consultation",
    ],
  },
  {
    id: 3,
    name: "Brain Mungai",
    company: "IRIS IMPORTS EXPORTS AN...",
    country: "Kenya",
    phone: "+254 718739904",
    email: "info@iris-iebs.com",
    website: "https://iris-iebs.com",
    logo: "Iris",
    logoColors: { bg: "#a855f7", text: "white" },
    description: "Comprehensive accounting and business services.",
    services: [
      "Bookkeeping",
      "Accounting Services",
      "Business Setup",
      "Tax Services",
    ],
  },
  {
    id: 4,
    name: "Francis Waweru",
    company: "FNJ & Associates (CPAs)",
    country: "Kenya",
    phone: "+254 100 580 422",
    email: "info@fnjassociates.co.ke",
    website: "https://fnjassociates.co.ke",
    logo: "FNJ",
    logoColors: { bg: "#0d9488", text: "white" },
    description:
      "Certified Public Accountants providing professional accounting and advisory services.",
    services: [
      "Auditing",
      "Tax Services",
      "Business Consultation",
      "Financial Advisory",
    ],
  },
];

export const ACCOUNTANT_DIRECTORY_COUNTRIES = [
  "Kenya",
  "Uganda",
  "Tanzania",
  "Rwanda",
  "Ethiopia",
] as const;

