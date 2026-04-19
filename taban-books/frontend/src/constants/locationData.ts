import { countries, countryData, countryPhoneCodes } from "../features/sales/Customers/NewCustomer/countriesData";

export const WORLD_COUNTRIES = countries;
export const COUNTRY_STATES = countryData;
export const COUNTRY_PHONE_CODES = countryPhoneCodes;

export const getStatesByCountry = (country?: string): string[] => {
  if (!country) return [];
  return COUNTRY_STATES[country] || [];
};
