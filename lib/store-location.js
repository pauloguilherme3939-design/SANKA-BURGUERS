import { SANKA_BRAND } from './brand.js';

const locality = `${SANKA_BRAND.city} — ${SANKA_BRAND.state}`;
const fullAddress = `${SANKA_BRAND.address}, ${locality}, CEP ${SANKA_BRAND.zipCode}`;

export const STORE_LOCATION = {
  address: SANKA_BRAND.address,
  locality,
  zipCode: SANKA_BRAND.zipCode,
  fullAddress,
  mapsUrl: SANKA_BRAND.googleMapsUrl ||
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`,
};
