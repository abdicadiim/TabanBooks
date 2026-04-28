import React from "react";

const AddressSection = ({ billTo, shipTo, hideTitle = false }) => {
  const defaultAddress = {
    name: "Rob & Joe Traders",
    address: "4141 Hacienda Drive",
    city: "Pleasanton",
    state: "94588 CA",
    country: "USA",
  };

  const billAddress = billTo || defaultAddress;
  const shipAddress = shipTo || defaultAddress;

  return (
    <div className="grid grid-cols-2 gap-6 mb-6">
      <div>
        {!hideTitle && <div className="text-sm font-semibold text-gray-700 mb-2">Bill To</div>}
        <div className="text-sm text-gray-600 space-y-0.5">
          {billAddress.name && !hideTitle && <div>{billAddress.name}</div>}
          <div>{billAddress.address}</div>
          <div>{billAddress.city}</div>
          <div>{billAddress.state}</div>
          <div>{billAddress.country}</div>
        </div>
      </div>
      {(shipTo || !hideTitle) && (
        <div>
          {!hideTitle && <div className="text-sm font-semibold text-gray-700 mb-2">Ship To</div>}
          <div className="text-sm text-gray-600 space-y-0.5">
            {shipAddress?.address && <div>{shipAddress.address}</div>}
            {shipAddress?.city && <div>{shipAddress.city}</div>}
            {shipAddress?.state && <div>{shipAddress.state}</div>}
            {shipAddress?.country && <div>{shipAddress.country}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressSection;

