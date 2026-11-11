import { STORE_LOCATION } from './lib/store-location.js';

export function StoreLocation({ showMap = true }) {
  return (
    <div className="store-location">
      <address>
        <span>{STORE_LOCATION.address}</span>
        <span>{STORE_LOCATION.locality}</span>
        <span>CEP {STORE_LOCATION.zipCode}</span>
      </address>
      {showMap && <a href={STORE_LOCATION.mapsUrl} target="_blank" rel="noopener noreferrer">Como chegar para retirar ↗</a>}
    </div>
  );
}
